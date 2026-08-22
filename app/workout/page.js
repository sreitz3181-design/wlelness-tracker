import { Card, SectionLabel, PlannedActualRow } from '../../components/ui'
import { todaysWorkout } from '../../lib/mockData'

export default function WorkoutPage() {
  const { type, exercises, dailyGoals } = todaysWorkout

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Today&rsquo;s Scheduled Workout</p>
      <h1 className="font-display text-2xl">
        Category: <span className="text-sage-dark">{type}</span>
      </h1>

      <Card className="mt-5">
        <SectionLabel>Exercises</SectionLabel>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] text-ink/40">
              <th className="pb-2 font-normal">Exercise</th>
              <th className="pb-2 text-right font-normal">Recommended</th>
              <th className="pb-2 text-right font-normal">Actual</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => (
              <PlannedActualRow
                key={ex.name}
                label={ex.name}
                planned={`${ex.repsPlanned} × ${ex.weightPlanned} × ${ex.circuits}`}
                actual={ex.repsActual ? `${ex.repsActual} × ${ex.weightActual}` : null}
              />
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink/40">
          Tap a row to log today&rsquo;s actuals — next session&rsquo;s recommended weight adjusts
          from your history.
        </p>
      </Card>

      <Card className="mt-4">
        <SectionLabel>Daily health goals</SectionLabel>
        <table className="w-full">
          <tbody>
            <PlannedActualRow label="Step count" planned={dailyGoals.steps.goal.toLocaleString()} actual={dailyGoals.steps.actual} />
            <PlannedActualRow label="Active minutes" planned={dailyGoals.activeMinutes.goal} actual={dailyGoals.activeMinutes.actual} unit=" min" />
            <PlannedActualRow label="Calories burned" planned={dailyGoals.caloriesBurned.goal} actual={dailyGoals.caloriesBurned.actual} />
          </tbody>
        </table>
      </Card>
    </main>
  )
}
