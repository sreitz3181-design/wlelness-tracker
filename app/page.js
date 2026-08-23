'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, SectionLabel, RatingScale } from '../components/ui'
import { supabase } from '../lib/supabaseClient'
import { todayISO, yesterdayISO } from '../lib/dates'
import { todayScripture } from '../lib/mockData' // scripture/theme still placeholder until the AI coaching call is wired up

export default function DailyTaskPage() {
  const [userId, setUserId] = useState(null)
  const [yesterday, setYesterday] = useState(null)
  const [today, setToday] = useState(null)
  const [tasks, setTasks] = useState([])
  const [stressNote, setStressNote] = useState('')
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

      const [{ data: y }, { data: t }, { data: taskRows }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', uid).eq('log_date', yesterdayISO()).maybeSingle(),
        supabase.from('daily_logs').select('*').eq('user_id', uid).eq('log_date', todayISO()).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', uid).eq('completed', false).order('due_date', { ascending: true }).limit(5),
      ])

      setYesterday(y)
      setToday(t)
      setTasks(taskRows || [])
      setStressNote(t?.stress_note || '')
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
        <p className="font-display text-lg italic leading-snug text-dusk">
          &ldquo;{todayScripture.verse}&rdquo;
        </p>
        <p className="mt-1 text-xs text-ink/50">{todayScripture.reference}</p>
        <p className="mt-3 text-sm text-ink/80">{todayScripture.encouragement}</p>
      </Card>

      <Card className="mt-4">
        <SectionLabel>How did yesterday go?</SectionLabel>
        {yesterday ? (
          <>
            <RatingScale label="Physical health" value={yesterday.physical_rating} />
            <RatingScale label="Mental health" value={yesterday.mental_rating} />
            <RatingScale label="Spiritual health" value={yesterday.spiritual_rating} />
          </>
        ) : (
          <p className="text-sm text-ink/40">No log from yesterday yet.</p>
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
        <SectionLabel>Tasks</SectionLabel>
        {tasks.length === 0 ? (
          <p className="text-sm text-ink/40">Nothing on the list yet.</p>
        ) : (
          <ul className="divide-y divide-sage-light">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span>{t.title}</span>
                <span className="text-xs text-ink/40">{t.due_date || 'No date'}</span>
              </li>
            ))}
          </ul>
        )}
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
