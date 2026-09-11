import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { refreshAccessToken, fetchTodaysEvents } from '../../../../lib/googleCalendar'

export async function POST(request) {
  const { uid } = await request.json()
  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  const { data: connection } = await supabaseAdmin
    .from('google_calendar_connections')
    .select('refresh_token')
    .eq('user_id', uid)
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({ connected: false, events: [] })
  }

  try {
    const accessToken = await refreshAccessToken(connection.refresh_token)
    const events = await fetchTodaysEvents(accessToken)
    return NextResponse.json({ connected: true, events })
  } catch (err) {
    console.error('calendar/today error:', err)
    return NextResponse.json({ connected: true, events: [], error: 'Failed to fetch events' })
  }
}
