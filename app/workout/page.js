'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel, PlannedActualRow } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { todayISO } from '../../lib/dates'
import { getCurrentUserId, saveTodayFields, defaultWorkoutType } from '../../lib/dailyLog'

const DEFAULT_GOALS = { steps: 11000, activeMinutes: 90, caloriesBurned: 1000 }

export default function WorkoutPage() {
  const [userId, setUserId] = useState(null)
  const [log, setLog] = useState(null)
  const [exercises, setExercises] = useState([{ name: '', planned: '', actual: '' }])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', uid)
        .eq('log_date', todayISO())
        .maybeSingle()

      const type = data?.workout_type || defaultWorkoutType()
      setLog({ ...(data || {}), workout_type: type })
      if (data?.workout_planned?.length) {
        setExercises(
          data.workout_planned.map((p, i) => ({
            name: p.name,
            planned: p.planned,
            actual: data.workout_actual?.[i]?.actual || '',
          }))
        )
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

  async function saveGoalField(field, value) {
    setLog((prev) => ({ ...prev, [field]: value }))
    await saveTodayFields(userId, { [field]: value === '' ? null : Number(value) })
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading today&rsquo;s workout…</main>

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today&rsquo;s Scheduled Workout</p>
      <h1 className="font-display text-2xl">
        Category:{' '}
        <span className="text-sage-dark capitalize">{log?.workout_type}</span>
      </h1>
      <div className="mt-2 flex gap-2">
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
      </div>

      {log?.workout_type !== 'rest' && (
        <Card className="mt-5">
          <SectionLabel>Exercises (from your own routine)</SectionLabel>
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
