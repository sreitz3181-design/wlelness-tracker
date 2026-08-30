'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { getCurrentUserId } from '../../lib/dailyLog'
import { MEAL_CATEGORIES } from '../../lib/mealLibrary'

export default function MealLibraryPage() {
  const [userId, setUserId] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [activeCategory, setActiveCategory] = useState('Dinner')
  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [addedNames, setAddedNames] = useState([])
  const [estimatingId, setEstimatingId] = useState(null)
  const [newMeal, setNewMeal] = useState({ name: '', ingredients: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const { data } = await supabase.from('recipes').select('*').eq('user_id', uid).order('name', { ascending: true })
      setRecipes(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = recipes.filter((r) => (r.category || 'Dinner') === activeCategory)

  async function getSuggestions() {
    setSuggestLoading(true)
    setSuggestError('')
    setSuggestions([])
    try {
      const res = await fetch('/api/suggest-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingRecipeNames: recipes.filter((r) => (r.category || 'Dinner') === activeCategory).map((r) => r.name),
          category: activeCategory,
        }),
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
      .insert({
        user_id: userId,
        name: meal.name,
        ingredients: meal.ingredients,
        category: activeCategory,
        calories: meal.calorieEstimate ?? null,
        sodium_mg: meal.sodiumEstimate ?? null,
      })
      .select()
      .single()
    if (!error && data) {
      setRecipes((prev) => [...prev, data])
      setAddedNames((prev) => [...prev, meal.name])
    }
  }

  async function addManualMeal() {
    if (!newMeal.name.trim() || !userId) return
    const ingredients = newMeal.ingredients.split(',').map((s) => s.trim()).filter(Boolean)
    const { data } = await supabase
      .from('recipes')
      .insert({ user_id: userId, name: newMeal.name.trim(), ingredients, category: activeCategory })
      .select()
      .single()
    if (data) setRecipes((prev) => [...prev, data])
    setNewMeal({ name: '', ingredients: '' })
  }

  async function recategorize(recipe, category) {
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, category } : r)))
    await supabase.from('recipes').update({ category }).eq('id', recipe.id)
  }

  async function estimateNutrition(recipe) {
    setEstimatingId(recipe.id)
    try {
      const res = await fetch('/api/estimate-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recipe.name, ingredients: recipe.ingredients }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await supabase.from('recipes').update({ calories: data.calories, sodium_mg: data.sodium_mg }).eq('id', recipe.id)
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, calories: data.calories, sodium_mg: data.sodium_mg } : r)))
    } catch (err) {
      // Silent — button just stays available to retry.
    } finally {
      setEstimatingId(null)
    }
  }

  async function deleteRecipe(id) {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('recipes').delete().eq('id', id)
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading meal library…</main>

  return (
    <main className="px-4 pt-8 pb-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Meal Library</p>
      <h1 className="font-display text-2xl">Your meals</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {MEAL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-card px-3 py-1.5 text-xs font-semibold ${
              activeCategory === cat ? 'bg-dusk text-paper' : 'bg-sage-light text-ink/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <SectionLabel>{activeCategory} recipes</SectionLabel>
        {filtered.length === 0 ? (
          <p className="text-sm text-ink/40">No {activeCategory.toLowerCase()} meals yet.</p>
        ) : (
          <ul className="divide-y divide-sage-light">
            {filtered.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{r.name}</p>
                    <p className="mt-0.5 text-xs text-ink/50">{(r.ingredients || []).join(', ')}</p>
                    {r.calories ? (
                      <p className="mt-1 text-xs text-ink/40">
                        {r.calories} cal · {r.sodium_mg}mg sodium (rough est.)
                      </p>
                    ) : (
                      <button
                        onClick={() => estimateNutrition(r)}
                        disabled={estimatingId === r.id}
                        className="mt-1 text-xs font-semibold text-dusk disabled:opacity-50"
                      >
                        {estimatingId === r.id ? 'Estimating…' : 'Estimate nutrition'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => deleteRecipe(r.id)} className="shrink-0 text-xs text-ink/30">
                    Delete
                  </button>
                </div>
                <div className="mt-2">
                  <select
                    value={r.category || 'Dinner'}
                    onChange={(e) => recategorize(r, e.target.value)}
                    className="rounded-card border border-sage-light bg-white/70 px-2 py-1 text-xs"
                  >
                    {MEAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Suggest {activeCategory.toLowerCase()} meals</SectionLabel>
          <button
            onClick={getSuggestions}
            disabled={suggestLoading}
            className="rounded-card bg-dusk px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
          >
            {suggestLoading ? 'Thinking…' : 'Suggest meals'}
          </button>
        </div>
        {suggestError && <p className="text-xs text-rose">{suggestError}</p>}
        <div className="space-y-3">
          {suggestions.map((meal) => {
            const added = addedNames.includes(meal.name)
            return (
              <div key={meal.name} className="rounded-card border border-sage-light bg-white/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{meal.name}</p>
                    <p className="text-xs text-ink/50">
                      ~{meal.calorieEstimate} cal · {meal.sodiumEstimate}mg sodium (rough est.)
                    </p>
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
        <SectionLabel>Add a {activeCategory.toLowerCase()} meal manually</SectionLabel>
        <div className="space-y-2">
          <input
            value={newMeal.name}
            onChange={(e) => setNewMeal((m) => ({ ...m, name: e.target.value }))}
            placeholder="Meal name"
            className="w-full rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
          />
          <input
            value={newMeal.ingredients}
            onChange={(e) => setNewMeal((m) => ({ ...m, ingredients: e.target.value }))}
            placeholder="Ingredients, comma separated"
            className="w-full rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
          />
          <button onClick={addManualMeal} className="w-full rounded-card bg-sage py-1.5 text-sm font-semibold text-paper">
            Add to library
          </button>
        </div>
      </Card>

      <Link href="/weekly-planner" className="mt-4 block rounded-card bg-sage-light py-2.5 text-center text-sm font-semibold text-sage-dark">
        Back to Weekly Planner
      </Link>
    </main>
  )
}
