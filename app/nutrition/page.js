import { Card, SectionLabel, PlannedActualRow } from '../../components/ui'
import { todaysNutrition, waterGoalOz } from '../../lib/mockData'

export default function NutritionPage() {
  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today</p>
      <h1 className="font-display text-2xl">Daily Nutrition</h1>

      <Card className="mt-5">
        <SectionLabel>Calories by meal</SectionLabel>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] text-ink/40">
              <th className="pb-2 font-normal">Meal</th>
              <th className="pb-2 text-right font-normal">Goal</th>
              <th className="pb-2 text-right font-normal">Actual</th>
            </tr>
          </thead>
          <tbody>
            {todaysNutrition.map((m) => (
              <PlannedActualRow key={m.meal} label={m.meal} planned={m.goalCalories} actual={m.actualCalories} unit=" cal" />
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <SectionLabel>Water intake</SectionLabel>
        <table className="w-full">
          <tbody>
            <PlannedActualRow label="Water" planned={waterGoalOz} actual={null} unit=" oz" />
          </tbody>
        </table>
      </Card>

      <p className="mt-4 text-xs text-ink/40">
        Manual entry for now — see README for notes on a future Google Health API
        connection for automatic activity data.
      </p>
    </main>
  )
}
