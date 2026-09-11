import { NextResponse } from 'next/server'
import { appUrl } from '../../../../../lib/email'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    // Forces Google to always return a refresh token, even on reconnect —
    // without this, re-authorizing after the first time can silently omit it.
    prompt: 'consent',
    state: uid,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
