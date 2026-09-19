'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { mondayOfWeekISO } from '../../lib/dates'
import { getCurrentUserId } from '../../lib/dailyLog'
import { GROCERY_CATEGORIES } from '../../lib/mealLibrary'
import { authedFetch } from '../../lib/apiFetch'
import { parseIngredient, combineLines, normalizeKey, findMatch, formatQuantity } from '../../lib/groceryCombine'

const fieldClass = 'rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm'

export default function GroceryListPage() {
  const [userId, setUserId] = useState(null)
  const [items, setItems] = useState([])
  const [undoStack, setUndoStack] = useState([])
  const [newItemText, setNewItemText] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [combining, setCombining] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const weekStart = mondayOfWeekISO()

  useEffect(() => {
    async function load() {
      const uid = await getCurrentUserId()
      setUserId(uid)
      if (!uid) return
      const { data } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('user_id', uid)
        .eq('week_start', weekStart)
        .eq('checked', false)
        .order('created_at', { ascending: true })
      setItems(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function flash(message) {
    setNotice(message)
    setTimeout(() => setNotice(''), 4000)
  }

  async function checkOff(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setUndoStack((prev) => [...prev, item].slice(-10))
    await supabase.from('grocery_items').update({ checked: true }).eq('id', item.id)
  }

  async function undo() {
    if (undoStack.length === 0) return
    const item = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setItems((prev) => [...prev, item])
    await supabase.from('grocery_items').update({ checked: false }).eq('id', item.id)
  }

  // "2 avocados" adds quantity 2 of "avocados". If the list already has that
  // item (same name and unit, ignoring case and plurals), its quantity goes
  // up instead of creating a second line.
  async function addItem(category) {
    const text = (newItemText[category] || '').trim()
    if (!text || !userId) return
    const parsed = parseIngredient(text)
    setNewItemText((prev) => ({ ...prev, [category]: '' }))

    const existing = findMatch(items, parsed)
    if (existing) {
      const quantity = Math.round((Number(existing.quantity) + parsed.quantity) * 100) / 100
      setItems((prev) => prev.map((i) => (i.id === existing.id ? { ...i, quantity } : i)))
      await supabase.from('grocery_items').update({ quantity }).eq('id', existing.id)
      flash(`Already on the list — ${existing.name} is now ${formatQuantity(quantity)}.`)
      return
    }

    const { data } = await supabase
      .from('grocery_items')
      .insert({
        user_id: userId,
        week_start: weekStart,
        category,
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        source: 'manual',
      })
      .select()
      .single()
    if (data) setItems((prev) => [...prev, data])
  }

  function startEdit(item) {
    setEditingId(item.id)
    setDraft({
      name: item.name,
      quantity: formatQuantity(item.quantity),
      unit: item.unit || '',
      category: item.category,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
  }

  async function saveEdit(item) {
    const name = draft.name.trim()
    const quantity = Number(draft.quantity)
    if (!name) {
      flash('An item needs a name.')
      return
    }
    if (!(quantity > 0)) {
      flash('Quantity must be more than 0 — delete the item instead if you no longer need it.')
      return
    }
    const changes = { name, quantity, unit: draft.unit.trim(), category: draft.category }
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...changes } : i)))
    cancelEdit()
    await supabase.from('grocery_items').update(changes).eq('id', item.id)
  }

  async function deleteItem(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    setUndoStack((prev) => prev.filter((i) => i.id !== item.id))
    cancelEdit()
    await supabase.from('grocery_items').delete().eq('id', item.id)
  }

  // Merges duplicate lines on the current list. Exact matches (same name and
  // unit, ignoring case and plurals) merge in code; the AI is asked only
  // which *names* are the same thing, and quantities are always summed here.
  async function combineDuplicates() {
    setCombining(true)
    setNotice('')
    cancelEdit()

    const nameByKey = new Map()
    items.forEach((i) => {
      const key = normalizeKey(i.name)
      if (!nameByKey.has(key)) nameByKey.set(key, i.name)
    })

    let groups = []
    if (nameByKey.size > 1) {
      try {
        const res = await authedFetch('/api/categorize-groceries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: Array.from(nameByKey.values()) }),
        })
        const data = await res.json()
        if (!data.error) groups = data.merges || []
      } catch (err) {
        // Fall through — exact matches still get combined below.
      }
    }

    const merged = combineLines(items, groups).filter((b) => b.items.length > 1)
    if (merged.length === 0) {
      setCombining(false)
      flash('No duplicates found.')
      return
    }

    const removedIds = new Set()
    const updates = new Map()
    const writes = []
    for (const bucket of merged) {
      const [keeper, ...rest] = bucket.items
      // If any part of a merged line was added by hand, keep it as manual so
      // regenerating the plan's list can't wipe it out.
      const source = bucket.items.some((i) => i.source === 'manual') ? 'manual' : keeper.source
      const changes = { name: bucket.name, quantity: bucket.quantity, unit: bucket.unit, source }
      updates.set(keeper.id, changes)
      rest.forEach((i) => removedIds.add(i.id))
      writes.push(supabase.from('grocery_items').update(changes).eq('id', keeper.id))
      writes.push(
        supabase.from('grocery_items').delete().in('id', rest.map((i) => i.id))
      )
    }
    await Promise.all(writes)

    setItems((prev) =>
      prev.filter((i) => !removedIds.has(i.id)).map((i) => (updates.has(i.id) ? { ...i, ...updates.get(i.id) } : i))
    )
    setUndoStack([])
    setCombining(false)
    flash(`Combined ${removedIds.size + merged.length} lines into ${merged.length}.`)
  }

  if (loading) return <main className="px-4 pt-8 text-sm text-ink/40">Loading grocery list…</main>

  const grouped = GROCERY_CATEGORIES.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0 || g.category !== 'Other')

  return (
    <main className="px-4 pt-8 pb-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Week of {weekStart}</p>
      <h1 className="font-display text-2xl">Grocery List</h1>

      {notice && <p className="mt-3 rounded-card bg-sage-light px-3 py-2 text-xs text-sage-dark">{notice}</p>}

      {undoStack.length > 0 && (
        <button
          onClick={undo}
          className="mt-3 w-full rounded-card bg-amber-light py-2 text-sm font-semibold text-amber"
        >
          ↺ Undo last check-off
        </button>
      )}

      {items.length > 1 && (
        <button
          onClick={combineDuplicates}
          disabled={combining}
          className="mt-3 w-full rounded-card bg-dusk-light py-2 text-sm font-semibold text-dusk-dark disabled:opacity-50"
        >
          {combining ? 'Combining…' : 'Combine duplicates'}
        </button>
      )}

      {items.length === 0 && (
        <p className="mt-6 text-sm text-ink/40">
          Nothing here yet — generate a shopping list from the{' '}
          <Link href="/weekly-planner" className="font-semibold text-dusk">Weekly Planner</Link>, or add items below.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {grouped.map((group) => (
          <Card key={group.category}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink/40">{group.category}</p>
            {group.items.length === 0 ? (
              <p className="text-xs text-ink/30">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-sage-light">
                {group.items.map((item) =>
                  editingId === item.id && draft ? (
                    <li key={item.id} className="space-y-2 py-3">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        aria-label="Item name"
                        className={`${fieldClass} w-full`}
                      />
                      <div className="flex gap-2">
                        <input
                          value={draft.quantity}
                          onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          aria-label="Quantity"
                          className={`${fieldClass} w-20 font-mono`}
                        />
                        <input
                          value={draft.unit}
                          onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                          placeholder="unit (lb, can…)"
                          aria-label="Unit"
                          className={`${fieldClass} min-w-0 flex-1`}
                        />
                      </div>
                      <select
                        value={draft.category}
                        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                        aria-label="Category"
                        className={`${fieldClass} w-full`}
                      >
                        {GROCERY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(item)}
                          className="flex-1 rounded-card bg-sage py-2 text-sm font-semibold text-paper"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 rounded-card bg-sage-light py-2 text-sm font-semibold text-sage-dark"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteItem(item)}
                          className="rounded-card bg-rose-light px-4 py-2 text-sm font-semibold text-rose"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li key={item.id} className="flex items-center">
                      <button
                        onClick={() => checkOff(item)}
                        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-sage-light" />
                        <span className="min-w-[2rem] shrink-0 font-mono text-xs font-semibold text-dusk">
                          {formatQuantity(item.quantity ?? 1)}
                          {item.unit ? ` ${item.unit}` : ''}
                        </span>
                        <span className="text-sm text-ink">{item.name}</span>
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        aria-label={`Edit ${item.name}`}
                        className="shrink-0 rounded-card px-3 py-2 text-xs font-semibold text-ink/50"
                      >
                        Edit
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={newItemText[group.category] || ''}
                onChange={(e) => setNewItemText((prev) => ({ ...prev, [group.category]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addItem(group.category)}
                placeholder={`Add to ${group.category}… (e.g. 2 avocados)`}
                className={`${fieldClass} flex-1`}
              />
              <button
                onClick={() => addItem(group.category)}
                className="rounded-card bg-sage px-4 py-1.5 text-sm font-semibold text-paper"
              >
                +
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Link href="/weekly-planner" className="mt-6 block rounded-card bg-sage-light py-2.5 text-center text-sm font-semibold text-sage-dark">
        Back to Weekly Planner
      </Link>
    </main>
  )
}
