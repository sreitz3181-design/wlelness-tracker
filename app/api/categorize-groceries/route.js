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
    return NextResponse.json({ categorized: [], merges: [] })
  }

  const names = Array.from(new Set(items.map((i) => String(i).trim()).filter(Boolean)))
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Below is a list of grocery item names. Do two things.

1. Categorize each item into exactly one of these categories: ${CATEGORIES.join(', ')}.

Guidance: Produce = fresh fruits/vegetables/herbs. Bakery = bread and baked goods. Meat = fresh meat, poultry, fish. Dairy = milk, cheese, eggs, yogurt, butter. Frozen = anything frozen. Grocery = shelf-stable pantry items, sauces, spices, canned goods, rice/grains — the general middle-of-store catch-all. Personal Hygiene = toiletries. Household = cleaning supplies, paper goods. Other = anything that genuinely doesn't fit.

2. Find names that are the SAME thing to buy, so they can be combined into one line on a shopping list. For example "Chicken Breast" and "Boneless Chicken Breasts", or "Shredded Cheddar" and "Shredded Cheddar Cheese". Only group names when buying one would fully satisfy the other. Do NOT group different forms or products (fresh vs. frozen broccoli, chicken breast vs. grilled chicken, broth vs. sauce), and do not group items that list "or" alternatives unless the alternatives are identical. When unsure, do not group. For each group, set "canonical" to one of the member names exactly as written. Names that have no match should not appear in "merges" at all.

Items:
${names.map((n) => `- ${n}`).join('\n')}

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"categorized": [{"name": "string", "category": "string"}], "merges": [{"canonical": "string", "members": ["string", "string"]}]}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    // Never trust the model's output shape: an invalid category would be
    // rejected by the database's check constraint, and merge groups may only
    // reference names we actually sent, each in at most one group.
    const categorized = (parsed.categorized || [])
      .filter((c) => c && typeof c.name === 'string')
      .map((c) => ({ name: c.name, category: CATEGORIES.includes(c.category) ? c.category : 'Other' }))

    const sent = new Set(names)
    const used = new Set()
    const merges = []
    for (const group of parsed.merges || []) {
      const members = Array.from(new Set((group?.members || []).filter((m) => sent.has(m) && !used.has(m))))
      if (members.length < 2) continue
      members.forEach((m) => used.add(m))
      merges.push({
        canonical: members.includes(group.canonical) ? group.canonical : members[0],
        members,
      })
    }

    return NextResponse.json({ categorized, merges })
  } catch (err) {
    console.error('categorize-groceries error:', err)
    return NextResponse.json({ error: 'Failed to categorize items' }, { status: 500 })
  }
}
