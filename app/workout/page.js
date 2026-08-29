'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { todayISO } from '../../lib/dates'
import {
  getCurrentUserId,
  saveTodayFields,
  defaultWorkoutType,
  getUserSettings,
  saveUserSettings,
  isRestricted,
  stepLevel,
} from '../../lib/dailyLog'

const DEFAULT_GOALS = { steps: 11000, activeMinutes: 90, caloriesBurned: 1000 }
const RATINGS = [
  { key: 'too_hard', label: 'Too hard' },
  { key: 'just_right', label: 'Just right' },
  { key: 'too_easy', label: 'Too easy' },
]
// Deterministic — no AI call needed for cardio, just a duration/effort
// recommendation tied to the current level.
const CARDIO_RECOMMENDATION = {
  light: { duration: 20, effort: 'Light' },
  moderate: { duration: 30, effort: 'Moderate' },
  high: { duration: 40, effort: 'High' },
}

export default function WorkoutPage() {
  const [userId, setUserId] = useState(null)
  const [log, setLog] = useState(null)
  const [settings, setSettings] = useState(null)
  const [exercises, setExercises] = useState([{ name: '', planned: '', actual: '' }])
  const [encouragement, setEncouragement] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [cardioActual, setCardioActual] = useState({ duration: '', effort: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return

      const [{ data }, userSettings] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', uid).eq('log_date', todayISO()).maybeSingle(),
        getUserSettings(uid),
      ])

      const type = data?.workout_type || defaultWorkoutType()
      setLog({ ...(data || {}), workout_type: type })
      setSettings(userSettings)
      if (type === 'strength' && data?.workout_planned?.length) {
        setExercises(
          data.workout_planned.map((p, i) => ({
            name: p.name,
            planned: p.planned,
            actual: data.workout_actual?.[i]?.actual || '',
          }))
        )
      }
      if (type === 'cardio' && data?.workout_actual && !Array.isArray(data.workout_actual)) {
        setCardioActual({
          duration: data.workout_actual.duration ?? '',
          effort: data.workout_actual.effort ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function setType(type) {
    setLog((prev) => ({ ...prev, workout_type: type }))
    await saveTodayFields(userId, { workout_type: type })
  }

  function updateExercise(i, key, value) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, [key]: value } : ex)))
  }

  function addExerciseRow() {
    setExercises((prev) => [...prev, { name: '', planned: '', actual: '' }])
  }

  async function saveExercises() {
    const planned = exercises.map((e) => ({ name: e.name, planned: e.planned }))
    const actual = exercises.map((e) => ({ name: e.name, actual: e.actual }))
    await saveTodayFields(userId, { workout_planned: planned, workout_actual: actual })
  }

  async function generateWorkout() {
    setGenerating(true)
    setGenError('')
    try {
      const level = isRestricted(settings) ? 'light' : settings.strength_intensity
      const res = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intensityLevel: level }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const next = data.exercises.map((e) => ({
        name: e.name,
        planned: `${e.sets} x ${e.reps} @ ${e.weight}`,
        actual: '',
      }))
      setExercises(next)
      setEncouragement(data.encouragement || '')
      await saveTodayFields(userId, {
        workout_planned: next.map((e) => ({ name: e.name, planned: e.planned })),
        workout_actual: next.map((e) => ({ name: e.name, actual: '' })),
      })
    } catch (err) {
      setGenError('Could not generate a workout — you can still fill in exercises manually below.')
    } finally {
      setGenerating(false)
    }
  }

  async function saveCardioActual(field, value) {
    const next = { ...cardioActual, [field]: value }
    setCardioActual(next)
    await saveTodayFields(userId, { workout_actual: next })
  }

  async function saveGoalField(field, value) {
    setLog((prev) => ({ ...prev, [field]: value }))
    await saveTodayFields(userId, { [field]: value === '' ? null : Number(value) })
  }

  async function rateDifficulty(rating) {
    setLog((prev) => ({ ...prev, workout_difficulty: rating }))
    await saveTodayFields(userId, { workout_difficulty: rating })

    // While restricted, the rating is still recorded for the record, but
    // it never moves the intensity level — that stays locked to 'light'.
    if (restricted || log?.workout_type === 'rest') return

    const field = log?.workout_type === 'strength' ? 'strength_intensity' : 'cardio_effort'
    const nextLevel = stepLevel(settings[field], rating)
    setSettings((prev) => ({ ...prev, [field]: nextLevel }))
    await saveUserSettings(userId, { [field]: nextLevel })
  }

  if (loading || !settings) return <main className="px-4 pt-8 text-sm text-ink/40">Loading today&rsquo;s workout…</main>

  const restricted = isRestricted(settings)
  const currentLevel = restricted
    ? 'light'
    : log?.workout_type === 'strength'
    ? settings.strength_intensity
    : settings.cardio_effort

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today&rsquo;s Scheduled Workout</p>
      <h1 className="font-display text-2xl">
        Category:{' '}
        <span className="text-sage-dark capitalize">{log?.workout_type}</span>
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {['strength', 'cardio', 'rest'].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-card px-3 py-1.5 text-xs font-semibold capitalize ${
              log?.workout_type === t ? 'bg-dusk text-paper' : 'bg-sage-light text-ink/60'
            }`}
          >
            {t}
          </button>
        ))}
        {log?.workout_type !== 'rest' && (
          <span className="rounded-card bg-amber-light px-3 py-1.5 text-xs font-semibold capitalize text-amber">
            {currentLevel} intensity
          </span>
        )}
      </div>
      {restricted && (
        <p className="mt-2 text-xs text-rose">
          Light intensity through {settings.restricted_until} — intensity won&rsquo;t increase until then, even if you rate a workout too easy.
        </p>
      )}

      {log?.workout_type === 'strength' && (
        <Card className="mt-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Exercises</SectionLabel>
            <button
              onClick={generateWorkout}
              disabled={generating}
              className="rounded-card bg-dusk px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
            >
              {generating ? 'Generating…' : 'Generate my workout'}
            </button>
          </div>
          {encouragement && (
            <p className="mb-3 rounded-card bg-sage-light px-3 py-2 text-sm italic text-sage-dark">
              {encouragement}
            </p>
          )}
          {genError && <p className="mb-2 text-xs text-rose">{genError}</p>}
          {exercises.map((ex, i) => (
            <div key={i} className="mb-2 grid grid-cols-3 gap-2">
              <input
                placeholder="Exercise"
                value={ex.name}
                onChange={(e) => updateExercise(i, 'name', e.target.value)}
                className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
              />
              <input
                placeholder="Planned (e.g. 3x10 @ 135)"
                value={ex.planned}
                onChange={(e) => updateExercise(i, 'planned', e.target.value)}
                className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
              />
              <input
                placeholder="Actual"
                value={ex.actual}
                onChange={(e) => updateExercise(i, 'actual', e.target.value)}
                className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
              />
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <button onClick={addExerciseRow} className="rounded-card bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark">
              + Add exercise
            </button>
            <button onClick={saveExercises} className="rounded-card bg-sage px-3 py-1.5 text-xs font-semibold text-paper">
              Save
            </button>
          </div>
        </Card>
      )}

      {log?.workout_type === 'cardio' && (
        <Card className="mt-5">
          <SectionLabel>Today&rsquo;s cardio</SectionLabel>
          <p className="text-sm text-ink/70">
            Recommended: <span className="font-semibold text-dusk">{CARDIO_RECOMMENDATION[currentLevel].duration} min</span>{' '}
            at <span className="font-semibold text-dusk">{CARDIO_RECOMMENDATION[currentLevel].effort}</span> effort
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink/50">Actual duration (min)</label>
              <input
                type="number"
                value={cardioActual.duration}
                onChange={(e) => saveCardioActual('duration', e.target.value)}
                className="mt-1 w-full rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-ink/50">Actual effort</label>
              <select
                value={cardioActual.effort}
                onChange={(e) => saveCardioActual('effort', e.target.value)}
                className="mt-1 w-full rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                <option value="Light">Light</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {log?.workout_type !== 'rest' && (
        <Card className="mt-4">
          <SectionLabel>How was this workout?</SectionLabel>
          <div className="flex gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.key}
                onClick={() => rateDifficulty(r.key)}
                className={`flex-1 rounded-card px-3 py-2 text-xs font-semibold ${
                  log?.workout_difficulty === r.key ? 'bg-dusk text-paper' : 'bg-sage-light text-ink/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/40">
            {restricted
              ? 'Recorded — intensity stays light while restricted.'
              : 'Feeds directly into your next scheduled workout of this type.'}
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <SectionLabel>Daily health goals</SectionLabel>
        <table className="w-full">
          <tbody>
            {[
              { key: 'steps', label: 'Step count', goal: DEFAULT_GOALS.steps },
              { key: 'active_minutes', label: 'Active minutes', goal: DEFAULT_GOALS.activeMinutes },
              { key: 'calories_burned', label: 'Calories burned', goal: DEFAULT_GOALS.caloriesBurned },
            ].map((row) => (
              <tr key={row.key} className="border-b border-sage-light/70 last:border-0">
                <td className="py-2 text-sm">{row.label}</td>
                <td className="py-2 px-2 text-right font-mono text-sm text-ink/60">{row.goal.toLocaleString()}</td>
                <td className="py-2 pl-2 text-right">
                  <input
                    type="number"
                    value={log?.[`${row.key}_actual`] ?? ''}
                    onChange={(e) => saveGoalField(`${row.key}_actual`, e.target.value)}
                    className="w-20 rounded-card border border-sage-light bg-white/70 px-2 py-1 text-right font-mono text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  )
}
