import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { name, ingredients } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `Estimate nutrition facts per serving for this recipe:
Name: ${name}
Ingredients: ${ingredients.join(', ')}

Give calories and sodium in milligrams, per serving (assume the ingredient list serves about 4 unless it clearly implies otherwise). These are estimates from an ingredient list with no brand or exact-quantity data — be reasonable, not falsely precise. Sodium especially is a rough estimate.

Respond with ONLY valid JSON, no other text, in exactly this shape:
{"calories": number, "sodium_mg": number}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('estimate-nutrition error:', err)
    return NextResponse.json({ error: 'Failed to estimate nutrition' }, { status: 500 })
  }
}
