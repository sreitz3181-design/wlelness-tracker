'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, SectionLabel, RatingScale } from '../components/ui'
import { supabase } from '../lib/supabaseClient'
import { todayISO, mondayOfWeekISO } from '../lib/dates'
import { referenceForDate } from '../lib/scriptureReferences'

const PRIORITIES = ['Critical', 'Moderate', 'Low']
const PRIORITY_ORDER = { Critical: 0, Moderate: 1, Low: 2 }
const PRIORITY_TONE = { Critical: 'bg-rose-light text-rose', Moderate: 'bg-amber-light text-amber', Low: 'bg-sage-light text-sage-dark' }

function sortTasks(list) {
  return [...list].sort((a, b) => {
    const p = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
    if (p !== 0) return p
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })
}

export default function DailyTaskPage() {
  const [userId, setUserId] = useState(null)
  const [today, setToday] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState('Moderate')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ title: '', due_date: '', priority: 'Moderate' })
  const [stressNote, setStressNote] = useState('')
  const [journal, setJournal] = useState({ stress_cause: '', stress_helped: '', mental_health_helpers: '', additional_share: '' })
  const [journalSaved, setJournalSaved] = useState(false)
  const [journalFeedback, setJournalFeedback] = useState('')
  const [journalLoading, setJournalLoading] = useState(false)
  const [reflection, setReflection] = useState(null)
  const [reflectionResponse, setReflectionResponse] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData?.user?.id
      if (!uid) return
      setUserId(uid)

      const [{ data: t }, { data: taskRows }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', uid).eq('log_date', todayISO()).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', false).limit(20),
      ])

      setToday(t)
      setTasks(sortTasks(taskRows || []))
      setStressNote(t?.stress_note || '')
      setJournal({
        stress_cause: t?.stress_cause || '',
        stress_helped: t?.stress_helped || '',
        mental_health_helpers: t?.mental_health_helpers || '',
        additional_share: t?.additional_share || '',
      })
      setJournalFeedback(t?.mental_health_feedback || '')
      setReflectionResponse(t?.spiritual_reflection_response || '')

      if (t?.spiritual_reflection_question) {
        setReflection({ reflectionQuestion: t.spiritual_reflection_question, loveReminder: t.daily_love_reminder, reference: t.daily_love_reference })
      } else {
        generateReflection(uid)
      }

      setLoading(false)
    }
    load()
  }, [])

  // Upserts one field on today's log row, creating it on first write.
  async function saveField(field, value) {
    if (!userId) return
    setToday((prev) => ({ ...(prev || {}), [field]: value }))
    await supabase
      .from('daily_logs')
      .upsert({ user_id: userId, log_date: todayISO(), [field]: value }, { onConflict: 'user_id,log_date' })
  }

  async function saveStressNote() {
    await saveField('stress_note', stressNote)
  }

  function updateJournal(key, value) {
    setJournal((prev) => ({ ...prev, [key]: value }))
    setJournalSaved(false)
  }

  async function saveJournalEntry() {
    if (!userId) return
    setToday((prev) => ({ ...(prev || {}), ...journal }))
    await supabase
      .from('daily_logs')
      .upsert({ user_id: userId, log_date: todayISO(), ...journal }, { onConflict: 'user_id,log_date' })
    setJournalSaved(true)
    setTimeout(() => setJournalSaved(false), 2500)
  }

  async function saveReflectionResponse() {
    await saveField('spiritual_reflection_response', reflectionResponse)
    setReflectionSaved(true)
    setTimeout(() => setReflectionSaved(false), 2500)
  }

  async function addTask() {
    if (!newTask.trim() || !userId) return
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: userId, title: newTask.trim(), due_date: newTaskDue || null, priority: newTaskPriority })
      .select()
      .single()
    if (data) setTasks((prev) => sortTasks([...prev, data]))
    setNewTask('')
    setNewTaskDue('')
    setNewTaskPriority('Moderate')
  }

  async function completeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('tasks').update({ completed: true }).eq('id', id)
  }

  function startEdit(task) {
    setEditingId(task.id)
    setEditDraft({ title: task.title, due_date: task.due_date || '', priority: task.priority || 'Moderate' })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id) {
    const updates = { title: editDraft.title, due_date: editDraft.due_date || null, priority: editDraft.priority }
    setTasks((prev) => sortTasks(prev.map((t) => (t.id === id ? { ...t, ...updates } : t))))
    setEditingId(null)
    await supabase.from('tasks').update(updates).eq('id', id)
  }

  async function getJournalFeedback() {
    setJournalLoading(true)
    try {
      const since = new Date()
      since.setDate(since.getDate() - 6)
      const { data: recentHistory } = await supabase
        .from('daily_logs')
        .select('log_date, stress_rating, stress_cause, stress_helped')
        .eq('user_id', userId)
        .gte('log_date', since.toISOString().slice(0, 10))
        .order('log_date', { ascending: false })

      const res = await fetch('/api/journal-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stressRating: today?.stress_rating,
          stressCause: journal.stress_cause,
          stressHelped: journal.stress_helped,
          mentalHealthHelpers: journal.mental_health_helpers,
          additionalShare: journal.additional_share,
          recentHistory,
          tasks,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setJournalFeedback(data.feedback)
      await saveField('mental_health_feedback', data.feedback)
    } catch (err) {
      setJournalFeedback('Could not generate feedback right now — your entry is still saved.')
    } finally {
      setJournalLoading(false)
    }
  }

  async function generateReflection(uid) {
    setReflectionLoading(true)
    try {
      const { data: sermon } = await supabase
        .from('sermon_notes')
        .select('raw_notes')
        .eq('user_id', uid)
        .eq('week_start', mondayOfWeekISO())
        .maybeSingle()

      const { ref, theme } = referenceForDate()
      const res = await fetch('/api/daily-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sermonNotes: sermon?.raw_notes || '', reference: ref, theme }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setReflection({ reflectionQuestion: data.reflectionQuestion, loveReminder: data.loveReminder, reference: ref })
      await Promise.all([
        saveField('spiritual_reflection_question', data.reflectionQuestion),
        saveField('daily_love_reminder', data.loveReminder),
        saveField('daily_love_reference', ref),
      ])
    } catch (err) {
      setReflection(null)
    } finally {
      setReflectionLoading(false)
    }
  }

  if (loading) {
    return <main className="px-4 pt-8 text-sm text-ink/40">Loading today…</main>
  }

  const showStressFollowUp = today?.stress_rating >= 4

  return (
    <main className="px-4 pt-8">
      <div className="rhythm-arc mb-6 h-1 w-16 rounded-full" />
      <p className="text-xs uppercase tracking-wide text-ink/40">{dateLabel}</p>
      <h1 className="font-display text-2xl">Good morning</h1>

      <Card className="mt-5">
        <SectionLabel>Spiritual health</SectionLabel>
        {reflectionLoading && !reflection && <p className="text-sm text-ink/40">Preparing today&rsquo;s reflection…</p>}
        {reflection && (
          <>
            <p className="text-sm text-ink/80">{reflection.loveReminder}</p>
            <p className="mt-1 text-xs text-ink/50">{reflection.reference}</p>
            <p className="mt-3 rounded-card bg-dusk-light px-3 py-2 text-sm font-medium text-dusk-dark">
              {reflection.reflectionQuestion}
            </p>
            <textarea
              value={reflectionResponse}
              onChange={(e) => {
                setReflectionResponse(e.target.value)
                setReflectionSaved(false)
              }}
              rows={3}
              placeholder="Your thoughts…"
              className="mt-2 w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
            />
            <div className="mt-2 flex items-center gap-2">
              <button onClick={saveReflectionResponse} className="rounded-card bg-dusk px-3 py-1.5 text-xs font-semibold text-paper">
                Save reflection
              </button>
              {reflectionSaved && <span className="text-xs text-sage-dark">Saved ✓</span>}
            </div>
          </>
        )}
        {!reflection && !reflectionLoading && (
          <p className="text-sm text-ink/40">Couldn&rsquo;t load today&rsquo;s reflection — try refreshing.</p>
        )}
      </Card>

      <Card className="mt-4">
        <SectionLabel>This morning</SectionLabel>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-ink/80">How did you sleep?</span>
          <div className="flex gap-2">
            {['poor', 'average', 'great'].map((opt) => (
              <button
                key={opt}
                onClick={() => saveField('sleep_rating', opt)}
                className={`rounded-card px-3 py-1.5 text-xs capitalize ${
                  today?.sleep_rating === opt ? 'bg-dusk text-paper' : 'bg-sage-light text-ink/60'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <RatingScale
          label="Stress level"
          value={today?.stress_rating}
          onChange={(n) => saveField('stress_rating', n)}
        />
        {showStressFollowUp && (
          <div className="mt-2 rounded-card bg-rose-light p-3">
            <p className="text-xs font-semibold text-rose">What&rsquo;s weighing on you?</p>
            <textarea
              value={stressNote}
              onChange={(e) => setStressNote(e.target.value)}
              onBlur={saveStressNote}
              rows={2}
              className="mt-2 w-full rounded-card border border-rose/30 bg-white/70 p-2 text-sm"
              placeholder="Type what's on your mind…"
            />
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <SectionLabel>Mental health journal</SectionLabel>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink/50">What caused stress today?</label>
            <textarea
              value={journal.stress_cause}
              onChange={(e) => updateJournal('stress_cause', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/50">What helped with your stress today?</label>
            <textarea
              value={journal.stress_helped}
              onChange={(e) => updateJournal('stress_helped', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/50">What things helped your mental health today?</label>
            <textarea
              value={journal.mental_health_helpers}
              onChange={(e) => updateJournal('mental_health_helpers', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/50">Anything else you want to share?</label>
            <textarea
              value={journal.additional_share}
              onChange={(e) => updateJournal('additional_share', e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={saveJournalEntry} className="rounded-card bg-sage px-4 py-2 text-sm font-semibold text-paper">
            Save journal entry
          </button>
          {journalSaved && <span className="text-xs text-sage-dark">Saved ✓</span>}
        </div>
        <button
          onClick={getJournalFeedback}
          disabled={journalLoading}
          className="mt-2 w-full rounded-card bg-dusk py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {journalLoading ? 'Thinking…' : 'Get feedback'}
        </button>
        {journalFeedback && (
          <p className="mt-3 rounded-card bg-sage-light px-3 py-2 text-sm text-sage-dark">{journalFeedback}</p>
        )}
      </Card>

      <Card className="mt-4">
        <SectionLabel>Tasks</SectionLabel>
        {tasks.length === 0 ? (
          <p className="text-sm text-ink/40">Nothing on the list yet.</p>
        ) : (
          <ul className="divide-y divide-sage-light">
            {tasks.map((t) =>
              editingId === t.id ? (
                <li key={t.id} className="py-3">
                  <input
                    value={editDraft.title}
                    onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                    className="w-full rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <input
                      type="date"
                      value={editDraft.due_date}
                      onChange={(e) => setEditDraft((d) => ({ ...d, due_date: e.target.value }))}
                      className="flex-1 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
                    />
                    <select
                      value={editDraft.priority}
                      onChange={(e) => setEditDraft((d) => ({ ...d, priority: e.target.value }))}
                      className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => saveEdit(t.id)} className="rounded-card bg-sage px-3 py-1.5 text-xs font-semibold text-paper">
                      Save
                    </button>
                    <button onClick={cancelEdit} className="rounded-card bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark">
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{t.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_TONE[t.priority] || PRIORITY_TONE.Moderate}`}>
                        {t.priority || 'Moderate'}
                      </span>
                    </div>
                    <span className="text-xs text-ink/40">{t.due_date || 'No date'}</span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => completeTask(t.id)} className="rounded-card bg-sage px-2.5 py-1 text-xs font-semibold text-paper">
                      Complete
                    </button>
                    <button onClick={() => startEdit(t)} className="rounded-card bg-sage-light px-2.5 py-1 text-xs font-semibold text-sage-dark">
                      Edit
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
        <div className="mt-3 space-y-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a task…"
            className="w-full rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="flex-1 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button onClick={addTask} className="rounded-card bg-sage px-4 py-1.5 text-sm font-semibold text-paper">
              Add
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link href="/workout" className="rounded-card bg-sage py-3 text-center text-xs font-semibold text-paper">
          Today&rsquo;s Workout
        </Link>
        <Link href="/health-dashboard" className="rounded-card bg-dusk py-3 text-center text-xs font-semibold text-paper">
          Health Stats
        </Link>
        <Link href="/nutrition" className="rounded-card bg-amber py-3 text-center text-xs font-semibold text-paper">
          Log Nutrition
        </Link>
      </div>
    </main>
  )
}
