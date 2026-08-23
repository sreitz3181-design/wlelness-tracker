'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Today', glyph: '☼' },
  { href: '/workout', label: 'Workout', glyph: '↝' },
  { href: '/nutrition', label: 'Nutrition', glyph: '✦' },
  { href: '/weekly-planner', label: 'Planner', glyph: '▤' },
  { href: '/health-dashboard', label: 'Progress', glyph: '◔' },
]

export default function NavBar() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-sage-light bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-between px-2 py-2 md:max-w-2xl">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-card py-1.5 text-xs transition-colors ${
                active ? 'text-dusk font-semibold' : 'text-ink/50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`text-lg leading-none ${active ? 'text-sage' : 'text-ink/40'}`}
              >
                {tab.glyph}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
