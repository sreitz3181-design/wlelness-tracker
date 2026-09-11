import { Resend } from 'resend'

export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://your-app.vercel.app'
}

export async function sendReminderEmail({ subject, heading, body, linkPath, linkLabel }) {
  if (!process.env.RESEND_API_KEY || !process.env.REMINDER_EMAIL) {
    throw new Error('RESEND_API_KEY or REMINDER_EMAIL is not set')
  }
  const resend = new Resend(process.env.RESEND_API_KEY)
  const url = `${appUrl()}${linkPath}`

  await resend.emails.send({
    // resend.dev is Resend's shared sending domain — works immediately,
    // no DNS/domain verification needed. Swap for a verified custom
    // domain later if you want the "from" address to look nicer.
    from: 'Wellness Tracker <onboarding@resend.dev>',
    to: process.env.REMINDER_EMAIL,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #3B4C68;">${heading}</h2>
        <p style="color: #24322B;">${body}</p>
        <a href="${url}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #5B8570; color: white; text-decoration: none; border-radius: 10px;">${linkLabel}</a>
      </div>
    `,
  })
}

export function isAuthorizedCronRequest(request) {
  if (!process.env.CRON_SECRET) return false
  return request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}
