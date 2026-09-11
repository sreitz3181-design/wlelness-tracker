import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Verifies the bearer token on an incoming API request against Supabase
// Auth. This app has exactly one real account and no public sign-up path,
// so "is there a genuine logged-in session at all" is enough to close off
// unauthenticated access to the Anthropic-backed routes — no per-user
// logic needed. Returns the user on success, or null if the token is
// missing or invalid.
export async function requireUser(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const supabase = createClient(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}
