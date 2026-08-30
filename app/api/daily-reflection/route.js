import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { sermonNotes, reference, theme } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are helping someone reflect each day on their week's church sermon (or a passage of scripture they chose to focus on) and on God's love.

${sermonNotes ? `What they saved for this week (sermon notes or a scripture passage):\n"""${sermonNotes}"""` : 'Nothing was saved for this week — write a reflection question about walking with God generally.'}

Today's scripture reference for a reminder of God's love: ${reference} (theme: ${theme}).

Write two things:
1. A single, specific reflection question (one sentence) drawing on what's above, meant to prompt genuine personal reflection — not generic ("What did this mean to you?" is too generic; something concrete tied to what was actually said is better).
2. A short (2-3 sentence) reminder of God's love, in a warm and sincere voice, that references the theme of ${reference} — paraphrase the idea in your own words rather than quoting the verse's exact wording, and name the reference so they can look it up themselves.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"reflectionQuestion": "string", "loveReminder": "string"}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('daily-reflection error:', err)
    return NextResponse.json({ error: 'Failed to generate reflection' }, { status: 500 })
  }
}
