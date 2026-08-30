'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { todayISO } from '../../lib/dates'
import { getCurrentUserId, saveTodayFields, getLatestWeight } from '../../lib/dailyLog'
import { computeCalorieTargets } from '../../lib/calorieTargets'

const MEAL_LABELS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
]

export default function NutritionPage() {
  const [userId, setUserId] = useState(null)
  const [actual, setActual] = useState({})
  const [water, setWater] = useState('')
  const [weight, setWeight] = useState(null)
  const [medications, setMedications] = useState([])
  const [takenToday, setTakenToday] = useState({})
  const [newMed, setNewMed] = useState({ name: '', dose: '', time_of_day: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const [{ data }, latestWeight, { data: meds }, { data: logs }] = await Promise.all([
        supabase.from('daily_logs').select('nutrition_actual').eq('user_id', uid).eq('log_date', todayISO()).maybeSingle(),
        getLatestWeight(uid),
        supabase.from('medications').select('*').eq('user_id', uid).eq('active', true).order('created_at', { ascending: true }),
        supabase.from('medication_logs').select('medication_id, taken').eq('user_id', uid).eq('log_date', todayISO()),
      ])
      setActual(data?.nutrition_actual || {})
      setWater(data?.nutrition_actual?.water_oz ?? '')
      setWeight(latestWeight)
      setMedications(meds || [])
      const takenMap = {}
      ;(logs || []).forEach((l) => {
        takenMap[l.medication_id] = l.taken
      })
      setTakenToday(takenMap)
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

  async function addMedication() {
    if (!newMed.name.trim() || !userId) return
    const { data } = await supabase
      .from('medications')
      .insert({ user_id: userId, name: newMed.name.trim(), dose: newMed.dose.trim() || null, time_of_day: newMed.time_of_day.trim() || null })
      .select()
      .single()
    if (data) setMedications((prev) => [...prev, data])
    setNewMed({ name: '', dose: '', time_of_day: '' })
  }

  async function toggleTaken(medId) {
    const next = !takenToday[medId]
    setTakenToday((prev) => ({ ...prev, [medId]: next }))
    await supabase
      .from('medication_logs')
      .upsert({ user_id: userId, medication_id: medId, log_date: todayISO(), taken: next }, { onConflict: 'user_id,medication_id,log_date' })
  }

  async function removeMedication(medId) {
    setMedications((prev) => prev.filter((m) => m.id !== medId))
    await supabase.from('medications').update({ active: false }).eq('id', medId)
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading nutrition…</main>

  // Standard general-wellness guideline: roughly half your body weight in
  // fluid ounces per day. Falls back to a placeholder note until a weigh-in
  // has been logged on the Weekly Planner.
  const waterGoal = weight ? Math.round(weight * 0.5) : null
  const calorieTargets = computeCalorieTargets(weight)

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today</p>
      <h1 className="font-display text-2xl">Daily Nutrition</h1>

      {!calorieTargets && (
        <p className="mt-3 text-sm text-ink/40">Calorie targets need a weigh-in first — log one on the Weekly Planner.</p>
      )}

      {calorieTargets && (
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
              {MEAL_LABELS.map((m) => (
                <tr key={m.key} className="border-b border-sage-light/70 last:border-0">
                  <td className="py-2 text-sm">{m.label}</td>
                  <td className="py-2 px-2 text-right font-mono text-sm text-ink/60">
                    {calorieTargets.meals[m.key]} cal
                  </td>
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
          <p className="mt-3 text-xs text-ink/40">
            Daily target: {calorieTargets.dailyTarget} cal (~{calorieTargets.maintenance} cal estimated
            maintenance, {calorieTargets.deficit} cal/day deficit — capped at a safer pace than your stated
            10 lb/month goal implies; recalculates from your latest weigh-in).
          </p>
        </Card>
      )}

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
      </Card>

      <Card className="mt-4">
        <SectionLabel>Medications &amp; supplements</SectionLabel>
        <p className="mb-3 text-xs text-ink/40">
          A simple log — this list isn&rsquo;t reviewed or commented on by the AI features elsewhere in the app.
        </p>
        {medications.length === 0 ? (
          <p className="text-sm text-ink/40">Nothing added yet.</p>
        ) : (
          <ul className="divide-y divide-sage-light">
            {medications.map((med) => (
              <li key={med.id} className="py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{med.name}</p>
                    <p className="text-xs text-ink/40">
                      {[med.dose, med.time_of_day].filter(Boolean).join(' · ') || 'No dose/time set'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleTaken(med.id)}
                      className={`rounded-card px-3 py-1.5 text-xs font-semibold ${
                        takenToday[med.id] ? 'bg-sage text-paper' : 'bg-sage-light text-sage-dark'
                      }`}
                    >
                      {takenToday[med.id] ? 'Taken ✓' : 'Mark taken'}
                    </button>
                    <button onClick={() => removeMedication(med.id)} className="text-xs text-ink/30">
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 space-y-2">
          <input
            value={newMed.name}
            onChange={(e) => setNewMed((m) => ({ ...m, name: e.target.value }))}
            placeholder="Name (e.g. Vitamin D)"
            className="w-full rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newMed.dose}
              onChange={(e) => setNewMed((m) => ({ ...m, dose: e.target.value }))}
              placeholder="Dose (e.g. 2000 IU)"
              className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
            />
            <input
              value={newMed.time_of_day}
              onChange={(e) => setNewMed((m) => ({ ...m, time_of_day: e.target.value }))}
              placeholder="Time (e.g. Morning)"
              className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
            />
          </div>
          <button onClick={addMedication} className="w-full rounded-card bg-sage py-1.5 text-sm font-semibold text-paper">
            Add
          </button>
        </div>
      </Card>

      <p className="mt-4 text-xs text-ink/40">
        Manual entry for now — see README for notes on a future Google Health API
        connection for automatic activity data.
      </p>
    </main>
  )
}
