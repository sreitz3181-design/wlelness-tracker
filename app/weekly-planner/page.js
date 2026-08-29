'use client'

import { useEffect, useState } from 'react'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { mondayOfWeekISO, todayISO } from '../../lib/dates'
import { getCurrentUserId } from '../../lib/dailyLog'
import { recipes as mockRecipes } from '../../lib/mockData'

export default function WeeklyPlannerPage() {
  const [userId, setUserId] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [selected, setSelected] = useState(Array(7).fill(''))
  const [shoppingList, setShoppingList] = useState([])
  const [sermonNotes, setSermonNotes] = useState('')
  const [weight, setWeight] = useState('')
  const [latestWeighIn, setLatestWeighIn] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [addedNames, setAddedNames] = useState([])
  const [loading, setLoading] = useState(true)
  const weekStart = mondayOfWeekISO()

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return

      const { data: recipeRows } = await supabase.from('recipes').select('*').eq('user_id', uid)
      // Falls back to the placeholder list until `recipes` has been seeded
      // in Supabase — see supabase/seed_recipes.sql.
      setRecipes(recipeRows?.length ? recipeRows : mockRecipes)

      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', uid)
        .eq('week_start', weekStart)
        .maybeSingle()
      if (plan?.meal_slots) setSelected(plan.meal_slots)
      if (plan?.shopping_list) setShoppingList(plan.shopping_list)

      const { data: sermon } = await supabase
        .from('sermon_notes')
        .select('raw_notes')
        .eq('user_id', uid)
        .eq('week_start', weekStart)
        .maybeSingle()
      setSermonNotes(sermon?.raw_notes || '')

      const { data: lastWeighIn } = await supabase
        .from('weigh_ins')
        .select('weight_lbs, weigh_date')
        .eq('user_id', uid)
        .order('weigh_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      setLatestWeighIn(lastWeighIn || null)

      setLoading(false)
    }
    load()
  }, [])

  async function saveWeighIn() {
    if (!weight) return
    const numeric = Number(weight)
    await supabase.from('weigh_ins').upsert(
      { user_id: userId, weigh_date: todayISO(), weight_lbs: numeric },
      { onConflict: 'user_id,weigh_date' }
    )
    setLatestWeighIn({ weight_lbs: numeric, weigh_date: todayISO() })
    setWeight('')
  }

  function updateSlot(i, recipeId) {
    setSelected((prev) => prev.map((v, idx) => (idx === i ? recipeId : v)))
  }

  async function generateShoppingList() {
    const chosen = selected.filter(Boolean).map((id) => recipes.find((r) => r.id === id)).filter(Boolean)
    const all = chosen.flatMap((r) => r.ingredients || [])
    const deduped = Array.from(new Set(all))
    setShoppingList(deduped)
    await supabase.from('weekly_plans').upsert(
      { user_id: userId, week_start: weekStart, meal_slots: selected, shopping_list: deduped },
      { onConflict: 'user_id,week_start' }
    )
  }

  async function saveSermonNotes() {
    await supabase.from('sermon_notes').upsert(
      { user_id: userId, week_start: weekStart, raw_notes: sermonNotes },
      { onConflict: 'user_id,week_start' }
    )
  }

  async function getSuggestions() {
    setSuggestLoading(true)
    setSuggestError('')
    try {
      const res = await fetch('/api/suggest-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ existingRecipeNames: recipes.map((r) => r.name) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSuggestions(data.meals || [])
      setAddedNames([])
    } catch (err) {
      setSuggestError('Could not generate suggestions right now — try again in a moment.')
    } finally {
      setSuggestLoading(false)
    }
  }

  async function addSuggestionToLibrary(meal) {
    const { data, error } = await supabase
      .from('recipes')
      .insert({ user_id: userId, name: meal.name, ingredients: meal.ingredients })
      .select()
      .single()
    if (!error && data) {
      setRecipes((prev) => [...prev, data])
      setAddedNames((prev) => [...prev, meal.name])
    }
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading planner…</main>

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Week of {weekStart}</p>
      <h1 className="font-display text-2xl">Weekly Planner</h1>

      <Card className="mt-5">
        <SectionLabel>Pick meals for the coming week</SectionLabel>
        <div className="space-y-2">
          {selected.map((val, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-ink/70">Meal {i + 1}</span>
              <select
                value={val}
                onChange={(e) => updateSlot(i, e.target.value)}
                className="w-56 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
              >
                <option value="">Choose a meal…</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button
          onClick={generateShoppingList}
          className="mt-4 w-full rounded-card bg-sage py-2.5 text-sm font-semibold text-paper"
        >
          Generate shopping list
        </button>
      </Card>

      {shoppingList.length > 0 && (
        <Card className="mt-4">
          <SectionLabel>Shopping list</SectionLabel>
          <ul className="grid grid-cols-2 gap-x-4 text-sm text-ink/80">
            {shoppingList.map((item) => (
              <li key={item} className="py-0.5">
                • {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Suggest new meals</SectionLabel>
          <button
            onClick={getSuggestions}
            disabled={suggestLoading}
            className="rounded-card bg-dusk px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
          >
            {suggestLoading ? 'Thinking…' : 'Suggest meals'}
          </button>
        </div>
        {suggestError && <p className="text-xs text-rose">{suggestError}</p>}
        {suggestions.length === 0 && !suggestLoading && !suggestError && (
          <p className="text-sm text-ink/40">Get a few new ideas in the same style as your current recipes, sized for your calorie goals.</p>
        )}
        <div className="space-y-3">
          {suggestions.map((meal) => {
            const added = addedNames.includes(meal.name)
            return (
              <div key={meal.name} className="rounded-card border border-sage-light bg-white/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{meal.name}</p>
                    <p className="text-xs text-ink/50">~{meal.calorieEstimate} cal</p>
                  </div>
                  <button
                    onClick={() => addSuggestionToLibrary(meal)}
                    disabled={added}
                    className={`shrink-0 rounded-card px-3 py-1.5 text-xs font-semibold ${
                      added ? 'bg-sage-light text-sage-dark' : 'bg-sage text-paper'
                    }`}
                  >
                    {added ? 'Added ✓' : 'Add to library'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink/60">{meal.ingredients.join(', ')}</p>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="mt-4">
        <SectionLabel>Weekly weigh-in</SectionLabel>
        {latestWeighIn && (
          <p className="mb-2 text-xs text-ink/50">
            Last logged: {latestWeighIn.weight_lbs} lbs on {latestWeighIn.weigh_date}
          </p>
        )}
        <div className="flex gap-2">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Weight (lbs)"
            className="flex-1 rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
          />
          <button onClick={saveWeighIn} className="rounded-card bg-sage px-4 py-1.5 text-sm font-semibold text-paper">
            Log
          </button>
        </div>
        <p className="mt-2 text-xs text-ink/40">
          Your first entry becomes your starting weight — water and calorie targets use whichever entry is most recent.
        </p>
      </Card>

      <Card className="mt-4">
        <SectionLabel>Sermon notes for this week</SectionLabel>
        <textarea
          value={sermonNotes}
          onChange={(e) => setSermonNotes(e.target.value)}
          onBlur={saveSermonNotes}
          rows={4}
          placeholder="Paste or type this week's sermon notes…"
          className="w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
        />
        <p className="mt-2 text-xs text-ink/40">
          Theme extraction for daily reflections comes with the AI coaching pass — for now this just saves the raw notes.
        </p>
      </Card>
    </main>
  )
}
