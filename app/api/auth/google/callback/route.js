import { NextResponse } from 'next/server'
import { appUrl } from '../../../../../lib/email'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const uid = searchParams.get('state') // the user id we passed through in /connect

  if (!code || !uid) {
    return NextResponse.redirect(`${appUrl()}/?calendar=error`)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${appUrl()}/api/auth/google/callback`,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.refresh_token) {
      throw new Error(tokens.error_description || 'No refresh token returned by Google')
    }

    await supabaseAdmin.from('google_calendar_connections').upsert(
      { user_id: uid, refresh_token: tokens.refresh_token, connected_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

    return NextResponse.redirect(`${appUrl()}/?calendar=connected`)
  } catch (err) {
    console.error('google calendar callback error:', err)
    return NextResponse.redirect(`${appUrl()}/?calendar=error`)
  }
}
