'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { todayISO } from '../../lib/dates'
import { getCurrentUserId, saveTodayFields, getLatestWeight } from '../../lib/dailyLog'

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', goal: 500 },
  { key: 'lunch', label: 'Lunch', goal: 700 },
  { key: 'dinner', label: 'Dinner', goal: 800 },
  { key: 'snacks', label: 'Snacks', goal: 300 },
]

export default function NutritionPage() {
  const [userId, setUserId] = useState(null)
  const [actual, setActual] = useState({})
  const [water, setWater] = useState('')
  const [weight, setWeight] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const [{ data }, latestWeight] = await Promise.all([
        supabase.from('daily_logs').select('nutrition_actual').eq('user_id', uid).eq('log_date', todayISO()).maybeSingle(),
        getLatestWeight(uid),
      ])
      setActual(data?.nutrition_actual || {})
      setWater(data?.nutrition_actual?.water_oz ?? '')
      setWeight(latestWeight)
      setLoading(false)
    }
    load()
  }, [])

  async function saveMeal(key, value) {
    const next = { ...actual, [key]: value === '' ? null : Number(value) }
    setActual(next)
    await saveTodayFields(userId, { nutrition_actual: next })
  }

  async function saveWater(value) {
    setWater(value)
    const next = { ...actual, water_oz: value === '' ? null : Number(value) }
    setActual(next)
    await saveTodayFields(userId, { nutrition_actual: next })
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading nutrition…</main>

  // Standard general-wellness guideline: roughly half your body weight in
  // fluid ounces per day. Falls back to a placeholder note until a weigh-in
  // has been logged on the Weekly Planner.
  const waterGoal = weight ? Math.round(weight * 0.5) : null

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today</p>
      <h1 className="font-display text-2xl">Daily Nutrition</h1>

      <Card className="mt-5">
        <SectionLabel>Calories by meal</SectionLabel>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] text-ink/40">
              <th className="pb-2 font-normal">Meal</th>
              <th className="pb-2 text-right font-normal">Goal</th>
              <th className="pb-2 text-right font-normal">Actual</th>
            </tr>
          </thead>
          <tbody>
            {MEALS.map((m) => (
              <tr key={m.key} className="border-b border-sage-light/70 last:border-0">
                <td className="py-2 text-sm">{m.label}</td>
                <td className="py-2 px-2 text-right font-mono text-sm text-ink/60">{m.goal} cal</td>
                <td className="py-2 pl-2 text-right">
                  <input
                    type="number"
                    value={actual[m.key] ?? ''}
                    onChange={(e) => saveMeal(m.key, e.target.value)}
                    className="w-20 rounded-card border border-sage-light bg-white/70 px-2 py-1 text-right font-mono text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <SectionLabel>Water intake</SectionLabel>
        <div className="flex items-center justify-between">
          <span className="text-sm">Water</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-ink/60">
              Goal: {waterGoal ? `${waterGoal} oz` : 'log a weigh-in'}
            </span>
            <input
              type="number"
              value={water}
              onChange={(e) => saveWater(e.target.value)}
              className="w-20 rounded-card border border-sage-light bg-white/70 px-2 py-1 text-right font-mono text-sm"
            />
          </div>
        </div>
        {!weight && (
          <p className="mt-2 text-xs text-ink/40">
            Water goal needs a weigh-in first — log one on the Weekly Planner.
          </p>
        )}
      </Card>

      <p className="mt-4 text-xs text-ink/40">
        Manual entry for now — see README for notes on a future Google Health API
        connection for automatic activity data.
      </p>
    </main>
  )
}
