'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const supabase = createClient()
    const origin = window.location.origin

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-[#4ade80] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="#052e16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">Supaflow</span>
          </div>
          <p className="text-[#666] text-sm">Workflow Observability</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#222] rounded-lg p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-[#052e16] border border-[#4ade80]/20 flex items-center justify-center mx-auto mb-4">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9L7 13L15 5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-white font-medium mb-1">Prüfe deine E-Mails</h2>
              <p className="text-[#666] text-sm">
                Wir haben einen Magic Link an{' '}
                <span className="text-[#ccc] font-mono">{email}</span>{' '}
                gesendet.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-4 text-sm text-[#555] hover:text-[#888] transition-colors"
              >
                Andere E-Mail verwenden
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-white font-medium mb-1">Anmelden</h1>
              <p className="text-[#666] text-sm mb-5">Zugang per Magic Link</p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-xs text-[#555] mb-1.5 uppercase tracking-wider">
                    E-Mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="deine@email.com"
                    required
                    autoFocus
                    className="w-full bg-[#111] border border-[#333] rounded-md px-3 py-2.5 text-white placeholder-[#555] focus:outline-none focus:border-[#555] text-sm transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-[#f87171] text-xs bg-[#450a0a] border border-[#f87171]/20 rounded px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-white text-black rounded-md px-4 py-2.5 text-sm font-medium hover:bg-[#e5e5e5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Wird gesendet...
                    </span>
                  ) : (
                    'Magic Link senden'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
