export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function yesterdayISO() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Monday=0 ... Sunday=6, matching how weekly_plans slots are day-tagged.
export function mondayBasedDayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7
}

// Monday of the current week, as YYYY-MM-DD — used as the key for
// weekly_plans and sermon_notes rows.
export function mondayOfWeekISO(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
