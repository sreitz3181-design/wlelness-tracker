import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { stats } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are writing a warm, honest weekly wellness review for one person, based on data from their tracking app this week. All the numbers below are already computed — don't do arithmetic, just interpret them.

This week's stats (JSON):
${JSON.stringify(stats, null, 2)}

Write:
1. physicalRating (1-5, one decimal ok) — based on workouts completed vs scheduled and difficulty feedback.
2. mentalRating (1-5) — based on average stress rating and sleep quality this week.
3. spiritualRating (1-5) — based on how many days had a reflection response filled in (engagement, not judging the content itself).
4. exerciseNarrative (2-3 sentences) — encourage them to keep progressing, name what's actually going right, and reference the difficulty-rating pattern (e.g. if mostly "just right", say the intensity system is working; if several "too hard", acknowledge that honestly).
5. nutritionNarrative (2-3 sentences) — identify where calories missed the mark by meal if there's a clear pattern, comment on water intake vs goal, comment on step goal — specific and constructive, not scolding.
6. mentalHealthNarrative (3-4 sentences) — assess how the week went based on stress ratings and journal entries, derive an insight about what actually seemed to help them this week (name it specifically if a pattern shows up in the journal text), and comment on how they're doing with tasks — did they make progress, or does the list keep growing? Frame it in a way that helps them feel forward motion, not behind.
7. encouragement (2-3 sentences) — one overall closing note, warm, honest, forward-looking. Not generic hype.

Rules: never diagnose a mental health condition. If the stress/journal data suggests real distress that isn't improving, say so honestly and gently suggest they consider talking to someone, rather than papering over it with positivity.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"physicalRating": number, "mentalRating": number, "spiritualRating": number, "exerciseNarrative": "string", "nutritionNarrative": "string", "mentalHealthNarrative": "string", "encouragement": "string"}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('weekly-review error:', err)
    return NextResponse.json({ error: 'Failed to generate weekly review' }, { status: 500 })
  }
}
