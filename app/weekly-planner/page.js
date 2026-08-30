'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, SectionLabel } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { mondayOfWeekISO, todayISO } from '../../lib/dates'
import { getCurrentUserId } from '../../lib/dailyLog'
import { recipes as mockRecipes } from '../../lib/mockData'
import { CATEGORY_SLOT_LIMITS, DAY_NAMES, MEDICATION_TIMES, emptySlot } from '../../lib/mealLibrary'

function recipeIngredients(recipe, slot) {
  if (!recipe) return []
  return slot?.ingredients || recipe.ingredients || []
}

export default function WeeklyPlannerPage() {
  const [userId, setUserId] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [dinnerSlots, setDinnerSlots] = useState(Array.from({ length: 7 }, (_, i) => emptySlot(i)))
  const [breakfastSlots, setBreakfastSlots] = useState([])
  const [lunchSlots, setLunchSlots] = useState([])
  const [snackSlots, setSnackSlots] = useState([])
  const [shoppingList, setShoppingList] = useState([])
  const [sermonNotes, setSermonNotes] = useState('')
  const [weight, setWeight] = useState('')
  const [latestWeighIn, setLatestWeighIn] = useState(null)
  const [savedNote, setSavedNote] = useState(false)
  const [medications, setMedications] = useState([])
  const [newMed, setNewMed] = useState({ name: '', dose: '', time_of_day: 'Morning' })
  const [editingMedId, setEditingMedId] = useState(null)
  const [editMedDraft, setEditMedDraft] = useState({ name: '', dose: '', time_of_day: 'Morning' })
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
      if (plan?.dinner_slots?.length) {
        setDinnerSlots(plan.dinner_slots.map((s, i) => ({ ...s, day: s.day ?? i })))
      }
      if (plan?.breakfast_slots) setBreakfastSlots(plan.breakfast_slots)
      if (plan?.lunch_slots) setLunchSlots(plan.lunch_slots)
      if (plan?.snack_slots) setSnackSlots(plan.snack_slots)
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

      const { data: meds } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', uid)
        .eq('active', true)
        .order('created_at', { ascending: true })
      setMedications(meds || [])

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

  async function saveSermonNotes() {
    await supabase.from('sermon_notes').upsert(
      { user_id: userId, week_start: weekStart, raw_notes: sermonNotes },
      { onConflict: 'user_id,week_start' }
    )
  }

  // Medications are standing, recurring entries — not tied to a specific
  // week. Setting one up here carries forward day to day and week to week
  // automatically; daily "taken" tracking happens on the Nutrition screen.
  async function addMedication() {
    if (!newMed.name.trim() || !userId) return
    const { data } = await supabase
      .from('medications')
      .insert({ user_id: userId, name: newMed.name.trim(), dose: newMed.dose.trim() || null, time_of_day: newMed.time_of_day })
      .select()
      .single()
    if (data) setMedications((prev) => [...prev, data])
    setNewMed({ name: '', dose: '', time_of_day: 'Morning' })
  }

  function startEditMed(med) {
    setEditingMedId(med.id)
    setEditMedDraft({ name: med.name, dose: med.dose || '', time_of_day: MEDICATION_TIMES.includes(med.time_of_day) ? med.time_of_day : 'Anytime' })
  }

  function cancelEditMed() {
    setEditingMedId(null)
  }

  async function saveEditMed(id) {
    const updates = { name: editMedDraft.name.trim(), dose: editMedDraft.dose.trim() || null, time_of_day: editMedDraft.time_of_day }
    setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
    setEditingMedId(null)
    await supabase.from('medications').update(updates).eq('id', id)
  }

  async function removeMedication(id) {
    setMedications((prev) => prev.filter((m) => m.id !== id))
    await supabase.from('medications').update({ active: false }).eq('id', id)
  }

  const settersByCategory = { Dinner: setDinnerSlots, Breakfast: setBreakfastSlots, Lunch: setLunchSlots, Snacks: setSnackSlots }
  const slotsByCategory = { Dinner: dinnerSlots, Breakfast: breakfastSlots, Lunch: lunchSlots, Snacks: snackSlots }

  function addSlot(category) {
    const setter = settersByCategory[category]
    setter((prev) => (prev.length >= CATEGORY_SLOT_LIMITS[category] ? prev : [...prev, emptySlot()]))
  }

  function removeSlot(category, index) {
    settersByCategory[category]((prev) => prev.filter((_, i) => i !== index))
  }

  function selectRecipe(category, index, recipeId) {
    settersByCategory[category]((prev) => prev.map((s, i) => (i === index ? { recipeId, ingredients: null, day: s.day } : s)))
  }

  function selectLeftover(index, dinnerIndex) {
    setLunchSlots((prev) => prev.map((s, i) => (i === index ? { type: 'leftover', dinnerIndex, day: s.day } : s)))
  }

  function setSlotDay(category, index, day) {
    settersByCategory[category]((prev) => prev.map((s, i) => (i === index ? { ...s, day } : s)))
  }

  function updateSubstitution(category, index, ingredientIndex, value) {
    settersByCategory[category]((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        const recipe = recipes.find((r) => r.id === s.recipeId)
        const base = s.ingredients || recipe?.ingredients || []
        const next = [...base]
        next[ingredientIndex] = value
        return { ...s, ingredients: next }
      })
    )
  }

  async function saveIngredientToLibrary(category, index, ingredientIndex) {
    const slot = slotsByCategory[category][index]
    const recipe = recipes.find((r) => r.id === slot.recipeId)
    if (!recipe || !slot.ingredients) return
    const newIngredients = [...(recipe.ingredients || [])]
    newIngredients[ingredientIndex] = slot.ingredients[ingredientIndex]
    await supabase.from('recipes').update({ ingredients: newIngredients }).eq('id', recipe.id)
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, ingredients: newIngredients } : r)))
  }

  async function generateShoppingList() {
    const collect = (slots, category) =>
      slots.flatMap((slot) => {
        if (category === 'Lunch' && slot.type === 'leftover') return [] // no new ingredients
        const recipe = recipes.find((r) => r.id === slot.recipeId)
        return recipeIngredients(recipe, slot)
      })

    const all = [
      ...collect(dinnerSlots, 'Dinner'),
      ...collect(breakfastSlots, 'Breakfast'),
      ...collect(lunchSlots, 'Lunch'),
      ...collect(snackSlots, 'Snacks'),
    ]
    const deduped = Array.from(new Set(all))
    setShoppingList(deduped)
    await supabase.from('weekly_plans').upsert(
      {
        user_id: userId,
        week_start: weekStart,
        dinner_slots: dinnerSlots,
        breakfast_slots: breakfastSlots,
        lunch_slots: lunchSlots,
        snack_slots: snackSlots,
        shopping_list: deduped,
      },
      { onConflict: 'user_id,week_start' }
    )
    setSavedNote(true)
    setTimeout(() => setSavedNote(false), 2500)
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading planner…</main>

  function renderSlotEditor(category, slot, index) {
    const categoryRecipes = recipes.filter((r) => (r.category || 'Dinner') === category)
    const recipe = recipes.find((r) => r.id === slot.recipeId)
    const ingredients = recipeIngredients(recipe, slot)

    return (
      <div key={index} className="rounded-card border border-sage-light bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          {category === 'Dinner' ? (
            <span className="text-xs font-semibold text-ink/60">{DAY_NAMES[slot.day]}</span>
          ) : (
            <select
              value={slot.day ?? ''}
              onChange={(e) => setSlotDay(category, index, e.target.value === '' ? null : Number(e.target.value))}
              className="rounded-card border border-sage-light bg-white/70 px-2 py-1 text-xs"
            >
              <option value="">Any day</option>
              {DAY_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <select
            value={
              category === 'Lunch' && slot.type === 'leftover' ? `leftover:${slot.dinnerIndex}` : slot.recipeId || ''
            }
            onChange={(e) => {
              const val = e.target.value
              if (val.startsWith('leftover:')) {
                selectLeftover(index, Number(val.split(':')[1]))
              } else {
                selectRecipe(category, index, val)
              }
            }}
            className="flex-1 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
          >
            <option value="">Choose a meal…</option>
            {categoryRecipes.length === 0 && (
              <option disabled>No {category.toLowerCase()} meals yet — add some in the Library</option>
            )}
            {categoryRecipes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
            {category === 'Lunch' && dinnerSlots.some((d) => d.recipeId) && (
              <optgroup label="Leftovers">
                {dinnerSlots.map((d, di) => {
                  const dRecipe = recipes.find((r) => r.id === d.recipeId)
                  if (!dRecipe) return null
                  return (
                    <option key={di} value={`leftover:${di}`}>
                      Leftover: {dRecipe.name} ({DAY_NAMES[d.day]})
                    </option>
                  )
                })}
              </optgroup>
            )}
          </select>
          {category !== 'Dinner' && (
            <button onClick={() => removeSlot(category, index)} className="shrink-0 text-xs text-ink/30">
              ×
            </button>
          )}
        </div>

        {category === 'Lunch' && slot.type === 'leftover' && (
          <p className="mt-2 text-xs text-ink/40">
            {dinnerSlots[slot.dinnerIndex]?.recipeId
              ? 'Uses that dinner\u2019s ingredients — nothing new added to the shopping list.'
              : 'That dinner slot is empty — pick a dinner meal first.'}
          </p>
        )}

        {recipe && !(category === 'Lunch' && slot.type === 'leftover') && ingredients.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-ink/40">Ingredients (editable for this week)</p>
            {ingredients.map((ing, ii) => (
              <div key={ii} className="flex items-center gap-1.5">
                <input
                  value={ing}
                  onChange={(e) => updateSubstitution(category, index, ii, e.target.value)}
                  className="flex-1 rounded-card border border-sage-light bg-white/70 px-2 py-1 text-xs"
                />
                {slot.ingredients && slot.ingredients[ii] !== recipe.ingredients?.[ii] && (
                  <button
                    onClick={() => saveIngredientToLibrary(category, index, ii)}
                    className="shrink-0 rounded-card bg-sage-light px-2 py-1 text-[10px] font-semibold text-sage-dark"
                  >
                    Save to Library
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderCategorySection(category, slots, title) {
    return (
      <Card className="mt-4">
        <SectionLabel>{title}</SectionLabel>
        <div className="space-y-3">
          {slots.map((slot, i) => renderSlotEditor(category, slot, i))}
        </div>
        {category !== 'Dinner' && slots.length < CATEGORY_SLOT_LIMITS[category] && (
          <button
            onClick={() => addSlot(category)}
            className="mt-3 w-full rounded-card bg-sage-light py-2 text-xs font-semibold text-sage-dark"
          >
            + Add {category.toLowerCase()} ({slots.length}/{CATEGORY_SLOT_LIMITS[category]})
          </button>
        )}
      </Card>
    )
  }

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Week of {weekStart}</p>
      <h1 className="font-display text-2xl">Weekly Planner</h1>

      {renderCategorySection('Dinner', dinnerSlots, 'Dinner — 7 for the week')}
      {renderCategorySection('Breakfast', breakfastSlots, 'Breakfast (optional)')}
      {renderCategorySection('Lunch', lunchSlots, 'Lunch (optional — includes leftovers)')}
      {renderCategorySection('Snacks', snackSlots, 'Snacks (optional)')}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={generateShoppingList}
          className="flex-1 rounded-card bg-sage py-2.5 text-sm font-semibold text-paper"
        >
          Generate shopping list
        </button>
        {savedNote && <span className="text-xs text-sage-dark">Saved ✓</span>}
      </div>

      {shoppingList.length > 0 && (
        <Card className="mt-4">
          <SectionLabel>Shopping list</SectionLabel>
          <ul className="grid grid-cols-2 gap-x-4 text-sm text-ink/80">
            {shoppingList.map((item, i) => (
              <li key={`${item}-${i}`} className="py-0.5">
                • {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link href="/library" className="mt-4 block rounded-card bg-dusk py-2.5 text-center text-sm font-semibold text-paper">
        Manage Meal Library
      </Link>

      <Card className="mt-4">
        <SectionLabel>Medications &amp; supplements</SectionLabel>
        <p className="mb-3 text-xs text-ink/40">
          Set these up once — they carry forward automatically, day to day and week to week. Daily &ldquo;taken&rdquo; check-off happens on the Nutrition screen.
        </p>
        {medications.length === 0 ? (
          <p className="text-sm text-ink/40">Nothing added yet.</p>
        ) : (
          <ul className="divide-y divide-sage-light">
            {medications.map((med) =>
              editingMedId === med.id ? (
                <li key={med.id} className="py-3">
                  <input
                    value={editMedDraft.name}
                    onChange={(e) => setEditMedDraft((d) => ({ ...d, name: e.target.value }))}
                    className="w-full rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      value={editMedDraft.dose}
                      onChange={(e) => setEditMedDraft((d) => ({ ...d, dose: e.target.value }))}
                      placeholder="Dose"
                      className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
                    />
                    <select
                      value={editMedDraft.time_of_day}
                      onChange={(e) => setEditMedDraft((d) => ({ ...d, time_of_day: e.target.value }))}
                      className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-xs"
                    >
                      {MEDICATION_TIMES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => saveEditMed(med.id)} className="rounded-card bg-sage px-3 py-1.5 text-xs font-semibold text-paper">
                      Save
                    </button>
                    <button onClick={cancelEditMed} className="rounded-card bg-sage-light px-3 py-1.5 text-xs font-semibold text-sage-dark">
                      Cancel
                    </button>
                  </div>
                </li>
              ) : (
                <li key={med.id} className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{med.name}</p>
                      <p className="text-xs text-ink/40">
                        {[med.dose, med.time_of_day || 'Anytime'].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button onClick={() => startEditMed(med)} className="rounded-card bg-sage-light px-2.5 py-1 text-xs font-semibold text-sage-dark">
                        Edit
                      </button>
                      <button onClick={() => removeMedication(med.id)} className="text-xs text-ink/30">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              )
            )}
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
            <select
              value={newMed.time_of_day}
              onChange={(e) => setNewMed((m) => ({ ...m, time_of_day: e.target.value }))}
              className="rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm"
            >
              {MEDICATION_TIMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button onClick={addMedication} className="w-full rounded-card bg-sage py-1.5 text-sm font-semibold text-paper">
            Add
          </button>
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
        <SectionLabel>Sermon Notes or Scripture for this week</SectionLabel>
        <textarea
          value={sermonNotes}
          onChange={(e) => setSermonNotes(e.target.value)}
          onBlur={saveSermonNotes}
          rows={4}
          placeholder="Paste or type this week's sermon notes, or a passage of scripture you want to reflect on…"
          className="w-full rounded-card border border-sage-light bg-white/70 p-2 text-sm"
        />
        <p className="mt-2 text-xs text-ink/40">
          Feeds your daily reflection question and love reminder on the Today screen.
        </p>
      </Card>
    </main>
  )
}
