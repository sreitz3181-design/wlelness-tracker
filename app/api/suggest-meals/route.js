import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const CATEGORY_GUIDANCE = {
  Breakfast: 'Breakfast-style meals — quick to prepare, roughly 350-550 calories per serving.',
  Lunch: 'Lunch-style meals — simple, portable-friendly where possible, roughly 450-650 calories per serving.',
  Dinner: 'Dinner-style entrees, roughly 500-700 calories per serving.',
  Snacks: 'Snack-sized options, roughly 150-300 calories per serving — quick, minimal prep.',
}

export async function POST(request) {
  const { existingRecipeNames, category } = await request.json()
  const cat = CATEGORY_GUIDANCE[category] ? category : 'Dinner'

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are suggesting new ${cat} recipes for someone's personal meal library, in the same style as recipes they already have.

Their existing ${cat} recipes: ${existingRecipeNames.join(', ') || '(none yet)'}

Category guidance: ${CATEGORY_GUIDANCE[cat]}

Their overall style, based on their library: protein-forward, simple ingredient lists (4-8 items), minimal prep, health-conscious. They're working toward a weight-loss goal, so lean that direction without being austere.

Suggest 6 NEW meals that are NOT already in their list and don't just rename an existing one with one ingredient swapped — genuinely different enough to add variety.

For each: a short meal name, a simple ingredient list (matching the style of the examples — plain ingredient names, quantities only where it matters like "2 Chicken Breast"), and per-serving estimates for calories and sodium (milligrams). These are estimates from an ingredient list with no brand or exact-quantity data — reasonable, not falsely precise. Sodium especially is a rough estimate.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"meals": [{"name": "string", "ingredients": ["string"], "calorieEstimate": number, "sodiumEstimate": number}]}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ meals: parsed.meals || [], category: cat })
  } catch (err) {
    console.error('suggest-meals error:', err)
    return NextResponse.json({ error: 'Failed to generate meal suggestions' }, { status: 500 })
  }
}
