import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Pages currently import from lib/mockData.js so the UI renders without
// a live project. Once schema.sql has been run and these env vars are
// set, swap the mockData imports for calls through this client —
// e.g. supabase.from('daily_logs').select('*').eq('log_date', today).
// Falls back to a placeholder so builds/prerenders don't crash before env
// vars are set (e.g. local dev before .env.local exists). Real calls will
// simply fail until NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set for real.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
)
