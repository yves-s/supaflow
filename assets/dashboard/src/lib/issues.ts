// ─── Error pattern normalisation ──────────────────────────────────────────────

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const LONG_DIGIT_RE = /\b\d{4,}\b/g

export function computeErrorPattern(error: string): string {
  return error
    .replace(UUID_RE, '<UUID>')
    .replace(LONG_DIGIT_RE, '<ID>')
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

const BUCKET_COUNT = 9
const WINDOW_MS = 24 * 60 * 60 * 1000 // 24h
const BUCKET_MS = WINDOW_MS / BUCKET_COUNT // ~2h40m each

/**
 * Given an array of event timestamps (ms) and a reference "now",
 * returns 9 bucket counts covering the last 24h.
 * Bucket 0 = oldest window, bucket 8 = most recent.
 */
export function buildSparklineBuckets(timestamps: number[], now: number): number[] {
  const buckets = new Array<number>(BUCKET_COUNT).fill(0)
  const windowStart = now - WINDOW_MS
  for (const ts of timestamps) {
    if (ts < windowStart || ts > now) continue
    const idx = Math.min(
      BUCKET_COUNT - 1,
      Math.floor((ts - windowStart) / BUCKET_MS)
    )
    buckets[idx]++
  }
  return buckets
}

// ─── Issue type ────────────────────────────────────────────────────────────────

export type IssueStatus = 'unresolved' | 'resolved' | 'ignored'

export interface Issue {
  key: string // composite: `${workflowName}||${stepName}||${errorPattern}`
  workflowName: string
  stepName: string
  errorPattern: string
  status: IssueStatus
  statusId: string | null // supaflow_issues.id, null if not yet persisted
  count: number
  firstSeenAt: number // ms
  lastSeenAt: number // ms
  sparkline: number[] // 9 buckets
  runIds: string[] // all affected run IDs for linking to Flow tab
  trend: 'increasing' | 'stable' | 'decreasing'
}

interface RawFailedStep {
  runId: string
  workflowName: string
  stepName: string
  error: string
  startedAt: number // ms
}

interface StoredIssueStatus {
  id: string
  workflow_name: string
  step_name: string
  error_pattern: string
  status: IssueStatus
}

export function groupIntoIssues(
  steps: RawFailedStep[],
  storedStatuses: StoredIssueStatus[],
  now: number = Date.now()
): Issue[] {
  const map = new Map<string, {
    workflowName: string
    stepName: string
    errorPattern: string
    timestamps: number[]
    runIds: string[]
  }>()

  for (const s of steps) {
    const pattern = computeErrorPattern(s.error)
    const key = `${s.workflowName}||${s.stepName}||${pattern}`
    const existing = map.get(key) ?? {
      workflowName: s.workflowName,
      stepName: s.stepName,
      errorPattern: pattern,
      timestamps: [],
      runIds: [],
    }
    existing.timestamps.push(s.startedAt)
    if (!existing.runIds.includes(s.runId)) existing.runIds.push(s.runId)
    map.set(key, existing)
  }

  const statusMap = new Map(
    storedStatuses.map(s => [
      `${s.workflow_name}||${s.step_name}||${s.error_pattern}`,
      s,
    ])
  )

  return Array.from(map.entries()).map(([key, g]) => {
    const stored = statusMap.get(key)
    const sparkline = buildSparklineBuckets(g.timestamps, now)
    const firstSeenAt = Math.min(...g.timestamps)
    const lastSeenAt = Math.max(...g.timestamps)

    // Trend: compare avg of last 3 buckets vs first 3 buckets
    const first3 = sparkline.slice(0, 3).reduce((a, b) => a + b, 0) / 3
    const last3 = sparkline.slice(6).reduce((a, b) => a + b, 0) / 3
    const trend: Issue['trend'] =
      last3 > first3 * 1.5 ? 'increasing' :
      last3 < first3 * 0.5 ? 'decreasing' :
      'stable'

    return {
      key,
      workflowName: g.workflowName,
      stepName: g.stepName,
      errorPattern: g.errorPattern,
      status: stored?.status ?? 'unresolved',
      statusId: stored?.id ?? null,
      count: g.runIds.length,
      firstSeenAt,
      lastSeenAt,
      sparkline,
      runIds: g.runIds,
      trend,
    }
  }).sort((a, b) => b.lastSeenAt - a.lastSeenAt)
}
