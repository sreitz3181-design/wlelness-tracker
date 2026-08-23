'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Card } from '../../components/ui'

// Single-user app: the account is created once, ahead of time, in the
// Supabase dashboard (Authentication > Users > Add user). This page just
// signs that one account in — there's no public sign-up flow.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="px-4 pt-16">
      <h1 className="font-display text-2xl">Wellness Tracker</h1>
      <p className="mt-1 text-sm text-ink/50">Sign in to your check-in.</p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-ink/50">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-card border border-sage-light bg-white/70 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink/50">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-card border border-sage-light bg-white/70 px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-xs text-rose">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-card bg-dusk py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </Card>
    </main>
  )
}
