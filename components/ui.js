'use client'

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-card bg-white/70 border border-sage-light p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function SectionLabel({ children }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
      {children}
    </p>
  )
}

// Tap-to-rate 1-5 scale. `value` is the current rating (or null), `onChange`
// receives the new rating. Purely presentational here — wire to Supabase
// in the parent page.
export function RatingScale({ label, value, onChange, max = 5 }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-ink/80">{label}</span>
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            aria-label={`${label}: ${n} of ${max}`}
            aria-pressed={value === n}
            className={`h-7 w-7 rounded-full text-xs font-mono transition-colors ${
              value === n
                ? 'bg-dusk text-paper'
                : 'bg-sage-light text-ink/50 hover:bg-sage/30'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// Planned vs. actual row for strength/cardio/nutrition tables.
export function PlannedActualRow({ label, planned, actual, unit = '' }) {
  return (
    <tr className="border-b border-sage-light/70 last:border-0">
      <td className="py-2 pr-2 text-sm">{label}</td>
      <td className="py-2 px-2 text-right font-mono text-sm text-ink/60">
        {planned}
        {unit}
      </td>
      <td className="py-2 pl-2 text-right font-mono text-sm text-dusk font-semibold">
        {actual ?? '—'}
        {actual ? unit : ''}
      </td>
    </tr>
  )
}

export function StatPill({ label, value, tone = 'sage' }) {
  const toneMap = {
    sage: 'bg-sage-light text-sage-dark',
    dusk: 'bg-dusk-light text-dusk-dark',
    amber: 'bg-amber-light text-amber',
    rose: 'bg-rose-light text-rose',
  }
  return (
    <div className={`rounded-card px-3 py-2 ${toneMap[tone]}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
    </div>
  )
}
