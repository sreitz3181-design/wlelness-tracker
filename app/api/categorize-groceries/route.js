import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireUser } from '../../../lib/verifyAuth'

const CATEGORIES = ['Produce', 'Bakery', 'Meat', 'Grocery', 'Frozen', 'Dairy', 'Personal Hygiene', 'Household', 'Other']

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }
  if (!items?.length) {
    return NextResponse.json({ categorized: [] })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You're turning a raw list of recipe ingredients into a clean grocery list.

Two things to do, in order:

1. MERGE duplicate or equivalent items before categorizing. Recipes often call for the same ingredient in different amounts (e.g. "2 Chicken Breast" and "4 Chicken Breast" should become one line, "6 Chicken Breast" — add the quantities together). Also merge obvious equivalents (e.g. "Chicken Breast" and "Chicken Breasts" are the same thing). Only merge when you're confident they're genuinely the same shopping item — don't merge things that are actually different (e.g. "Chicken Breast" and "Chicken Thighs" stay separate). When you merge, combine quantities into one clear line; if quantities aren't numeric or don't sensibly add (e.g. "Garlic" and "2 Garlic Cloves"), just keep the more specific/complete description as the merged line rather than inventing a sum.

2. Categorize each resulting (merged) item into exactly one of these categories: ${CATEGORIES.join(', ')}.

Guidance: Produce = fresh fruits/vegetables/herbs. Bakery = bread and baked goods. Meat = fresh meat, poultry, fish. Dairy = milk, cheese, eggs, yogurt, butter. Frozen = anything frozen. Grocery = shelf-stable pantry items, sauces, spices, canned goods, rice/grains — the general middle-of-store catch-all. Personal Hygiene = toiletries. Household = cleaning supplies, paper goods. Other = anything that genuinely doesn't fit.

Raw items:
${items.map((i) => `- ${i}`).join('\n')}

Respond with ONLY valid JSON, no other text, in exactly this shape — one entry per merged item, not one per raw input item:
{"categorized": [{"name": "string", "category": "string"}]}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ categorized: parsed.categorized || [] })
  } catch (err) {
    console.error('categorize-groceries error:', err)
    return NextResponse.json({ error: 'Failed to categorize items' }, { status: 500 })
  }
}
