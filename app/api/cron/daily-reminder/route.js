import { NextResponse } from 'next/server'
import { sendReminderEmail, isAuthorizedCronRequest } from '../../../../lib/email'

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await sendReminderEmail({
      subject: 'Your daily check-in is ready',
      heading: 'Good morning',
      body: "Today's spiritual reflection, tasks, workout, and mental health journal are ready whenever you are.",
      linkPath: '/',
      linkLabel: 'Open Today',
    })
    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('daily-reminder error:', err)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
