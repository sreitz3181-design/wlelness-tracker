import { supabase } from './supabaseClient'

// Wraps fetch to attach the current Supabase session's access token as a
// Bearer header. Required for every call to an Anthropic-backed API route,
// which now rejects requests with no valid session attached.
export async function authedFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
