import { NextResponse } from 'next/server'
import { sendReminderEmail, isAuthorizedCronRequest } from '../../../../lib/email'

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await sendReminderEmail({
      subject: 'Time to plan next week',
      heading: 'Weekly planning',
      body: 'Pick your meals, log a weigh-in, save this week\u2019s sermon notes or scripture, and check your weekly review.',
      linkPath: '/weekly-planner',
      linkLabel: 'Open Weekly Planner',
    })
    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('weekly-reminder error:', err)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
