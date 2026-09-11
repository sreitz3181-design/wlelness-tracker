import { createClient } from '@supabase/supabase-js'

// Server-only client using the service role key — bypasses row-level
// security. Needed here specifically because the Google OAuth callback is
// a plain browser redirect with no Supabase session attached to it, so
// there's no user JWT available to satisfy RLS the normal way. Every route
// using this manually scopes its own queries to the user id passed through
// the OAuth `state` parameter — never import this into client-side code.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key'
)
