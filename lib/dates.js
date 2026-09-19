// All dates in this app are YYYY-MM-DD strings in the user's *local* time.
// Building them with toISOString() would give the UTC date instead, which
// flips to "tomorrow" every evening after about 7 PM Central — so anything
// logged in the evening would land on the wrong day.

function pad(n) {
  return String(n).padStart(2, '0')
}

// A Date -> its local YYYY-MM-DD.
export function toLocalISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// YYYY-MM-DD -> a Date at noon local time on that day, so a daylight-saving
// shift can never roll it onto a neighboring day.
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toLocalISO(parseISODate(value)) === value
}

export function todayISO() {
  return toLocalISO(new Date())
}

export function addDaysISO(iso, days) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toLocalISO(d)
}

export function yesterdayISO() {
  return addDaysISO(todayISO(), -1)
}

export function formatDateLabel(iso, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return parseISODate(iso).toLocaleDateString('en-US', options)
}

// Monday=0 ... Sunday=6, matching how weekly_plans slots are day-tagged.
export function mondayBasedDayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7
}

// Monday of the week containing `date` (a Date or a YYYY-MM-DD string;
// defaults to now), as YYYY-MM-DD — used as the key for weekly_plans and
// sermon_notes rows.
export function mondayOfWeekISO(date = new Date()) {
  const d = typeof date === 'string' ? parseISODate(date) : new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toLocalISO(d)
}
