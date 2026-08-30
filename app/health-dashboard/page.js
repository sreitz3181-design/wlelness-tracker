'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel, StatPill } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { mondayOfWeekISO, todayISO } from '../../lib/dates'
import { getCurrentUserId, getLatestWeight, defaultWorkoutType } from '../../lib/dailyLog'
import { computeCalorieTargets } from '../../lib/calorieTargets'

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

  const [userId, setUserId] = useState(null)
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const since = isoDaysAgo(range === 'week' ? 7 : 30)
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', uid)
        .gte('log_date', since)
      setRows(data || [])
      setLoading(false)

      const { data: savedReview } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', uid)
        .eq('week_start', mondayOfWeekISO())
        .maybeSingle()
      if (savedReview) setReview(savedReview)
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

  async function generateWeeklyReview() {
    setReviewLoading(true)
    setReviewError('')
    try {
      const weekStart = mondayOfWeekISO()
      const [{ data: weekRows }, weight, { data: weighIns }, { data: openTasks }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('user_id', userId).gte('log_date', weekStart).lte('log_date', todayISO()),
        getLatestWeight(userId),
        supabase.from('weigh_ins').select('*').eq('user_id', userId).order('weigh_date', { ascending: true }).limit(20),
        supabase.from('tasks').select('id').eq('user_id', userId).eq('completed', false),
      ])

      const calorieTargets = computeCalorieTargets(weight)
      const difficultyCounts = { too_hard: 0, just_right: 0, too_easy: 0 }
      weekRows?.forEach((r) => {
        if (r.workout_difficulty) difficultyCounts[r.workout_difficulty]++
      })

      const scheduledDays = weekRows?.filter((r) => {
        const d = new Date(r.log_date)
        return defaultWorkoutType(d) !== 'rest'
      }).length || 0
      const completedWorkouts = weekRows?.filter((r) => r.workout_difficulty).length || 0

      const mealKeys = ['breakfast', 'lunch', 'dinner', 'snacks']
      const calorieAdherence = calorieTargets
        ? mealKeys.map((k) => ({
            meal: k,
            target: calorieTargets.meals[k],
            avgActual: average(weekRows || [], (r) => r.nutrition_actual?.[k]),
          }))
        : []

      const weekWeighIns = (weighIns || []).filter((w) => w.weigh_date >= weekStart)
      const weightTrend =
        weekWeighIns.length >= 2
          ? { start: weekWeighIns[0].weight_lbs, end: weekWeighIns[weekWeighIns.length - 1].weight_lbs }
          : null

      const stats = {
        daysLogged: weekRows?.length || 0,
        workoutsScheduled: scheduledDays,
        workoutsCompleted: completedWorkouts,
        difficultyCounts,
        avgStress: average(weekRows || [], (r) => r.stress_rating),
        avgSleepScore: average(weekRows || [], (r) => sleepScore(r.sleep_rating)),
        calorieAdherence,
        waterAdherence: { avgActual: average(weekRows || [], (r) => r.nutrition_actual?.water_oz), goal: weight ? Math.round(weight * 0.5) : null },
        stepsAdherence: { avgActual: average(weekRows || [], (r) => r.steps_actual), goal: 11000 },
        weightTrend,
        journalHighlights: {
          stressCauses: (weekRows || []).map((r) => r.stress_cause).filter(Boolean),
          stressHelped: (weekRows || []).map((r) => r.stress_helped).filter(Boolean),
          mentalHealthHelpers: (weekRows || []).map((r) => r.mental_health_helpers).filter(Boolean),
        },
        reflectionResponseDays: (weekRows || []).filter((r) => r.spiritual_reflection_response).length,
        openTasksCount: openTasks?.length || 0,
      }

      const res = await fetch('/api/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const saved = {
        user_id: userId,
        week_start: weekStart,
        physical_rating: data.physicalRating,
        mental_rating: data.mentalRating,
        spiritual_rating: data.spiritualRating,
        exercise_narrative: data.exerciseNarrative,
        nutrition_narrative: data.nutritionNarrative,
        mental_health_narrative: data.mentalHealthNarrative,
        encouragement: data.encouragement,
      }
      await supabase.from('weekly_reviews').upsert(saved, { onConflict: 'user_id,week_start' })
      setReview(saved)
    } catch (err) {
      setReviewError('Could not generate the weekly review right now — try again in a moment.')
    } finally {
      setReviewLoading(false)
    }
  }

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

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Weekly review</SectionLabel>
          <button
            onClick={generateWeeklyReview}
            disabled={reviewLoading}
            className="rounded-card bg-dusk px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
          >
            {reviewLoading ? 'Reviewing…' : review ? 'Regenerate' : 'Generate this week\u2019s review'}
          </button>
        </div>
        {reviewError && <p className="text-xs text-rose">{reviewError}</p>}
        {!review && !reviewLoading && !reviewError && (
          <p className="text-sm text-ink/40">Pulls this week&rsquo;s logs into ratings and encouragement across Physical, Mental, and Spiritual health.</p>
        )}
        {review && (
          <>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <StatPill label="Physical" value={review.physical_rating?.toFixed?.(1) ?? review.physical_rating} tone="sage" />
              <StatPill label="Mental" value={review.mental_rating?.toFixed?.(1) ?? review.mental_rating} tone="amber" />
              <StatPill label="Spiritual" value={review.spiritual_rating?.toFixed?.(1) ?? review.spiritual_rating} tone="dusk" />
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-sage-dark">Exercise</p>
                <p className="text-sm text-ink/80">{review.exercise_narrative}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber">Nutrition</p>
                <p className="text-sm text-ink/80">{review.nutrition_narrative}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-dusk">Mental health</p>
                <p className="text-sm text-ink/80">{review.mental_health_narrative}</p>
              </div>
              <p className="rounded-card bg-sage-light px-3 py-2 text-sm italic text-sage-dark">{review.encouragement}</p>
            </div>
          </>
        )}
      </Card>
    </main>
  )
}
