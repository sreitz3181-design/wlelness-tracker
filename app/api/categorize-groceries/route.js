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

  const prompt = `Categorize each grocery item below into exactly one of these categories: ${CATEGORIES.join(', ')}.

Guidance: Produce = fresh fruits/vegetables/herbs. Bakery = bread and baked goods. Meat = fresh meat, poultry, fish. Dairy = milk, cheese, eggs, yogurt, butter. Frozen = anything frozen. Grocery = shelf-stable pantry items, sauces, spices, canned goods, rice/grains — the general middle-of-store catch-all. Personal Hygiene = toiletries. Household = cleaning supplies, paper goods. Other = anything that genuinely doesn't fit.

Items:
${items.map((i) => `- ${i}`).join('\n')}

Respond with ONLY valid JSON, no other text, in exactly this shape:
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
