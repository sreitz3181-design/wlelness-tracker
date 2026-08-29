import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

// Safe, conservative rep/set/load bands per intensity level. The model
// picks exercises and stays within these bands rather than inventing its
// own numbers — keeps recommendations predictable and appropriate for
// someone without a logged strength baseline.
const INTENSITY_GUIDANCE = {
  light: 'Higher reps (12-15), lighter dumbbell loads (10-20 lbs, or bodyweight), 2-3 sets, generous rest. Suitable for someone easing back in or under a temporary activity restriction.',
  moderate: 'Moderate reps (8-12), moderate dumbbell loads (20-35 lbs), 3 sets.',
  high: 'Lower reps (6-10), heavier dumbbell loads (up to 50 lbs — never more), 3-4 sets.',
}

export async function POST(request) {
  const { intensityLevel } = await request.json()

  if (!INTENSITY_GUIDANCE[intensityLevel]) {
    return NextResponse.json({ error: 'Invalid intensity level' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are a supportive personal strength coach writing today's workout for one client.

Equipment available: dumbbells (never exceeding 50 lbs each) and bodyweight only — no machines, no barbells.
Intensity level for today: ${intensityLevel}. Guidance for this level: ${INTENSITY_GUIDANCE[intensityLevel]}

Pick 4-5 exercises covering a mix of push, pull, legs, and core, using a mix of dumbbell and bodyweight movements. For each, give a name, target sets, target reps, and a conservative suggested dumbbell weight (or "bodyweight" if applicable) — err light rather than heavy, since this client has no logged strength baseline yet and can always tell you it felt too easy.

Also write one short (1-2 sentence) encouraging note to open the workout with, in a warm coach's voice — not generic hype, something that acknowledges showing up consistently matters more than any single session.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"exercises": [{"name": "string", "sets": number, "reps": "string", "weight": "string"}], "encouragement": "string"}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('generate-workout error:', err)
    return NextResponse.json({ error: 'Failed to generate workout' }, { status: 500 })
  }
}
