import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { stressRating, stressCause, stressHelped, mentalHealthHelpers, additionalShare, recentHistory, tasks } =
    await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel project settings, then redeploy.' },
      { status: 500 }
    )
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const historyBlock = recentHistory?.length
    ? `Recent days for context (most recent first):\n${recentHistory
        .map((d) => `- ${d.log_date}: stress ${d.stress_rating ?? '—'}, caused by "${d.stress_cause || '—'}", helped by "${d.stress_helped || '—'}"`)
        .join('\n')}`
    : 'No recent history yet.'

  const tasksBlock = tasks?.length
    ? `Open tasks: ${tasks.map((t) => t.title).join('; ')}`
    : 'No open tasks.'

  const prompt = `You are a warm, supportive mental health check-in coach — not a therapist, just someone who listens and offers small, doable next steps. This is a private daily journal entry, not a crisis situation.

Today's entry:
- Stress rating (1-5): ${stressRating ?? 'not given'}
- What caused stress today: "${stressCause || '—'}"
- What helped with stress today: "${stressHelped || '—'}"
- What helped mental health today: "${mentalHealthHelpers || '—'}"
- Anything else they wanted to share: "${additionalShare || '—'}"

${historyBlock}

${tasksBlock}

Write one short (3-5 sentence) response. Rules:
- If stress has been rated 4-5 across recent days AND nothing they've listed seems to be helping, gently suggest ONE concrete, small thing to try — not a list, one idea, framed as an option not a prescription.
- If they seem to be struggling to get tasks done (open tasks piling up, or they mention feeling behind), suggest ONE practical approach — breaking a task into a smaller first step, or picking just one priority for tomorrow.
- Otherwise, acknowledge what they shared genuinely and specifically — reference something they actually wrote, don't be generic.
- Never diagnose, never suggest this is a specific mental health condition, never recommend medication. If anything in the entry sounds like it could involve real crisis, self-harm, or being unsafe, gently and directly encourage them to reach out to a crisis line or trusted person instead of trying to solve it yourself.
- Warm, plain language. No therapy jargon.

Respond with ONLY the feedback text, no JSON, no preamble.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content.find((block) => block.type === 'text')?.text || ''
    return NextResponse.json({ feedback: text.trim() })
  } catch (err) {
    console.error('journal-feedback error:', err)
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 })
  }
}
