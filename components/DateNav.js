'use client'

import { useRef } from 'react'
import { addDaysISO, formatDateLabel, todayISO } from '../lib/dates'

// Previous/next-day arrows plus a tap-to-pick-a-date label. `date` is a
// YYYY-MM-DD string; `onChange` receives the new one. Future days are
// blocked. When a past day is showing, a banner says so, so an entry is
// never saved to a different day than intended.
export default function DateNav({ date, onChange }) {
  const inputRef = useRef(null)
  const today = todayISO()
  const isToday = date === today

  function openPicker() {
    const el = inputRef.current
    if (!el) return
    try {
      el.showPicker()
    } catch (err) {
      el.focus()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(addDaysISO(date, -1))}
          aria-label="Previous day"
          className="h-9 w-9 shrink-0 rounded-card bg-sage-light text-lg font-semibold text-sage-dark"
        >
          ‹
        </button>
        <div className="relative min-w-0 flex-1 text-center">
          <button
            type="button"
            onClick={openPicker}
            className="max-w-full truncate text-xs font-semibold uppercase tracking-wide text-ink/60"
          >
            {isToday ? 'Today · ' : ''}
            {formatDateLabel(date)} ▾
          </button>
          <input
            ref={inputRef}
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            aria-label="Pick a date"
            tabIndex={-1}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
        </div>
        <button
          type="button"
          onClick={() => onChange(addDaysISO(date, 1))}
          disabled={isToday}
          aria-label="Next day"
          className="h-9 w-9 shrink-0 rounded-card bg-sage-light text-lg font-semibold text-sage-dark disabled:opacity-30"
        >
          ›
        </button>
      </div>
      {!isToday && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-card bg-amber-light px-3 py-2 text-xs text-amber">
          <span>Viewing a past day — entries save to this date.</span>
          <button type="button" onClick={() => onChange(today)} className="shrink-0 font-semibold underline">
            Back to today
          </button>
        </div>
      )}
    </div>
  )
}
