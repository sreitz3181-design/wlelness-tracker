import Link from 'next/link'
import { Card, SectionLabel, RatingScale } from '../components/ui'
import { todayScripture, todaysTasks, yesterdayRatings } from '../lib/mockData'

export default function DailyTaskPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="px-4 pt-8">
      <div className="rhythm-arc mb-6 h-1 w-16 rounded-full" />
      <p className="text-xs uppercase tracking-wide text-ink/40">{today}</p>
      <h1 className="font-display text-2xl">Good morning</h1>

      <Card className="mt-5">
        <SectionLabel>Spiritual health</SectionLabel>
        <p className="font-display text-lg italic leading-snug text-dusk">
          &ldquo;{todayScripture.verse}&rdquo;
        </p>
        <p className="mt-1 text-xs text-ink/50">{todayScripture.reference}</p>
        <p className="mt-3 text-sm text-ink/80">{todayScripture.encouragement}</p>
        <p className="mt-3 rounded-card bg-dusk-light px-3 py-2 text-xs text-dusk-dark">
          This week&rsquo;s theme: {todayScripture.sermonTheme}
        </p>
      </Card>

      <Card className="mt-4">
        <SectionLabel>How did yesterday go?</SectionLabel>
        <RatingScale label="Physical health" value={yesterdayRatings.physical} />
        <RatingScale label="Mental health" value={yesterdayRatings.mental} />
        <RatingScale label="Spiritual health" value={yesterdayRatings.spiritual} />
        <RatingScale label="Sleep" value={yesterdayRatings.sleep} />
        <RatingScale label="Stress" value={yesterdayRatings.stress} />
      </Card>

      <Card className="mt-4">
        <SectionLabel>Tasks</SectionLabel>
        <ul className="divide-y divide-sage-light">
          {todaysTasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>{t.title}</span>
              <span className="text-xs text-ink/40">{t.due}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link href="/workout" className="rounded-card bg-sage py-3 text-center text-xs font-semibold text-paper">
          Today&rsquo;s Workout
        </Link>
        <Link href="/health-dashboard" className="rounded-card bg-dusk py-3 text-center text-xs font-semibold text-paper">
          Health Stats
        </Link>
        <Link href="/nutrition" className="rounded-card bg-amber py-3 text-center text-xs font-semibold text-paper">
          Log Nutrition
        </Link>
      </div>
    </main>
  )
}
