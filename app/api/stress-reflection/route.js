import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { LOVE_REFERENCES } from '../../../lib/scriptureReferences'

export async function POST(request) {
  const { stressCause, stressHelped, mentalHealthHelpers, additionalShare, stressRating } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const referencePool = LOVE_REFERENCES.map((r) => `${r.ref} (${r.theme})`).join('; ')

  const prompt = `You are offering a short, sincere biblical encouragement in response to someone's honest mental-health check-in — not a sermon, a brief personal word.

Today's entry:
- Stress rating (1-5): ${stressRating ?? 'not given'}
- What's causing stress: "${stressCause || '—'}"
- What's helping: "${stressHelped || '—'}"
- What's helping their mental health: "${mentalHealthHelpers || '—'}"
- Anything else shared: "${additionalShare || '—'}"

Pick the ONE reference from this list that best fits what they're actually going through today: ${referencePool}

Write a short (3-4 sentence) encouragement that speaks to their specific situation, paraphrasing the idea behind that verse in your own words rather than quoting its exact wording — and name the reference so they can look up the exact text themselves.

Rules: never diagnose, never suggest a specific mental health condition, never recommend medication. If what they've shared sounds like it could involve real crisis, self-harm, or being unsafe, this response should gently and directly encourage them to reach out to a crisis line or trusted person — scripture offered alongside that, never in place of it.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"encouragement": "string", "reference": "string"}`

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
    console.error('stress-reflection error:', err)
    return NextResponse.json({ error: 'Failed to generate reflection' }, { status: 500 })
  }
}
