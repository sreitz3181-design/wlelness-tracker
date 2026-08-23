'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

// Simple client-side guard for a single-user app: no session -> redirect
// to /login. Good enough here since there's nothing to protect except
// one person's own data behind Supabase RLS, which is the real security
// boundary — this is just UX, not the security layer.
export default function AuthGate({ children }) {
  const [checked, setChecked] = useState(false)
  const [session, setSession] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
      if (!data.session && pathname !== '/login') {
        router.replace('/login')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession && pathname !== '/login') {
        router.replace('/login')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [pathname, router])

  if (pathname === '/login') return children
  if (!checked) return null
  if (!session) return null

  return children
}
