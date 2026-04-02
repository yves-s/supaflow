'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatRelativeTime } from '@/lib/format'
import Link from 'next/link'

interface DlqEntry {
  id: string
  run_id: string
  step_name: string
  displayName: string
  error: string
  input: unknown
  attempts: number
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  email: string
  workflow_name: string
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-4 right-4 bg-[#111] border border-[#333] rounded-lg px-4 py-3 text-sm text-[#ccc] shadow-xl z-50 max-w-xs">
      {message}
    </div>
  )
}

function DlqContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetEntryId = searchParams.get('entry')

  const [entries, setEntries] = useState<DlqEntry[]>([])
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const targetRef = useRef<HTMLDivElement | null>(null)
  const hasScrolled = useRef(false)

  const fetchEntries = useCallback(async (all: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dlq${all ? '?showAll=true' : ''}`)
      const data: DlqEntry[] = await res.json()
      setEntries(data)
      setLoading(false)
      return data
    } catch {
      setLoading(false)
      return []
    }
  }, [])

  // Initial load — handle target entry
  useEffect(() => {
    fetchEntries(false).then(data => {
      if (!targetEntryId) return
      const found = data.find(e => e.id === targetEntryId)
      if (!found) {
        // Entry might be resolved — try showAll
        fetchEntries(true).then(allData => {
          const foundInAll = allData.find(e => e.id === targetEntryId)
          if (foundInAll && foundInAll.resolved_at) {
            setShowAll(true)
          } else if (!foundInAll) {
            setToast('Eintrag nicht gefunden')
          }
        })
      }
    })
  }, [fetchEntries, targetEntryId])

  // Scroll to target entry after render
  useEffect(() => {
    if (!targetEntryId || hasScrolled.current) return
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      hasScrolled.current = true
    }
  }, [entries, targetEntryId])

  async function handleResolve(id: string) {
    setResolving(id)
    try {
      const res = await fetch(`/api/dlq/${id}/resolve`, { method: 'POST' })
      if (res.ok) {
        await fetchEntries(showAll)
      } else {
        setToast('Fehler beim Markieren als erledigt')
      }
    } catch {
      setToast('Fehler beim Markieren als erledigt')
    }
    setResolving(null)
  }

  function handleToggle(all: boolean) {
    setShowAll(all)
    hasScrolled.current = false
    fetchEntries(all)
    // Remove entry param from URL when toggling
    if (!all && targetEntryId) {
      router.push('/dlq')
    }
  }

  const openCount = entries.filter(e => !e.resolved_at).length

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0f0f0f] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          <Link
            href="/"
            className="text-[#555] hover:text-[#888] transition-colors flex items-center gap-1.5 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Zurück
          </Link>
          <div className="w-px h-4 bg-[#222]" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Dead Letter Queue</span>
            {!loading && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-[#431407] text-[#fb923c] font-mono">
                {openCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Toggle */}
        <div className="flex items-center gap-1 mb-5 bg-[#111] border border-[#222] rounded-md p-1 w-fit">
          <button
            onClick={() => handleToggle(false)}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${!showAll ? 'bg-[#1a1a1a] text-white' : 'text-[#555] hover:text-[#888]'}`}
          >
            Nur offene
          </button>
          <button
            onClick={() => handleToggle(true)}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${showAll ? 'bg-[#1a1a1a] text-white' : 'text-[#555] hover:text-[#888]'}`}
          >
            Alle anzeigen
          </button>
        </div>

        {loading ? (
          <div className="text-center text-[#555] text-sm py-12">Lädt...</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-[#555] text-sm py-12">
            {showAll ? 'Keine DLQ-Einträge vorhanden.' : 'Keine offenen DLQ-Einträge.'}
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => {
              const isTarget = entry.id === targetEntryId
              const isResolved = !!entry.resolved_at

              return (
                <div
                  key={entry.id}
                  ref={isTarget ? targetRef : null}
                  className={`bg-[#111] border rounded-lg p-4 transition-all
                    ${isTarget ? 'ring-2 ring-[#fb923c] border-[#431407]' : 'border-[#222]'}
                    ${isResolved ? 'opacity-50' : ''}
                  `}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono text-sm font-medium ${isResolved ? 'line-through text-[#555]' : 'text-white'}`}>
                          {entry.email || '—'}
                        </span>
                        <span className="text-xs text-[#555]">{entry.workflow_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-[#fb923c] bg-[#431407] px-1.5 py-0.5 rounded font-mono">
                          {entry.displayName}
                        </span>
                        <span className="text-xs text-[#555]">{formatRelativeTime(entry.created_at)}</span>
                        <span className="text-xs text-[#555]">{entry.attempts} Versuch{entry.attempts !== 1 ? 'e' : ''}</span>
                      </div>
                    </div>

                    {!isResolved ? (
                      <button
                        onClick={() => handleResolve(entry.id)}
                        disabled={resolving === entry.id}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[#052e16] text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#0a3d1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {resolving === entry.id ? (
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          '✓'
                        )}
                        Erledigt
                      </button>
                    ) : (
                      <div className="flex-shrink-0 text-xs text-[#444]">
                        <div className="flex items-center gap-1">
                          <span>✓</span>
                          <span>Erledigt</span>
                        </div>
                        {entry.resolved_by && (
                          <div className="font-mono text-[#333] mt-0.5">{entry.resolved_by}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {entry.error && (
                    <div className="bg-[#450a0a] border border-[#f87171]/15 rounded p-2.5 text-xs text-[#f87171] font-mono break-all leading-relaxed">
                      {entry.error}
                    </div>
                  )}

                  {/* Link to run */}
                  <div className="mt-3">
                    <Link
                      href={`/runs/${entry.run_id}`}
                      className="text-xs text-[#444] hover:text-[#666] transition-colors font-mono"
                      onClick={e => e.stopPropagation()}
                    >
                      Run ansehen →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

export default function DlqPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#555] text-sm">Lädt...</div>
      </div>
    }>
      <DlqContent />
    </Suspense>
  )
}
