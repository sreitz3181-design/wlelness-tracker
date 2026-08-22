'use client'

import { useState } from 'react'
import { Card, SectionLabel, StatPill } from '../../components/ui'
import { weeklyAverages } from '../../lib/mockData'

export default function HealthDashboardPage() {
  const [range, setRange] = useState('week')
  const data = weeklyAverages[range]

  return (
    <main className="px-4 pt-8">
      <p className="text-xs uppercase tracking-wide text-ink/40">Progress</p>
      <h1 className="font-display text-2xl">Health Dashboard</h1>

      <div className="mt-4 flex gap-2">
        {['week', 'month'].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-card px-4 py-1.5 text-xs font-semibold capitalize ${
              range === r ? 'bg-dusk text-paper' : 'bg-sage-light text-ink/60'
            }`}
          >
            This {r}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <SectionLabel>Workouts completed</SectionLabel>
        <p className="font-mono text-3xl font-semibold text-sage-dark">{data.workoutsCompleted}</p>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatPill label="Physical" value={data.physical.toFixed(1)} tone="sage" />
        <StatPill label="Mental" value={data.mental.toFixed(1)} tone="amber" />
        <StatPill label="Spiritual" value={data.spiritual.toFixed(1)} tone="dusk" />
        <StatPill label="Sleep" value={data.sleep.toFixed(1)} tone="sage" />
        <StatPill label="Stress" value={data.stress.toFixed(1)} tone="rose" />
      </div>
    </main>
  )
}
