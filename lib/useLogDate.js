'use client'

import { useCallback, useEffect, useState } from 'react'
import { todayISO, isValidISODate } from './dates'

// The day being viewed and edited on the Today, Workout, and Nutrition
// screens. It lives in the URL (?date=YYYY-MM-DD) so links between those
// screens can carry it and a refresh keeps it; today is the default and is
// kept out of the URL. Future dates aren't allowed. The value is null until
// the page has mounted, which keeps server and browser rendering in step.
export function useLogDate() {
  const [date, setDateState] = useState(null)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('date')
    const today = todayISO()
    setDateState(fromUrl && isValidISODate(fromUrl) && fromUrl <= today ? fromUrl : today)
  }, [])

  const setDate = useCallback((next) => {
    const today = todayISO()
    const safe = isValidISODate(next) && next <= today ? next : today
    setDateState(safe)

    const url = new URL(window.location.href)
    if (safe === today) url.searchParams.delete('date')
    else url.searchParams.set('date', safe)
    window.history.replaceState(null, '', url.pathname + url.search)
  }, [])

  return [date, setDate]
}
