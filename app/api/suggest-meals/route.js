import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { existingRecipeNames } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are suggesting new dinner-style recipes for someone's personal meal library, in the same style as recipes they already have.

Their existing recipes: ${existingRecipeNames.join(', ') || '(none yet)'}

Their style, based on what's already in the library: protein-forward (mostly chicken, some salmon/turkey/beef), simple ingredient lists (4-8 items), minimal prep, health-conscious. They're working toward a weight-loss goal, so meals should be reasonably calorie-conscious (roughly 500-700 calories per serving) without being austere.

Suggest 6 NEW meals that are NOT already in their list and don't just rename an existing one with one ingredient swapped — genuinely different enough to add variety (different proteins, cuisines, or cooking styles than what's already there).

For each: a short meal name, a simple ingredient list (matching the style of the examples — plain ingredient names, quantities only where it matters like "2 Chicken Breast"), and a rough calorie estimate per serving.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"meals": [{"name": "string", "ingredients": ["string"], "calorieEstimate": number}]}`

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
    console.error('suggest-meals error:', err)
    return NextResponse.json({ error: 'Failed to generate meal suggestions' }, { status: 500 })
  }
}
