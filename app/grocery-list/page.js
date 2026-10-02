'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '../../components/ui'
import { supabase } from '../../lib/supabaseClient'
import { planningWeekStart } from '../../lib/dates'
import { getCurrentUserId } from '../../lib/dailyLog'
import { GROCERY_CATEGORIES } from '../../lib/mealLibrary'

export default function GroceryListPage() {
  const [userId, setUserId] = useState(null)
  const [items, setItems] = useState([])
  const [undoStack, setUndoStack] = useState([])
  const [newItemText, setNewItemText] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)
  const weekStart = planningWeekStart()

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

  function startEdit(item) {
    setEditingId(item.id)
    setEditValue(item.name)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id) {
    const name = editValue.trim()
    if (!name) return
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name } : i)))
    setEditingId(null)
    await supabase.from('grocery_items').update({ name }).eq('id', id)
  }

  async function addItem(category) {
    const text = (newItemText[category] || '').trim()
    if (!text || !userId) return
    const { data } = await supabase
      .from('grocery_items')
      .insert({ user_id: userId, week_start: weekStart, category, name: text, source: 'manual' })
      .select()
      .single()
    if (data) setItems((prev) => [...prev, data])
    setNewItemText((prev) => ({ ...prev, [category]: '' }))
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

      {undoStack.length > 0 && (
        <button
          onClick={undo}
          className="mt-3 w-full rounded-card bg-amber-light py-2 text-sm font-semibold text-amber"
        >
          ↺ Undo last check-off
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
                  editingId === item.id ? (
                    <li key={item.id} className="py-3">
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(item.id)}
                        autoFocus
                        className="w-full rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => saveEdit(item.id)} className="flex-1 rounded-card bg-sage py-1.5 text-xs font-semibold text-paper">
                          Save
                        </button>
                        <button onClick={cancelEdit} className="flex-1 rounded-card bg-sage-light py-1.5 text-xs font-semibold text-sage-dark">
                          Cancel
                        </button>
                      </div>
                    </li>
                  ) : (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      <button
                        onClick={() => checkOff(item)}
                        aria-label={`Check off ${item.name}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-sage-light"
                      />
                      <span className="flex-1 text-sm text-ink">{item.name}</span>
                      <button onClick={() => startEdit(item)} className="shrink-0 text-xs font-semibold text-dusk">
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
                placeholder={`Add to ${group.category}…`}
                className="flex-1 rounded-card border border-sage-light bg-white/70 px-3 py-1.5 text-sm"
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
