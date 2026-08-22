import { Card, SectionLabel } from '../../components/ui'
import { recipes, upcomingEvents } from '../../lib/mockData'

const DAYS = ['Meal 1', 'Meal 2', 'Meal 3', 'Meal 4', 'Meal 5', 'Meal 6', 'Meal 7']

export default function WeeklyPlannerPage() {
  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">This week</p>
      <h1 className="font-display text-2xl">Weekly Planner</h1>

      <Card className="mt-5">
        <SectionLabel>Pick meals for the coming week</SectionLabel>
        <div className="space-y-2">
          {DAYS.map((day) => (
            <div key={day} className="flex items-center justify-between">
              <span className="text-sm text-ink/70">{day}</span>
              <select className="w-56 rounded-card border border-sage-light bg-white/70 px-2 py-1.5 text-sm">
                <option value="">Choose a meal…</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button className="mt-4 w-full rounded-card bg-sage py-2.5 text-sm font-semibold text-paper">
          Generate shopping list
        </button>
      </Card>

      <Card className="mt-4">
        <SectionLabel>Calendar — coming week</SectionLabel>
        <ul className="divide-y divide-sage-light">
          {upcomingEvents.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span>{e.title}</span>
              <span className="text-xs text-ink/40">{e.when}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="rounded-card bg-dusk py-3 text-center text-xs font-semibold text-paper">
          Upload Sermon Notes
        </button>
        <button className="rounded-card bg-amber py-3 text-center text-xs font-semibold text-paper">
          Create New Tasks
        </button>
      </div>
    </main>
  )
}
