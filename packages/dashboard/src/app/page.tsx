'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDuration, formatRelativeTime } from '@/lib/format'
import Link from 'next/link'

interface Run {
  id: string
  email: string
  workflow_name: string
  status: 'completed' | 'failed' | 'running' | 'pending'
  started_at: string
  duration_ms: number
}

interface Stats {
  completed: number
  failed: number
  running: number
  dlq_open: number
}

function StatusBadge({ status }: { status: Run['status'] }) {
  const styles = {
    completed: 'bg-[#052e16] text-[#4ade80]',
    failed: 'bg-[#450a0a] text-[#f87171]',
    running: 'bg-[#451a00] text-[#fbbf24]',
    pending: 'bg-[#1a1a1a] text-[#666]',
  }
  const labels = {
    completed: '✓ ok',
    failed: '✗ fehler',
    running: '⟳ läuft',
    pending: '... pending',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function LiveDuration({ startedAt, initialMs }: { startedAt: string; initialMs: number }) {
  const [ms, setMs] = useState(initialMs)
  useEffect(() => {
    const interval = setInterval(() => {
      setMs(Date.now() - new Date(startedAt).getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])
  return <span>{formatDuration(ms)}</span>
}

export default function HomePage() {
  const router = useRouter()
  const [runs, setRuns] = useState<Run[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [searchEmail, setSearchEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  // Fetch stats
  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
  }, [])

  // Fetch runs with debounce on search
  const fetchRuns = useCallback((email: string) => {
    setLoading(true)
    const url = email ? `/api/runs?email=${encodeURIComponent(email)}` : '/api/runs'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setRuns(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchRuns('')
  }, [fetchRuns])

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchEmail(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchRuns(value)
    }, 300)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0f0f0f] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#4ade80] flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L3.5 7L8.5 2.5" stroke="#052e16" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Supaflow</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-xs text-[#555] font-mono hidden sm:block">{userEmail}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-[#555] hover:text-[#888] transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111] border border-[#222] rounded-lg p-4">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Erfolgreich</div>
            <div className="text-2xl font-semibold text-[#4ade80]">
              {stats ? stats.completed : <span className="text-[#333] animate-pulse">—</span>}
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-lg p-4">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Fehlgeschlagen</div>
            <div className="text-2xl font-semibold text-[#f87171]">
              {stats ? stats.failed : <span className="text-[#333] animate-pulse">—</span>}
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-lg p-4">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">Laufend</div>
            <div className="text-2xl font-semibold text-[#fbbf24]">
              {stats ? stats.running : <span className="text-[#333] animate-pulse">—</span>}
            </div>
          </div>
          <Link href="/dlq" className="bg-[#111] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors group">
            <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">DLQ offen</div>
            <div className="text-2xl font-semibold text-[#fb923c] group-hover:text-[#fdba74] transition-colors">
              {stats ? stats.dlq_open : <span className="text-[#333] animate-pulse">—</span>}
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#555" strokeWidth="1.25"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="#555" strokeWidth="1.25" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="text"
            value={searchEmail}
            onChange={handleSearchChange}
            placeholder="Email suchen..."
            className="w-full sm:w-72 bg-[#111] border border-[#333] rounded-md pl-9 pr-3 py-2 text-white placeholder-[#555] focus:outline-none focus:border-[#555] text-sm transition-colors"
          />
        </div>

        {/* Table */}
        <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
          {loading ? (
            <div className="px-4 py-12 text-center text-[#555] text-sm">Lädt...</div>
          ) : runs.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#555] text-sm">
              {searchEmail ? `Keine Runs für "${searchEmail}" gefunden.` : 'Noch keine Workflow Runs vorhanden.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="px-4 py-2.5 text-left text-xs text-[#555] uppercase tracking-wider font-medium">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs text-[#555] uppercase tracking-wider font-medium hidden sm:table-cell">Workflow</th>
                  <th className="px-4 py-2.5 text-left text-xs text-[#555] uppercase tracking-wider font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs text-[#555] uppercase tracking-wider font-medium hidden md:table-cell">Gestartet</th>
                  <th className="px-4 py-2.5 text-left text-xs text-[#555] uppercase tracking-wider font-medium hidden md:table-cell">Dauer</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => router.push(`/runs/${run.id}`)}
                    className={`border-b border-[#1a1a1a] last:border-0 cursor-pointer transition-colors
                      ${run.status === 'failed' ? 'bg-[#1a0808] hover:bg-[#200a0a]' : 'hover:bg-[#1a1a1a]'}
                    `}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[#ccc] text-xs">{run.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#888] hidden sm:table-cell">
                      {run.workflow_name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-[#666] text-xs hidden md:table-cell">
                      {formatRelativeTime(run.started_at)}
                    </td>
                    <td className="px-4 py-3 text-[#666] text-xs font-mono hidden md:table-cell">
                      {run.status === 'running' ? (
                        <LiveDuration startedAt={run.started_at} initialMs={run.duration_ms} />
                      ) : (
                        formatDuration(run.duration_ms)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
