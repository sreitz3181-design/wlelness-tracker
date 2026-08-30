'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { todayISO, mondayOfWeekISO, mondayBasedDayIndex } from '../../lib/dates'
import { getCurrentUserId, saveTodayFields, getLatestWeight } from '../../lib/dailyLog'
import { computeCalorieTargets } from '../../lib/calorieTargets'
import { MEDICATION_TIMES } from '../../lib/mealLibrary'

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', category: 'Breakfast' },
  { key: 'lunch', label: 'Lunch', category: 'Lunch' },
  { key: 'dinner', label: 'Dinner', category: 'Dinner' },
  { key: 'snacks', label: 'Snacks', category: 'Snacks' },
]

export default function NutritionPage() {
  const [userId, setUserId] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [selections, setSelections] = useState({})
  const [nutritionActual, setNutritionActual] = useState({})
  const [defaultedFrom, setDefaultedFrom] = useState({})
  const [water, setWater] = useState('')
  const [weight, setWeight] = useState(null)
  const [medications, setMedications] = useState([])
  const [takenToday, setTakenToday] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const [{ data }, latestWeight, { data: recipeRows }, { data: meds }, { data: logs }, { data: plan }] = await Promise.all([
        supabase.from('daily_logs').select('nutrition_actual, nutrition_selections').eq('user_id', uid).eq('log_date', todayISO()).maybeSingle(),
        getLatestWeight(uid),
        supabase.from('recipes').select('*').eq('user_id', uid),
        supabase.from('medications').select('*').eq('user_id', uid).eq('active', true).order('created_at', { ascending: true }),
        supabase.from('medication_logs').select('medication_id, taken').eq('user_id', uid).eq('log_date', todayISO()),
        supabase.from('weekly_plans').select('*').eq('user_id', uid).eq('week_start', mondayOfWeekISO()).maybeSingle(),
      ])
      const existingSelections = data?.nutrition_selections || {}
      const existingActual = data?.nutrition_actual || {}
      const allRecipes = recipeRows || []

      // Default any not-yet-chosen meal to whatever the Weekly Planner has
      // slotted for today's day of the week — never overrides a selection
      // already made today.
      const todayIdx = mondayBasedDayIndex()
      const slotsByKey = {
        breakfast: plan?.breakfast_slots || [],
        lunch: plan?.lunch_slots || [],
        dinner: plan?.dinner_slots || [],
        snacks: plan?.snack_slots || [],
      }
      const nextSelections = { ...existingSelections }
      const nextActual = { ...existingActual }
      const defaulted = {}
      let appliedDefault = false

      MEALS.forEach((m) => {
        if (nextSelections[m.key]) return
        const todaysSlot = slotsByKey[m.key].find((s) => s.day === todayIdx)
        if (!todaysSlot) return
        const recipeId =
          m.key === 'lunch' && todaysSlot.type === 'leftover'
            ? slotsByKey.dinner[todaysSlot.dinnerIndex]?.recipeId
            : todaysSlot.recipeId
        if (!recipeId) return
        nextSelections[m.key] = recipeId
        const recipe = allRecipes.find((r) => r.id === recipeId)
        nextActual[m.key] = recipe?.calories ?? null
        defaulted[m.key] = true
        appliedDefault = true
      })

      setWater(nextActual.water_oz ?? '')
      setNutritionActual(nextActual)
      setSelections(nextSelections)
      setDefaultedFrom(defaulted)
      setWeight(latestWeight)
      setRecipes(allRecipes)
      if (appliedDefault) {
        await saveTodayFields(uid, { nutrition_selections: nextSelections, nutrition_actual: nextActual })
      }

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

  async function selectMeal(key, recipeId) {
    const nextSelections = { ...selections, [key]: recipeId }
    setSelections(nextSelections)
    setDefaultedFrom((prev) => ({ ...prev, [key]: false }))
    const recipe = recipes.find((r) => r.id === recipeId)
    const nextActual = { ...nutritionActual, [key]: recipe?.calories ?? null }
    setNutritionActual(nextActual)
    await saveTodayFields(userId, { nutrition_selections: nextSelections, nutrition_actual: nextActual })
  }

  async function saveWater(value) {
    setWater(value)
    const nextActual = { ...nutritionActual, water_oz: value === '' ? null : Number(value) }
    setNutritionActual(nextActual)
    await saveTodayFields(userId, { nutrition_actual: nextActual })
  }

  async function toggleTaken(medId) {
    const next = !takenToday[medId]
    setTakenToday((prev) => ({ ...prev, [medId]: next }))
    await supabase
      .from('medication_logs')
      .upsert({ user_id: userId, medication_id: medId, log_date: todayISO(), taken: next }, { onConflict: 'user_id,medication_id,log_date' })
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading nutrition…</main>

  const waterGoal = weight ? Math.round(weight * 0.5) : null
  const calorieTargets = computeCalorieTargets(weight)

  const medGroups = MEDICATION_TIMES.map((time) => ({
    time,
    meds: medications.filter((m) => (m.time_of_day || 'Anytime') === time || (time === 'Anytime' && !MEDICATION_TIMES.includes(m.time_of_day))),
  })).filter((g) => g.meds.length > 0)

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today</p>
      <h1 className="font-display text-2xl">Daily Nutrition</h1>

      <Card className="mt-5">
        <SectionLabel>Meals today</SectionLabel>
        {!calorieTargets && (
          <p className="mb-3 text-xs text-ink/40">
            No calorie targets yet — log a weigh-in on the Weekly Planner to see meals compared against a target. You can still pick your meals below.
          </p>
        )}
        <div className="space-y-4">
          {MEALS.map((m) => {
            const categoryRecipes = recipes.filter((r) => (r.category || 'Dinner') === m.category)
            const selected = recipes.find((r) => r.id === selections[m.key])
            const target = calorieTargets?.meals[m.key]
            const diff = selected?.calories != null && target != null ? selected.calories - target : null
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/70">
                    {m.label}
                    {defaultedFrom[m.key] && <span className="ml-1.5 text-[10px] font-semibold text-sage-dark">from plan</span>}
                  </span>
                  <select
                    value={selections[m.key] || ''}
                    onChange={(e) => selectMeal(m.key, e.target.value)}
                    className="w-52 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
                  >
                    <option value="">Choose a meal…</option>
                    {categoryRecipes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                {categoryRecipes.length === 0 && (
                  <p className="mt-1 text-right text-xs text-ink/40">
                    No {m.category.toLowerCase()} meals in your library yet —{' '}
                    <Link href="/library" className="font-semibold text-dusk">add some</Link>
                  </p>
                )}
                {selected && (
                  <p className="mt-1 text-right text-xs text-ink/50">
                    {selected.calories == null ? (
                      <>No calorie estimate yet — <Link href="/library" className="font-semibold text-dusk">estimate it in the Library</Link></>
                    ) : target != null ? (
                      <>
                        {selected.calories} cal vs {target} target ({diff > 0 ? '+' : ''}{diff} {diff > 0 ? 'over' : diff < 0 ? 'under' : 'on target'})
                      </>
                    ) : (
                      <>{selected.calories} cal (no target yet)</>
                    )}
                  </p>
                )}
              </div>
            )
          })}
        </div>
        {calorieTargets && (
          <p className="mt-3 text-xs text-ink/40">
            Daily target: {calorieTargets.dailyTarget} cal (~{calorieTargets.maintenance} cal estimated
            maintenance, {calorieTargets.deficit} cal/day deficit — capped at a safer pace than your stated
            10 lb/month goal implies; recalculates from your latest weigh-in).
          </p>
        )}
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
      </Card>

      <Card className="mt-4">
        <SectionLabel>Medications &amp; supplements</SectionLabel>
        <p className="mb-3 text-xs text-ink/40">
          Manage the list itself from the Weekly Planner. This is just today&rsquo;s check-off — not reviewed or commented on by the AI features elsewhere in the app.
        </p>
        {medications.length === 0 ? (
          <p className="text-sm text-ink/40">
            Nothing set up yet — <Link href="/weekly-planner" className="font-semibold text-dusk">add some on the Weekly Planner</Link>.
          </p>
        ) : (
          <div className="space-y-4">
            {medGroups.map((group) => (
              <div key={group.time}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/40">{group.time}</p>
                <ul className="divide-y divide-sage-light">
                  {group.meds.map((med) => (
                    <li key={med.id} className="flex items-center justify-between gap-2 py-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{med.name}</p>
                        {med.dose && <p className="text-xs text-ink/40">{med.dose}</p>}
                      </div>
                      <button
                        onClick={() => toggleTaken(med.id)}
                        className={`shrink-0 rounded-card px-3 py-1.5 text-xs font-semibold ${
                          takenToday[med.id] ? 'bg-sage text-paper' : 'bg-sage-light text-sage-dark'
                        }`}
                      >
                        {takenToday[med.id] ? 'Taken ✓' : 'Mark taken'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-ink/40">
        Manual entry for now — see README for notes on a future Google Health API
        connection for automatic activity data.
      </p>
    </main>
  )
}
