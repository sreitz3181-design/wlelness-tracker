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

const LEVELS = ['light', 'moderate', 'high']

// Steps a level up/down/unchanged based on a difficulty rating. Capped at
// the ends of the scale — 'too_hard' at 'light' just stays 'light'.
export function stepLevel(current, rating) {
  const i = LEVELS.indexOf(current)
  if (rating === 'too_hard') return LEVELS[Math.max(i - 1, 0)]
  if (rating === 'too_easy') return LEVELS[Math.min(i + 1, LEVELS.length - 1)]
  return current
}

export async function getUserSettings(userId) {
  const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle()
  return (
    data || {
      user_id: userId,
      strength_intensity: 'light',
      cardio_effort: 'light',
      restricted_until: null,
    }
  )
}

export async function saveUserSettings(userId, fields) {
  if (!userId) return
  return supabase
    .from('user_settings')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
}

// True if today is on or before the restriction date — forces light
// intensity regardless of stored settings or difficulty history.
export function isRestricted(settings) {
  if (!settings?.restricted_until) return false
  return todayISO() <= settings.restricted_until
}

export async function getLatestWeight(userId) {
  const { data } = await supabase
    .from('weigh_ins')
    .select('weight_lbs, weigh_date')
    .eq('user_id', userId)
    .order('weigh_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.weight_lbs ?? null
}
