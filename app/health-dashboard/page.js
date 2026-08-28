'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel, StatPill } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentUserId } from '../../lib/dailyLog'

function isoDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function sleepScore(rating) {
  return { poor: 1, average: 2, great: 3 }[rating] ?? null
}

function average(rows, valueFn) {
  const vals = rows.map(valueFn).filter((v) => v !== null && v !== undefined)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export default function HealthDashboardPage() {
  const [range, setRange] = useState('week')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      if (!uid) return
      const since = isoDaysAgo(range === 'week' ? 7 : 30)
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', uid)
        .gte('log_date', since)
      setRows(data || [])
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [range])

  const workoutsLogged = rows.filter((r) => r.workout_type && r.workout_type !== 'rest').length
  const totalDays = range === 'week' ? 7 : 30

  const stats = [
    { label: 'Stress', value: average(rows, (r) => r.stress_rating), tone: 'rose', max: 5 },
    { label: 'Sleep', value: average(rows, (r) => sleepScore(r.sleep_rating)), tone: 'sage', max: 3 },
  ]

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Progress</p>
      <h1 className="font-display text-2xl">Health Dashboard</h1>

      <div className="mt-4 flex gap-2">
        {['week', 'month'].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-card px-4 py-1.5 text-xs font-semibold capitalize ${
              range === r ? 'bg-dusk text-paper' : 'bg-sage-light text-ink/60'
            }`}
          >
            This {r}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-ink/40">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink/40">No logs yet for this {range} — averages will show up once you've checked in a few times.</p>
      ) : (
        <>
          <Card className="mt-4">
            <SectionLabel>Workouts logged</SectionLabel>
            <p className="font-mono text-3xl font-semibold text-sage-dark">
              {workoutsLogged}/{totalDays}
            </p>
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <StatPill key={s.label} label={s.label} value={s.value !== null ? s.value.toFixed(1) : '—'} tone={s.tone} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
