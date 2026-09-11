export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Google access token')
  const data = await res.json()
  return data.access_token
}

export async function fetchTodaysEvents(accessToken) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const params = new URLSearchParams({
    timeMin: startOfDay,
    timeMax: endOfDay,
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch calendar events')
  const data = await res.json()

  return (data.items || []).map((e) => ({
    id: e.id,
    title: e.summary || '(No title)',
    start: e.start?.dateTime || e.start?.date || null,
    allDay: !e.start?.dateTime,
  }))
}
