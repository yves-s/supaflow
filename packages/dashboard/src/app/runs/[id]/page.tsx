'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  NodeProps,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { formatDuration, formatRelativeTime } from '@/lib/format'

interface Step {
  id: string
  step_name: string
  displayName: string
  status: 'completed' | 'failed' | 'running' | 'pending' | 'skipped'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  error: string | null
  attempts: number
  output: unknown
}

interface Run {
  id: string
  workflow_name: string
  status: 'completed' | 'failed' | 'running' | 'pending'
  started_at: string
  completed_at: string | null
  trigger_payload: { email?: string }
}

interface DlqEntry {
  id: string
}

type StepNodeData = {
  label: string
  status: Step['status']
  duration: number | null
  selected?: boolean
}

function StepNode({ data, selected }: NodeProps & { data: StepNodeData }) {
  const borderColor = {
    completed: selected ? '#4ade80' : '#1a4a2a',
    failed: selected ? '#f87171' : '#4a1a1a',
    running: selected ? '#fbbf24' : '#4a3a10',
    pending: selected ? '#555' : '#2a2a2a',
    skipped: selected ? '#444' : '#222',
  }[data.status] ?? '#222'

  const bgColor = {
    completed: '#0a1f10',
    failed: '#1a0808',
    running: '#1a1000',
    pending: '#111',
    skipped: '#0f0f0f',
  }[data.status] ?? '#111'

  const textColor = {
    completed: '#4ade80',
    failed: '#f87171',
    running: '#fbbf24',
    pending: '#666',
    skipped: '#444',
  }[data.status] ?? '#666'

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        padding: '8px 12px',
        minWidth: 180,
        boxShadow: selected ? `0 0 0 1px ${borderColor}` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#333', border: 'none' }} />
      <div style={{ fontSize: 12, color: textColor, fontWeight: 500, marginBottom: 2 }}>
        {data.label}
      </div>
      {data.duration != null && (
        <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>
          {formatDuration(data.duration)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#333', border: 'none' }} />
    </div>
  )
}

const nodeTypes = { stepNode: StepNode }

function StatusBadge({ status }: { status: Step['status'] | Run['status'] }) {
  const styles: Record<string, string> = {
    completed: 'bg-[#052e16] text-[#4ade80]',
    failed: 'bg-[#450a0a] text-[#f87171]',
    running: 'bg-[#451a00] text-[#fbbf24]',
    pending: 'bg-[#1a1a1a] text-[#666]',
    skipped: 'bg-[#1a1a1a] text-[#444]',
  }
  const labels: Record<string, string> = {
    completed: '✓ ok',
    failed: '✗ fehler',
    running: '⟳ läuft',
    pending: '... pending',
    skipped: '— skipped',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${styles[status] ?? 'bg-[#1a1a1a] text-[#666]'}`}>
      {labels[status] ?? status}
    </span>
  )
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [run, setRun] = useState<Run | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [selectedStep, setSelectedStep] = useState<Step | null>(null)
  const [dlqEntry, setDlqEntry] = useState<DlqEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}`)
      if (!res.ok) {
        setError('Run nicht gefunden.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setRun(data.run)
      setSteps(data.steps)
      setLoading(false)
    } catch {
      setError('Fehler beim Laden.')
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll when running
  useEffect(() => {
    if (run?.status !== 'running') return
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [run?.status, fetchData])

  // Fetch DLQ entry when step selected
  useEffect(() => {
    if (!selectedStep || !run) {
      setDlqEntry(null)
      return
    }
    fetch(`/api/dlq?step_name=${encodeURIComponent(selectedStep.step_name)}&run_id=${run.id}&showAll=true`)
      .then(r => r.json())
      .then((entries: DlqEntry[]) => {
        if (Array.isArray(entries) && entries.length > 0) {
          setDlqEntry(entries[0])
        } else {
          setDlqEntry(null)
        }
      })
      .catch(() => setDlqEntry(null))
  }, [selectedStep, run])

  const nodes: Node[] = steps.map((step, i) => ({
    id: step.id,
    position: { x: 0, y: i * 90 },
    data: {
      label: step.displayName,
      status: step.status,
      duration: step.duration_ms,
    },
    type: 'stepNode',
    selectable: true,
    selected: selectedStep?.id === step.id,
  }))

  const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
    id: `e-${i}`,
    source: step.id,
    target: steps[i + 1].id,
    style: { stroke: '#333' },
  }))

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    const step = steps.find(s => s.id === node.id)
    setSelectedStep(step ?? null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#555] text-sm">Lädt...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-[#f87171] text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#222] bg-[#0f0f0f] flex-shrink-0">
        <div className="px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-[#555] hover:text-[#888] transition-colors flex items-center gap-1.5 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Zurück
          </button>
          <div className="w-px h-4 bg-[#222]" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-[#888] truncate">{run?.workflow_name}</span>
            {run && <StatusBadge status={run.status} />}
          </div>
          {run?.trigger_payload?.email && (
            <span className="text-xs text-[#555] font-mono hidden sm:block ml-auto">
              {run.trigger_payload.email}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* React Flow */}
        <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 48px)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            style={{ background: '#0f0f0f' }}
            defaultEdgeOptions={{ style: { stroke: '#333' } }}
          >
            <Background color="#1a1a1a" gap={20} size={1} />
            <Controls
              style={{
                background: '#111',
                border: '1px solid #222',
                borderRadius: 6,
              }}
            />
          </ReactFlow>

          {steps.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-[#555] text-sm">Keine Steps vorhanden</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 border-l border-[#222] bg-[#0f0f0f] overflow-y-auto">
          {selectedStep ? (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Step</div>
                <div className="text-sm text-white font-medium">{selectedStep.displayName}</div>
              </div>

              <div>
                <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Status</div>
                <StatusBadge status={selectedStep.status} />
              </div>

              {selectedStep.duration_ms != null && (
                <div>
                  <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Dauer</div>
                  <div className="text-sm font-mono text-[#ccc]">{formatDuration(selectedStep.duration_ms)}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Versuche</div>
                <div className="text-sm font-mono text-[#ccc]">{selectedStep.attempts}</div>
              </div>

              {selectedStep.started_at && (
                <div>
                  <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Gestartet</div>
                  <div className="text-xs text-[#666]">{formatRelativeTime(selectedStep.started_at)}</div>
                </div>
              )}

              {selectedStep.error && (
                <div>
                  <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Fehler</div>
                  <div className="bg-[#450a0a] border border-[#f87171]/20 rounded p-2.5 text-xs text-[#f87171] font-mono break-all leading-relaxed">
                    {selectedStep.error}
                  </div>
                </div>
              )}

              {dlqEntry && (
                <div>
                  <a
                    href={`/dlq?entry=${dlqEntry.id}`}
                    className="block w-full text-center text-xs py-2 px-3 rounded bg-[#431407] text-[#fb923c] border border-[#fb923c]/20 hover:bg-[#5a1d09] transition-colors"
                  >
                    In DLQ ansehen
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="text-xs text-[#555]">Step auswählen für Details</div>

              {run && (
                <div className="mt-6 space-y-3">
                  <div>
                    <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Run-ID</div>
                    <div className="text-xs font-mono text-[#444] break-all">{run.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Gestartet</div>
                    <div className="text-xs text-[#666]">{formatRelativeTime(run.started_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#555] uppercase tracking-wider mb-1">Steps</div>
                    <div className="text-xs text-[#666]">{steps.length}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
