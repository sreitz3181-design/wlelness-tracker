'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, SectionLabel } from '../../components/ui'
import DateNav from '../../components/DateNav'
import { supabase } from '../../lib/supabaseClient'
import { todayISO, mondayOfWeekISO } from '../../lib/dates'
import { useLogDate } from '../../lib/useLogDate'
import { getCurrentUserId, saveDayFields, getLatestWeight } from '../../lib/dailyLog'
import { computeCalorieTargets } from '../../lib/calorieTargets'
import { MEDICATION_TIMES } from '../../lib/mealLibrary'

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', category: 'Breakfast' },
  { key: 'lunch', label: 'Lunch', category: 'Lunch' },
  { key: 'dinner', label: 'Dinner', category: 'Dinner' },
  { key: 'snacks', label: 'Snacks', category: 'Snacks' },
]

export default function NutritionPage() {
  const [date, setDate] = useLogDate() // the day being viewed; null until mounted
  const [userId, setUserId] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [dinnerSlots, setDinnerSlots] = useState([])
  const [selections, setSelections] = useState({})
  const [nutritionActual, setNutritionActual] = useState({})
  const [water, setWater] = useState('')
  const [weight, setWeight] = useState(null)
  const [medications, setMedications] = useState([])
  const [takenToday, setTakenToday] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!date) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid || cancelled) return
      const [{ data }, latestWeight, { data: recipeRows }, { data: meds }, { data: logs }, { data: plan }] = await Promise.all([
        supabase.from('daily_logs').select('nutrition_actual, nutrition_selections').eq('user_id', uid).eq('log_date', date).maybeSingle(),
        getLatestWeight(uid),
        supabase.from('recipes').select('*').eq('user_id', uid),
        supabase.from('medications').select('*').eq('user_id', uid).eq('active', true).order('created_at', { ascending: true }),
        supabase.from('medication_logs').select('medication_id, taken').eq('user_id', uid).eq('log_date', date),
        // The plan for the week the viewed day falls in.
        supabase.from('weekly_plans').select('dinner_slots').eq('user_id', uid).eq('week_start', mondayOfWeekISO(date)).maybeSingle(),
      ])
      if (cancelled) return

      setWater(data?.nutrition_actual?.water_oz ?? '')
      setNutritionActual(data?.nutrition_actual || {})
      setSelections(data?.nutrition_selections || {})
      setWeight(latestWeight)
      setRecipes(recipeRows || [])
      setDinnerSlots(plan?.dinner_slots || [])

      setMedications(meds || [])
      const takenMap = {}
      ;(logs || []).forEach((l) => {
        takenMap[l.medication_id] = l.taken
      })
      setTakenToday(takenMap)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [date])

  async function selectMeal(key, recipeId) {
    const nextSelections = { ...selections, [key]: recipeId }
    setSelections(nextSelections)
    const recipe = recipes.find((r) => r.id === recipeId)
    const nextActual = { ...nutritionActual, [key]: recipe?.calories ?? null }
    setNutritionActual(nextActual)
    await saveDayFields(userId, { nutrition_selections: nextSelections, nutrition_actual: nextActual }, date)
  }

  async function saveWater(value) {
    setWater(value)
    const nextActual = { ...nutritionActual, water_oz: value === '' ? null : Number(value) }
    setNutritionActual(nextActual)
    await saveDayFields(userId, { nutrition_actual: nextActual }, date)
  }

  async function toggleTaken(medId) {
    const next = !takenToday[medId]
    setTakenToday((prev) => ({ ...prev, [medId]: next }))
    await supabase
      .from('medication_logs')
      .upsert({ user_id: userId, medication_id: medId, log_date: date, taken: next }, { onConflict: 'user_id,medication_id,log_date' })
  }

  if (!date) return <main className="px-4 pt-8 text-sm text-ink/40">Loading…</main>
  if (loading) {
    return (
      <main className="px-4 pt-8">
        <DateNav date={date} onChange={setDate} />
        <p className="mt-6 text-sm text-ink/40">Loading nutrition…</p>
      </main>
    )
  }

  const isToday = date === todayISO()

  const waterGoal = weight ? Math.round(weight * 0.5) : null
  const calorieTargets = computeCalorieTargets(weight)

  const medGroups = MEDICATION_TIMES.map((time) => ({
    time,
    meds: medications.filter((m) => (m.time_of_day || 'Anytime') === time || (time === 'Anytime' && !MEDICATION_TIMES.includes(m.time_of_day))),
  })).filter((g) => g.meds.length > 0)

  return (
    <main className="px-4 pt-8">
      <DateNav date={date} onChange={setDate} />
      <h1 className="mt-3 font-display text-2xl">Daily Nutrition</h1>

      <Card className="mt-5">
        <SectionLabel>{isToday ? 'Meals today' : 'Meals'}</SectionLabel>
        {!calorieTargets && (
          <p className="mb-3 text-xs text-ink/40">
            No calorie targets yet — log a weigh-in on the Weekly Planner to see meals compared against a target. You can still pick your meals below.
          </p>
        )}
        <div className="space-y-4">
          {MEALS.map((m) => {
            const libraryRecipes = recipes.filter((r) => (r.category || 'Dinner') === m.category)
            const plannedDinners = dinnerSlots
              .filter((s) => s.recipeId)
              .map((s) => recipes.find((r) => r.id === s.recipeId))
              .filter(Boolean)
            // Dinner draws from this week's actual 7 planned meals — what
            // you have ingredients for — falling back to the full Library
            // only if nothing's been planned yet.
            const dinnerOptions = plannedDinners.length > 0 ? plannedDinners : libraryRecipes
            const categoryRecipes = m.key === 'dinner' ? dinnerOptions : libraryRecipes

            const selectedRecipeId = selections[m.key]
            const selected = recipes.find((r) => r.id === selectedRecipeId)
            // If the current lunch selection matches one of this week's
            // dinners, show it as the leftover option rather than a plain
            // recipe id (which wouldn't otherwise appear in Lunch's list).
            const leftoverIndex =
              m.key === 'lunch' ? dinnerSlots.findIndex((s) => s.recipeId === selectedRecipeId) : -1
            const selectValue = leftoverIndex >= 0 ? `leftover:${leftoverIndex}` : selectedRecipeId || ''

            const target = calorieTargets?.meals[m.key]
            const diff = selected?.calories != null && target != null ? selected.calories - target : null

            return (
              <div key={m.key}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink/70">{m.label}</span>
                  <select
                    value={selectValue}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val.startsWith('leftover:')) {
                        const idx = Number(val.split(':')[1])
                        selectMeal(m.key, dinnerSlots[idx]?.recipeId || '')
                      } else {
                        selectMeal(m.key, val)
                      }
                    }}
                    className="w-52 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
                  >
                    <option value="">Choose a meal…</option>
                    {categoryRecipes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    {m.key === 'lunch' && plannedDinners.length > 0 && (
                      <optgroup label="Leftovers">
                        {dinnerSlots.map((s, i) => {
                          const dRecipe = recipes.find((r) => r.id === s.recipeId)
                          if (!dRecipe) return null
                          return (
                            <option key={i} value={`leftover:${i}`}>
                              Leftover: {dRecipe.name}
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>
                {m.key === 'dinner' && plannedDinners.length === 0 && libraryRecipes.length === 0 && (
                  <p className="mt-1 text-right text-xs text-ink/40">
                    No dinners planned or in your library yet —{' '}
                    <Link href="/weekly-planner" className="font-semibold text-dusk">plan your week</Link>
                  </p>
                )}
                {m.key !== 'dinner' && categoryRecipes.length === 0 && (
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
          Manage the list itself from the Weekly Planner. This is just {isToday ? 'today\u2019s' : 'this day\u2019s'} check-off — not reviewed or commented on by the AI features elsewhere in the app.
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
