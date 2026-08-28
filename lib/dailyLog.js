import { supabase } from './supabaseClient'
import { todayISO } from './dates'

// Upserts one or more fields on today's daily_logs row, creating it on
// first write. `fields` is an object, e.g. { workout_type: 'strength' }.
export async function saveTodayFields(userId, fields) {
  if (!userId) return
  return supabase
    .from('daily_logs')
    .upsert({ user_id: userId, log_date: todayISO(), ...fields }, { onConflict: 'user_id,log_date' })
}

export async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}

// Mon=0 ... Sun=6 rotation: Strength / Cardio alternating, Sunday rest.
// Just a sensible default — tap to override any day.
export function defaultWorkoutType(date = new Date()) {
  const day = date.getDay() // 0 = Sunday
  if (day === 0) return 'rest'
  return day % 2 === 1 ? 'strength' : 'cardio'
}
