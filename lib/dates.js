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

// The most recent Friday on or before today, as YYYY-MM-DD — used as the
// key for weekly_plans, sermon_notes, and weekly_reviews rows. A plan made
// on a Friday stays the active one all the way through the following
// Thursday, matching the actual weekly planning rhythm (Friday evening
// planning session for the week ahead) rather than the Monday-Sunday
// calendar week, which didn't line up with when planning actually happens.
export function planningWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday ... 5 = Friday ... 6 = Saturday
  const diff = (day - 5 + 7) % 7 // days since the most recent Friday
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

// The most recent Sunday on or before today, as YYYY-MM-DD — used
// specifically for sermon_notes, on its own Sunday-Saturday cycle rather
// than the Friday-Thursday meal-planning week. Separate from
// planningWeekStart() on purpose: sermon notes follow when a sermon is
// actually heard and reflected on, not when groceries get planned.
export function sermonWeekStart(date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay()) // d.getDay() is 0 for Sunday
  return d.toISOString().slice(0, 10)
}
