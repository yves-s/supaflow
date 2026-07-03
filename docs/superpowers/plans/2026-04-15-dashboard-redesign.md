# Dashboard Redesign — Signal-first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw Errors tab with a grouped Issues view, add data freshness indicators, per-workflow coverage signals, and metric trend deltas — making the dashboard trustworthy at a glance.

**Architecture:** Client-side issue grouping: `fetchIssues()` queries recent failed runs + their steps, groups by `computeErrorPattern(error)` in the browser, and joins with a lightweight `supaflow_issues` table that stores only resolved/ignored status flags. No DB trigger required — the table is purely for UI state persistence. The anon key gets UPDATE permission on `supaflow_issues` only (UI state, not sensitive data).

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS client, `@xyflow/react`, dagre. Test runner: vitest (added in Task 2).

---

## File Map

| File | Change |
|---|---|
| `assets/supaflow_schema.sql` | Add `supaflow_issues` table + RLS |
| `assets/dashboard/package.json` | Add vitest + @vitest/ui + jsdom |
| `assets/dashboard/vite.config.ts` | Add vitest config block |
| `assets/dashboard/src/lib/queries.ts` | Add `fetchIssues`, `fetchCoverage`, extend `fetchMetrics`, add types |
| `assets/dashboard/src/lib/issues.ts` | New: `computeErrorPattern`, `groupIntoIssues`, `buildSparkline` (pure functions) |
| `assets/dashboard/src/lib/issues.test.ts` | New: unit tests for above |
| `assets/dashboard/src/components/IssuesView.tsx` | New: replaces ErrorsView |
| `assets/dashboard/src/components/IssuePanel.tsx` | New: side panel for selected issue |
| `assets/dashboard/src/components/MetricsBar.tsx` | Add freshness indicator + delta row |
| `assets/dashboard/src/components/Sidebar.tsx` | Add coverage dot/triangle + tooltip |
| `assets/dashboard/src/components/TabBar.tsx` | Rename "Errors" → "Issues", update TabId type |
| `assets/dashboard/src/App.tsx` | Auto-refresh, error banner, wire IssuesView, fix badge count |
| `assets/dashboard/src/index.css` | Add classes for new components |

---

## Task 1: DB Migration — `supaflow_issues`

**Files:**
- Modify: `assets/supaflow_schema.sql`

- [ ] **Step 1: Append the new table to the schema file**

Open `assets/supaflow_schema.sql` and append after the existing content:

```sql
-- 5. Issues: status flags for grouped error patterns
create table if not exists supaflow_issues (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  step_name text not null,
  error_pattern text not null,
  status text not null default 'unresolved'
    check (status in ('unresolved', 'resolved', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workflow_name, step_name, error_pattern)
);

create index if not exists idx_supaflow_issues_workflow
  on supaflow_issues(workflow_name);

-- RLS
alter table supaflow_issues enable row level security;

-- Anon: read + update (status flags are UI state, not sensitive)
drop policy if exists "anon read supaflow_issues" on supaflow_issues;
create policy "anon read supaflow_issues" on supaflow_issues for select using (true);

drop policy if exists "anon insert supaflow_issues" on supaflow_issues;
create policy "anon insert supaflow_issues" on supaflow_issues for insert with check (true);

drop policy if exists "anon update supaflow_issues" on supaflow_issues;
create policy "anon update supaflow_issues" on supaflow_issues for update using (true);
```

- [ ] **Step 2: Apply the migration in the target Supabase project**

Via Supabase dashboard SQL editor or CLI:
```bash
# If using Supabase CLI
supabase db push
# Or paste the new block into the SQL editor manually
```

Verify: `select * from supaflow_issues limit 1;` returns no error (table exists).

- [ ] **Step 3: Commit**

```bash
git add assets/supaflow_schema.sql
git commit -m "feat: add supaflow_issues table for issue status persistence"
```

---

## Task 2: Test Setup + Pure Logic Functions

**Files:**
- Modify: `assets/dashboard/package.json`
- Modify: `assets/dashboard/vite.config.ts`
- Create: `assets/dashboard/src/lib/issues.ts`
- Create: `assets/dashboard/src/lib/issues.test.ts`

- [ ] **Step 1: Add vitest to package.json**

In `assets/dashboard/package.json`, add to `devDependencies`:
```json
"vitest": "^1",
"@vitest/ui": "^1",
"jsdom": "^24"
```

Add to `scripts`:
```json
"test": "vitest run",
"test:ui": "vitest --ui"
```

Then install:
```bash
cd assets/dashboard && npm install
```

- [ ] **Step 2: Add vitest config to vite.config.ts**

Current content of `assets/dashboard/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Replace with:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 3: Write the failing tests first**

Create `assets/dashboard/src/lib/issues.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeErrorPattern, buildSparklineBuckets } from './issues'

describe('computeErrorPattern', () => {
  it('replaces 4+ digit sequences with <ID>', () => {
    expect(computeErrorPattern('Failed subscriptions: 680935167'))
      .toBe('Failed subscriptions: <ID>')
  })

  it('replaces multiple IDs in one message', () => {
    expect(computeErrorPattern('Failed subscriptions: 680935167, 416655910'))
      .toBe('Failed subscriptions: <ID>, <ID>')
  })

  it('does not replace 1-3 digit numbers', () => {
    expect(computeErrorPattern('Retry 3 of 10 failed'))
      .toBe('Retry 3 of 10 failed')
  })

  it('replaces UUID-format tokens', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(computeErrorPattern(`Record ${uuid} not found`))
      .toBe('Record <UUID> not found')
  })

  it('returns unchanged string when no IDs present', () => {
    expect(computeErrorPattern('Timeout: upstream service unreachable'))
      .toBe('Timeout: upstream service unreachable')
  })
})

describe('buildSparklineBuckets', () => {
  it('returns 9 buckets', () => {
    const now = Date.now()
    const buckets = buildSparklineBuckets([], now)
    expect(buckets).toHaveLength(9)
  })

  it('counts timestamps into correct buckets', () => {
    const now = new Date('2026-01-01T09:00:00Z').getTime()
    // 24h ago = 2025-12-31T09:00:00Z. Bucket 0 = 0-2h40m ago from 24h back.
    // One event 1h ago from "now" = falls in the last bucket (bucket 8)
    const oneHourAgo = now - 60 * 60 * 1000
    const buckets = buildSparklineBuckets([oneHourAgo], now)
    expect(buckets[8]).toBe(1)
    expect(buckets.slice(0, 8).every(b => b === 0)).toBe(true)
  })

  it('scales relative to max bucket', () => {
    const now = Date.now()
    const recent = now - 60 * 60 * 1000 // 1h ago → bucket 8
    const buckets = buildSparklineBuckets([recent, recent, recent], now)
    expect(buckets[8]).toBe(3)
  })
})
```

- [ ] **Step 4: Run tests — verify they fail**

```bash
cd assets/dashboard && npm test
```

Expected: FAIL — `computeErrorPattern` and `buildSparklineBuckets` not defined.

- [ ] **Step 5: Implement the pure functions**

Create `assets/dashboard/src/lib/issues.ts`:

```ts
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
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
cd assets/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add assets/dashboard/package.json assets/dashboard/vite.config.ts \
  assets/dashboard/src/lib/issues.ts assets/dashboard/src/lib/issues.test.ts \
  assets/dashboard/package-lock.json
git commit -m "feat: add issue grouping logic with vitest"
```

---

## Task 3: New & Extended Query Functions

**Files:**
- Modify: `assets/dashboard/src/lib/queries.ts`

- [ ] **Step 1: Add types for issues and coverage**

At the top of `queries.ts`, add after the existing `Metrics` interface:

```ts
export interface IssueSummary {
  id: string
  workflow_name: string
  step_name: string
  error_pattern: string
  status: 'unresolved' | 'resolved' | 'ignored'
}

export interface CoverageEntry {
  workflow_name: string
  lastActivityAt: number | null // ms, null if no steps at all
  knownStepCount: number
}
```

- [ ] **Step 2: Extend `fetchMetrics` to accept an optional time window**

Replace the existing `fetchMetrics` function with:

```ts
export async function fetchMetrics(
  workflowName?: string,
  from?: Date,
  to?: Date
): Promise<Metrics> {
  let runsQuery = supabase.from("workflow_runs").select("status, duration_ms, started_at");
  if (workflowName) runsQuery = runsQuery.eq("workflow_name", workflowName);
  if (from) runsQuery = runsQuery.gte("started_at", from.toISOString());
  if (to) runsQuery = runsQuery.lte("started_at", to.toISOString());

  let dlqQuery = supabase
    .from("dead_letter_queue")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);
  if (workflowName) dlqQuery = dlqQuery.eq("workflow_name", workflowName);

  const [runsResult, dlqResult] = await Promise.all([runsQuery, dlqQuery]);

  const runs = runsResult.data ?? [];
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const runningCount = runs.filter((r) => r.status === "running").length;
  const successRate =
    totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

  const durations = runs
    .filter((r) => r.duration_ms != null)
    .map((r) => r.duration_ms as number);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const dlqCount = dlqResult.count ?? 0;
  return { totalRuns, successRate, avgDurationMs, dlqCount, runningCount };
}
```

- [ ] **Step 3: Add `fetchIssueStatuses`**

Append to `queries.ts`:

```ts
/** Reads persisted issue status flags from supaflow_issues. */
export async function fetchIssueStatuses(
  workflowName?: string
): Promise<IssueSummary[]> {
  let query = supabase.from("supaflow_issues").select("*");
  if (workflowName) query = query.eq("workflow_name", workflowName);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as IssueSummary[];
}

/** Upserts an issue status record. Creates row if it doesn't exist yet. */
export async function upsertIssueStatus(
  issue: Pick<IssueSummary, 'workflow_name' | 'step_name' | 'error_pattern' | 'status'>
): Promise<void> {
  const { error } = await supabase
    .from("supaflow_issues")
    .upsert(
      { ...issue, updated_at: new Date().toISOString() },
      { onConflict: 'workflow_name,step_name,error_pattern' }
    );
  if (error) throw error;
}
```

- [ ] **Step 4: Add `fetchFailedStepsForIssues`**

Append to `queries.ts`:

```ts
export interface FailedStepRaw {
  runId: string
  workflowName: string
  stepName: string
  error: string
  startedAt: number // ms
}

/**
 * Fetches failed steps from the last 7 days for issue grouping.
 * Returns lightweight records — only the fields needed by groupIntoIssues().
 */
export async function fetchFailedStepsForIssues(
  workflowName?: string
): Promise<FailedStepRaw[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let runsQuery = supabase
    .from("workflow_runs")
    .select("id, workflow_name, started_at")
    .eq("status", "failed")
    .gte("started_at", sevenDaysAgo)
    .order("started_at", { ascending: false })
    .limit(500);
  if (workflowName) runsQuery = runsQuery.eq("workflow_name", workflowName);

  const { data: runs, error: runsErr } = await runsQuery;
  if (runsErr) throw runsErr;
  if (!runs || runs.length === 0) return [];

  const runIds = runs.map(r => r.id);
  const runMeta = new Map(runs.map(r => [r.id, r]));

  const { data: steps, error: stepsErr } = await supabase
    .from("step_states")
    .select("run_id, step_name, error")
    .in("run_id", runIds)
    .eq("status", "failed")
    .not("error", "is", null);
  if (stepsErr) throw stepsErr;

  return (steps ?? [])
    .filter(s => s.error)
    .map(s => {
      const run = runMeta.get(s.run_id)!;
      return {
        runId: s.run_id,
        workflowName: run.workflow_name,
        stepName: s.step_name,
        error: s.error as string,
        startedAt: new Date(run.started_at).getTime(),
      };
    });
}
```

- [ ] **Step 5: Add `fetchCoverage`**

Append to `queries.ts`:

```ts
/**
 * For each workflow, returns the last step activity timestamp and known step count.
 * Used to show coverage indicators in the sidebar.
 */
export async function fetchCoverage(
  workflowNames: string[]
): Promise<CoverageEntry[]> {
  if (workflowNames.length === 0) return [];

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get last activity per workflow via run join
  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("id, workflow_name")
    .in("workflow_name", workflowNames);

  if (!runs || runs.length === 0) {
    return workflowNames.map(wf => ({ workflow_name: wf, lastActivityAt: null, knownStepCount: 0 }));
  }

  const runIds = runs.map(r => r.id);
  const runToWorkflow = new Map(runs.map(r => [r.id, r.workflow_name]));

  const { data: steps } = await supabase
    .from("step_states")
    .select("run_id, started_at")
    .in("run_id", runIds)
    .order("started_at", { ascending: false });

  const activityMap = new Map<string, { lastAt: number; count: number }>();
  for (const wf of workflowNames) activityMap.set(wf, { lastAt: 0, count: 0 });

  for (const step of steps ?? []) {
    const wf = runToWorkflow.get(step.run_id);
    if (!wf) continue;
    const entry = activityMap.get(wf)!;
    const ts = new Date(step.started_at).getTime();
    if (ts > entry.lastAt) entry.lastAt = ts;
    entry.count++;
  }

  return workflowNames.map(wf => {
    const entry = activityMap.get(wf)!;
    return {
      workflow_name: wf,
      lastActivityAt: entry.lastAt > 0 ? entry.lastAt : null,
      knownStepCount: entry.count,
    };
  });
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd assets/dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add assets/dashboard/src/lib/queries.ts
git commit -m "feat: add fetchIssueStatuses, fetchFailedStepsForIssues, fetchCoverage, extend fetchMetrics"
```

---

## Task 4: CSS — New Classes

**Files:**
- Modify: `assets/dashboard/src/index.css`

- [ ] **Step 1: Append new CSS classes**

Append to the end of `assets/dashboard/src/index.css`:

```css
/* ── Issues view ──────────────────────────────────────────────────── */
.issues-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
  flex-shrink: 0;
}

.issues-search {
  flex: 1;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  outline: none;
}
.issues-search::placeholder { color: var(--text-muted); }
.issues-search:focus { border-color: var(--accent-indigo); }

.filter-chip {
  padding: 4px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 150ms ease;
  user-select: none;
}
.filter-chip:hover { color: var(--text-primary); background: var(--bg-hover); }
.filter-chip.active {
  background: var(--status-failed-bg);
  border-color: var(--status-failed-border);
  color: var(--status-failed);
}
.filter-chip.active.ignored { background: var(--bg-hover); border-color: var(--border); color: var(--text-secondary); }
.filter-chip.active.resolved { background: var(--status-completed-bg); border-color: var(--status-completed-border); color: var(--status-completed); }

.issues-section-label {
  padding: 8px 20px 5px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.issue-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 150ms ease;
}
.issue-row:hover { background: var(--bg-card); }
.issue-row.selected { background: var(--bg-selected); }

.issue-accent {
  width: 3px;
  min-height: 50px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-top: 2px;
}
.issue-accent.unresolved { background: var(--status-failed); }
.issue-accent.resolved { background: var(--status-completed); }
.issue-accent.ignored { background: var(--status-pending); }

.issue-body { flex: 1; min-width: 0; }

.issue-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 3px;
}

.issue-title.resolved { color: var(--text-secondary); text-decoration: line-through; }
.issue-title.ignored { color: var(--text-muted); }

.issue-sub {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  margin-bottom: 8px;
}

.issue-meta {
  display: flex;
  align-items: center;
  gap: 14px;
}
.issue-meta-item { font-size: 11px; color: var(--text-muted); }
.issue-meta-item.trend-up { color: var(--status-failed); }
.issue-meta-item.trend-down { color: var(--status-completed); }

.issue-count-badge {
  font-size: 11px;
  font-family: var(--font-mono);
  padding: 2px 7px;
  border-radius: 3px;
  font-weight: 700;
  background: var(--status-failed-bg);
  color: var(--status-failed);
}

.issue-right {
  text-align: right;
  flex-shrink: 0;
  padding-top: 2px;
}
.issue-time { font-size: 11px; color: var(--text-secondary); }
.issue-first { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

/* Sparkline */
.sparkline {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 18px;
}
.sparkline-bar {
  width: 4px;
  border-radius: 1px;
  min-height: 2px;
  background: var(--status-failed);
  opacity: 0.3;
  transition: opacity 150ms ease;
}
.sparkline-bar.active { opacity: 1; }

/* Status badges */
.issue-status-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
  white-space: nowrap;
}
.issue-status-badge.unresolved {
  color: var(--status-failed);
  background: var(--status-failed-bg);
  border-color: var(--status-failed-border);
}
.issue-status-badge.resolved {
  color: var(--status-completed);
  background: var(--status-completed-bg);
  border-color: var(--status-completed-border);
}
.issue-status-badge.ignored {
  color: var(--status-pending);
  background: var(--status-pending-bg);
  border-color: var(--status-pending-border);
}

/* ── Issue side panel ─────────────────────────────────────────────── */
.issue-panel {
  width: 340px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.issue-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 8px;
}
.issue-panel-title {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.issue-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.issue-panel-section { display: flex; flex-direction: column; gap: 6px; }
.issue-panel-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
}
.issue-panel-value { font-size: 12px; color: var(--text-primary); }

.run-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 3px;
  cursor: pointer;
  transition: background 150ms ease;
  width: 100%;
  text-align: left;
  font-family: var(--font-sans);
}
.run-link:hover { background: var(--bg-hover); }
.run-link-id { font-family: var(--font-mono); color: var(--text-secondary); flex: 1; font-size: 11px; }
.run-link-time { font-size: 11px; color: var(--text-muted); }
.run-link-arrow { color: var(--accent-indigo); font-size: 11px; }

.issue-actions { display: flex; gap: 8px; }
.issue-action-btn {
  flex: 1;
  padding: 8px;
  border-radius: var(--radius-md);
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 150ms ease;
  font-family: var(--font-sans);
}
.issue-action-btn.resolve {
  background: var(--status-completed-bg);
  border: 1px solid var(--status-completed-border);
  color: var(--status-completed);
}
.issue-action-btn.resolve:hover { background: #10b98120; }
.issue-action-btn.ignore {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.issue-action-btn.ignore:hover { color: var(--text-primary); background: var(--bg-active); }
.issue-action-btn.reopen {
  background: var(--status-failed-bg);
  border: 1px solid var(--status-failed-border);
  color: var(--status-failed);
}
.issue-action-btn.reopen:hover { background: #ef444420; }

/* ── Freshness indicator ──────────────────────────────────────────── */
.freshness-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border-left: 1px solid var(--border);
  flex-shrink: 0;
}
.freshness-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.freshness-dot.fresh { background: var(--status-completed); animation: pulse 2s infinite; }
.freshness-dot.stale { background: var(--text-muted); }
.freshness-text { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.freshness-refresh {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 13px;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  line-height: 1;
  transition: color 150ms ease;
}
.freshness-refresh:hover { color: var(--text-primary); }

/* Stale data banner */
.stale-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: var(--status-running-bg);
  border-bottom: 1px solid var(--status-running-border);
  font-size: 12px;
  color: var(--status-running);
  flex-shrink: 0;
}

/* Metric delta */
.metric-delta {
  font-size: 11px;
  font-weight: 500;
  margin-top: 2px;
}
.metric-delta.positive { color: var(--status-completed); }
.metric-delta.negative { color: var(--status-failed); }
.metric-delta.neutral { color: var(--text-muted); }

/* ── Coverage indicator (sidebar) ────────────────────────────────── */
.coverage-icon {
  font-size: 10px;
  flex-shrink: 0;
  position: relative;
  cursor: default;
}
.coverage-icon.ok { color: var(--status-completed); }
.coverage-icon.warn { color: var(--status-running); }

.coverage-tooltip {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
  display: none;
}
.coverage-icon:hover .coverage-tooltip { display: block; }

/* Issues view layout */
.issues-content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.issues-list-pane {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/dashboard/src/index.css
git commit -m "feat: add CSS classes for issues view, panels, freshness, coverage"
```

---

## Task 5: `IssuesView.tsx` + `IssuePanel.tsx`

**Files:**
- Create: `assets/dashboard/src/components/IssuesView.tsx`
- Create: `assets/dashboard/src/components/IssuePanel.tsx`

- [ ] **Step 1: Create `IssuePanel.tsx`**

Create `assets/dashboard/src/components/IssuePanel.tsx`:

```tsx
import { useState } from "react";
import type { Issue, IssueStatus } from "../lib/issues";
import { upsertIssueStatus } from "../lib/queries";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface IssuePanelProps {
  issue: Issue;
  onClose: () => void;
  onStatusChange: (key: string, status: IssueStatus) => void;
  onSelectRun: (runId: string) => void;
}

export default function IssuePanel({ issue, onClose, onStatusChange, onSelectRun }: IssuePanelProps) {
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(newStatus: IssueStatus) {
    setSaving(true);
    try {
      await upsertIssueStatus({
        workflow_name: issue.workflowName,
        step_name: issue.stepName,
        error_pattern: issue.errorPattern,
        status: newStatus,
      });
      onStatusChange(issue.key, newStatus);
    } catch (e) {
      console.error("Failed to update issue status", e);
    } finally {
      setSaving(false);
    }
  }

  const visibleRuns = issue.runIds.slice(0, 5);
  const hiddenCount = issue.runIds.length - visibleRuns.length;

  return (
    <aside className="issue-panel">
      <div className="issue-panel-header">
        <span className="issue-panel-title">{issue.errorPattern}</span>
        <button className="detail-panel-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="issue-panel-body">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`issue-status-badge ${issue.status}`}>{issue.status}</span>
          <span className="issue-count-badge">{issue.count}×</span>
          {issue.trend === "increasing" && (
            <span style={{ fontSize: 11, color: "var(--status-failed)" }}>↑ zunehmend</span>
          )}
        </div>

        <div className="issue-panel-section">
          <div className="issue-panel-label">Step</div>
          <div className="issue-panel-value" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {issue.stepName}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div className="issue-panel-section" style={{ flex: 1 }}>
            <div className="issue-panel-label">Zuerst gesehen</div>
            <div className="issue-panel-value" style={{ fontSize: 11 }}>{timeAgo(issue.firstSeenAt)}</div>
          </div>
          <div className="issue-panel-section" style={{ flex: 1 }}>
            <div className="issue-panel-label">Zuletzt</div>
            <div className="issue-panel-value" style={{ fontSize: 11 }}>{timeAgo(issue.lastSeenAt)}</div>
          </div>
        </div>

        <div className="issue-panel-section">
          <div className="issue-panel-label">Fehlermuster</div>
          <pre className="detail-code error-block">{issue.errorPattern}</pre>
        </div>

        <div className="issue-panel-section">
          <div className="issue-panel-label">
            Betroffene Runs ({issue.runIds.length})
          </div>
          {visibleRuns.map((runId) => (
            <button
              key={runId}
              className="run-link"
              onClick={() => onSelectRun(runId)}
            >
              <div className="status-dot failed" />
              <span className="run-link-id">{runId.slice(0, 8)}</span>
              <span className="run-link-arrow">Im Flow →</span>
            </button>
          ))}
          {hiddenCount > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>
              + {hiddenCount} weitere
            </div>
          )}
        </div>

        <div className="issue-actions">
          {issue.status !== "resolved" && (
            <button
              className="issue-action-btn resolve"
              onClick={() => handleStatusChange("resolved")}
              disabled={saving}
            >
              Als gelöst markieren
            </button>
          )}
          {issue.status === "resolved" && (
            <button
              className="issue-action-btn reopen"
              onClick={() => handleStatusChange("unresolved")}
              disabled={saving}
            >
              Wieder öffnen
            </button>
          )}
          {issue.status !== "ignored" && (
            <button
              className="issue-action-btn ignore"
              onClick={() => handleStatusChange("ignored")}
              disabled={saving}
            >
              Ignorieren
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create `IssuesView.tsx`**

Create `assets/dashboard/src/components/IssuesView.tsx`:

```tsx
import { useState, useMemo } from "react";
import type { Issue, IssueStatus } from "../lib/issues";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Sparkline({ buckets }: { buckets: number[] }) {
  const max = Math.max(...buckets, 1);
  return (
    <div className="sparkline">
      {buckets.map((count, i) => (
        <div
          key={i}
          className={`sparkline-bar${count > 0 ? " active" : ""}`}
          style={{ height: `${Math.max(2, (count / max) * 18)}px` }}
          title={`${count} occurrences`}
        />
      ))}
    </div>
  );
}

type FilterStatus = "unresolved" | "ignored" | "resolved";

interface IssuesViewProps {
  issues: Issue[];
  loading: boolean;
  selectedIssueKey: string | null;
  onSelectIssue: (key: string) => void;
  onStatusChange: (key: string, status: IssueStatus) => void;
}

export default function IssuesView({
  issues,
  loading,
  selectedIssueKey,
  onSelectIssue,
  onStatusChange,
}: IssuesViewProps) {
  const [filter, setFilter] = useState<FilterStatus>("unresolved");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (issue.status !== filter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        issue.errorPattern.toLowerCase().includes(q) ||
        issue.workflowName.toLowerCase().includes(q)
      );
    });
  }, [issues, filter, search]);

  if (loading) {
    return (
      <div className="issues-list-pane">
        <div className="issues-toolbar">
          <div className="skeleton skeleton-line w-xl" style={{ height: 28, borderRadius: 6 }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div className="skeleton-row" key={i} style={{ padding: "14px 20px", gap: 12 }}>
            <div className="skeleton" style={{ width: 3, height: 50, borderRadius: 2 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skeleton skeleton-line w-lg" />
              <div className="skeleton skeleton-line w-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const unresolvedCount = issues.filter(i => i.status === "unresolved").length;
  const ignoredCount = issues.filter(i => i.status === "ignored").length;
  const resolvedCount = issues.filter(i => i.status === "resolved").length;

  return (
    <div className="issues-list-pane">
      <div className="issues-toolbar">
        <input
          className="issues-search"
          type="text"
          placeholder="Issues suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          className={`filter-chip${filter === "unresolved" ? " active" : ""}`}
          onClick={() => setFilter("unresolved")}
        >
          Unresolved{unresolvedCount > 0 && ` (${unresolvedCount})`}
        </div>
        <div
          className={`filter-chip${filter === "ignored" ? " active ignored" : ""}`}
          onClick={() => setFilter("ignored")}
        >
          Ignored{ignoredCount > 0 && ` (${ignoredCount})`}
        </div>
        <div
          className={`filter-chip${filter === "resolved" ? " active resolved" : ""}`}
          onClick={() => setFilter("resolved")}
        >
          Resolved{resolvedCount > 0 && ` (${resolvedCount})`}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ color: "var(--status-completed)" }}>✓</div>
          <div className="empty-state-title">Keine {filter} Issues</div>
          <div className="empty-state-sub">
            {filter === "unresolved"
              ? "Alles in Ordnung — keine aktiven Fehler"
              : `Keine als "${filter}" markierten Issues`}
          </div>
        </div>
      ) : (
        <>
          <div className="issues-section-label">
            {filtered.length} {filter} Issue{filtered.length !== 1 ? "s" : ""}
          </div>
          {filtered.map((issue) => (
            <div
              key={issue.key}
              className={`issue-row${selectedIssueKey === issue.key ? " selected" : ""}`}
              onClick={() => onSelectIssue(issue.key)}
            >
              <div className={`issue-accent ${issue.status}`} />
              <div className="issue-body">
                <div className={`issue-title ${issue.status !== "unresolved" ? issue.status : ""}`}>
                  {issue.errorPattern}
                  <span className="issue-count-badge">{issue.count}×</span>
                  <span className={`issue-status-badge ${issue.status}`}>{issue.status}</span>
                </div>
                <div className="issue-sub">
                  {issue.workflowName} › {issue.stepName}
                </div>
                <div className="issue-meta">
                  <Sparkline buckets={issue.sparkline} />
                  <span className="issue-meta-item">
                    seit {timeAgo(issue.firstSeenAt)}
                  </span>
                  {issue.trend === "increasing" && (
                    <span className="issue-meta-item trend-up">↑ zunehmend</span>
                  )}
                  {issue.trend === "decreasing" && (
                    <span className="issue-meta-item trend-down">↓ rückläufig</span>
                  )}
                </div>
              </div>
              <div className="issue-right">
                <div className="issue-time">{timeAgo(issue.lastSeenAt)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd assets/dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add assets/dashboard/src/components/IssuesView.tsx \
  assets/dashboard/src/components/IssuePanel.tsx
git commit -m "feat: add IssuesView and IssuePanel components"
```

---

## Task 6: `MetricsBar.tsx` — Freshness + Trend Deltas

**Files:**
- Modify: `assets/dashboard/src/components/MetricsBar.tsx`

- [ ] **Step 1: Replace `MetricsBar.tsx`**

Replace the entire file with:

```tsx
import type { Metrics } from "../lib/queries";

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `vor ${s}s`;
  return `vor ${Math.floor(s / 60)}m`;
}

interface MetricDelta {
  successRate: number | null;
  totalRuns: number | null;
  avgDurationMs: number | null;
}

interface MetricsBarProps {
  metrics: Metrics | null;
  yesterdayMetrics: Metrics | null;
  loading?: boolean;
  lastFetchedAt: number | null; // ms timestamp, null = never loaded
  fetchError: boolean;
  onRefresh: () => void;
}

export default function MetricsBar({
  metrics,
  yesterdayMetrics,
  loading,
  lastFetchedAt,
  fetchError,
  onRefresh,
}: MetricsBarProps) {
  const ph = "—";
  const isFresh = lastFetchedAt !== null && Date.now() - lastFetchedAt < 30_000;

  const delta: MetricDelta = {
    successRate:
      metrics && yesterdayMetrics
        ? metrics.successRate - yesterdayMetrics.successRate
        : null,
    totalRuns:
      metrics && yesterdayMetrics
        ? metrics.totalRuns - yesterdayMetrics.totalRuns
        : null,
    avgDurationMs:
      metrics && yesterdayMetrics
        ? metrics.avgDurationMs - yesterdayMetrics.avgDurationMs
        : null,
  };

  function renderDelta(value: number | null, higherIsBetter: boolean, unit = "") {
    if (value === null || Math.abs(value) < 0.5) return null;
    const positive = value > 0;
    const good = higherIsBetter ? positive : !positive;
    const sign = positive ? "+" : "";
    return (
      <div className={`metric-delta ${good ? "positive" : "negative"}`}>
        {sign}{value > 0 ? "↑" : "↓"} {Math.abs(Math.round(value))}{unit} vs. gestern
      </div>
    );
  }

  return (
    <div className="metrics-bar">
      <div className="metric-card">
        <div className="metric-value white">{loading ? ph : String(metrics?.totalRuns ?? 0)}</div>
        <div className="metric-label">Total Runs</div>
        {renderDelta(delta.totalRuns, true, "")}
      </div>
      <div className="metric-card">
        <div className="metric-value green">{loading ? ph : `${metrics?.successRate ?? 0}%`}</div>
        <div className="metric-label">Success Rate</div>
        {renderDelta(delta.successRate, true, "%")}
      </div>
      <div className="metric-card">
        <div className="metric-value white">{loading ? ph : formatDuration(metrics?.avgDurationMs ?? 0)}</div>
        <div className="metric-label">Avg Duration</div>
        {renderDelta(delta.avgDurationMs, false, "ms")}
      </div>
      <div className="metric-card">
        <div className="metric-value red">{loading ? ph : String(metrics?.dlqCount ?? 0)}</div>
        <div className="metric-label">DLQ Entries</div>
      </div>
      <div className="metric-card">
        <div className="metric-value amber">{loading ? ph : String(metrics?.runningCount ?? 0)}</div>
        <div className="metric-label">Running</div>
      </div>

      {/* Freshness indicator */}
      <div className="freshness-indicator">
        <div className={`freshness-dot ${isFresh ? "fresh" : "stale"}`} />
        <span className="freshness-text">
          {lastFetchedAt ? timeAgo(lastFetchedAt) : "nie geladen"}
        </span>
        <button
          className="freshness-refresh"
          onClick={onRefresh}
          title="Jetzt aktualisieren"
          aria-label="Refresh"
        >
          ↺
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd assets/dashboard && npx tsc --noEmit
```

Expected: errors in `App.tsx` because `MetricsBar` props changed — that's fine, will be fixed in Task 8.

- [ ] **Step 3: Commit**

```bash
git add assets/dashboard/src/components/MetricsBar.tsx
git commit -m "feat: add freshness indicator and trend deltas to MetricsBar"
```

---

## Task 7: `Sidebar.tsx` — Coverage Indicator

**Files:**
- Modify: `assets/dashboard/src/components/Sidebar.tsx`

- [ ] **Step 1: Add coverage props and indicator to `Sidebar.tsx`**

Replace the entire file:

```tsx
import type { WorkflowSummary, Run, CoverageEntry } from "../lib/queries";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function successRateColor(rate: number): "green" | "amber" | "red" {
  if (rate >= 80) return "green";
  if (rate >= 50) return "amber";
  return "red";
}

function CoverageIcon({ entry }: { entry: CoverageEntry | undefined }) {
  if (!entry) return null;

  const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;
  const hasEnoughHistory = entry.knownStepCount >= 3;

  if (!hasEnoughHistory) return null; // new workflow, insufficient history

  const isActive = entry.lastActivityAt !== null && Date.now() - entry.lastActivityAt < TWENTY_FOUR_H;
  const tooltipText = entry.lastActivityAt
    ? `Letzter Step ${timeAgo(new Date(entry.lastActivityAt).toISOString())} · ${entry.knownStepCount} bekannte Steps`
    : `Keine Steps erfasst · ${entry.knownStepCount} bekannte Steps`;

  return (
    <div className={`coverage-icon ${isActive ? "ok" : "warn"}`}>
      {isActive ? "●" : "▲"}
      <div className="coverage-tooltip">{tooltipText}</div>
    </div>
  );
}

interface SidebarProps {
  workflows: WorkflowSummary[];
  runs: Run[];
  selectedRunId: string | null;
  selectedWorkflow: string | null;
  onSelectRun: (id: string) => void;
  onSelectWorkflow: (name: string | null) => void;
  loadingWorkflows?: boolean;
  loadingRuns?: boolean;
  coverage: CoverageEntry[];
}

export default function Sidebar({
  workflows, runs, selectedRunId, selectedWorkflow,
  onSelectRun, onSelectWorkflow,
  loadingWorkflows, loadingRuns, coverage,
}: SidebarProps) {
  const coverageMap = new Map(coverage.map(c => [c.workflow_name, c]));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">S</div>
          <span className="sidebar-logo-text">Supaflow</span>
        </div>
      </div>

      <div className="sidebar-section" style={{ maxHeight: "40%", flexShrink: 0 }}>
        <div className="sidebar-section-label">Workflows</div>
        {loadingWorkflows ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>Loading…</div>
        ) : workflows.length === 0 ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>No workflows found</div>
        ) : (
          <>
            <div
              className={`sidebar-item${selectedWorkflow === null ? " active" : ""}`}
              onClick={() => onSelectWorkflow(null)}
            >
              <div className="sidebar-item-main">
                <div className="sidebar-item-name">All workflows</div>
              </div>
            </div>
            {workflows.map((wf) => (
              <div
                key={wf.workflow_name}
                className={`sidebar-item${selectedWorkflow === wf.workflow_name ? " active" : ""}`}
                onClick={() => onSelectWorkflow(wf.workflow_name)}
              >
                <div className="sidebar-item-main">
                  <div className="sidebar-item-name">{wf.workflow_name}</div>
                  <div className="sidebar-item-meta">{wf.total_runs} runs</div>
                </div>
                <span className={`sidebar-item-badge ${successRateColor(wf.success_rate)}`}>
                  {wf.success_rate}%
                </span>
                <CoverageIcon entry={coverageMap.get(wf.workflow_name)} />
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Recent Runs</div>
        {loadingRuns ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>No runs found</div>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className={`sidebar-item${selectedRunId === run.id ? " active" : ""}`}
              onClick={() => onSelectRun(run.id)}
            >
              <div className={`status-dot ${run.status}`} />
              <div className="sidebar-item-main">
                <div className="sidebar-item-name">{run.workflow_name}</div>
                <div className="sidebar-item-meta">
                  {timeAgo(run.started_at)}
                  {run.duration_ms != null && (
                    <span style={{ marginLeft: 6 }}>{formatDuration(run.duration_ms)}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/dashboard/src/components/Sidebar.tsx
git commit -m "feat: add coverage indicator to Sidebar"
```

---

## Task 8: `TabBar.tsx` + `App.tsx` — Wiring Everything Together

**Files:**
- Modify: `assets/dashboard/src/components/TabBar.tsx`
- Modify: `assets/dashboard/src/App.tsx`

- [ ] **Step 1: Update `TabBar.tsx`**

Replace the entire file:

```tsx
export type TabId = "flow" | "issues" | "logs";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  issueCount: number; // unresolved issue count
}

export default function TabBar({ activeTab, onTabChange, issueCount }: TabBarProps) {
  return (
    <div className="tab-bar">
      <button
        className={`tab-item${activeTab === "flow" ? " active" : ""}`}
        onClick={() => onTabChange("flow")}
      >
        Flow
      </button>
      <button
        className={`tab-item${activeTab === "issues" ? " active" : ""}`}
        onClick={() => onTabChange("issues")}
      >
        Issues
        {issueCount > 0 && <span className="tab-count red">{issueCount}</span>}
      </button>
      <button
        className={`tab-item${activeTab === "logs" ? " active" : ""}`}
        onClick={() => onTabChange("logs")}
      >
        Logs
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `App.tsx`**

Replace the entire file with the updated version that wires up all new components. Key changes from current `App.tsx`:

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import Sidebar from "./components/Sidebar";
import MetricsBar from "./components/MetricsBar";
import TabBar, { type TabId } from "./components/TabBar";
import FlowGraph from "./components/FlowGraph";
import DetailPanel from "./components/DetailPanel";
import IssuesView from "./components/IssuesView";
import IssuePanel from "./components/IssuePanel";
import LogsView from "./components/LogsView";
import {
  fetchWorkflows, fetchRuns, fetchSteps, fetchMetrics,
  fetchDlqEntries, fetchAllSteps, fetchIssueStatuses,
  fetchFailedStepsForIssues, fetchCoverage,
  type WorkflowSummary, type Run, type Step,
  type Metrics, type DlqEntry, type StepWithWorkflow, type CoverageEntry,
} from "./lib/queries";
import { groupIntoIssues, type Issue, type IssueStatus } from "./lib/issues";
import { buildGraph } from "./lib/graph";
import type { StepNodeData } from "./components/StepNode";

const REFRESH_INTERVAL_MS = 30_000;

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "--";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function App() {
  // Selection state
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("issues");

  // Data state
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [yesterdayMetrics, setYesterdayMetrics] = useState<Metrics | null>(null);
  const [dlqEntries, setDlqEntries] = useState<DlqEntry[]>([]);
  const [allSteps, setAllSteps] = useState<StepWithWorkflow[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [coverage, setCoverage] = useState<CoverageEntry[]>([]);

  // Freshness state
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Loading state
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Graph state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Ref to avoid stale closures in interval
  const refreshRef = useRef<() => void>(() => {});

  // ── Core data fetch ────────────────────────────────────────────────
  const fetchCoreData = useCallback(async () => {
    try {
      setFetchError(false);
      const [wfData, runsData] = await Promise.all([
        fetchWorkflows(),
        fetchRuns(selectedWorkflow ?? undefined),
      ]);
      setWorkflows(wfData);
      setRuns(runsData);

      // Trend: current window + same window yesterday
      const now = new Date();
      const todayStart = new Date(now.getTime() - now.getHours() * 3_600_000 - now.getMinutes() * 60_000);
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 3_600_000);
      const yesterdayEnd = new Date(todayStart.getTime());

      const [m, ym] = await Promise.all([
        fetchMetrics(selectedWorkflow ?? undefined),
        fetchMetrics(selectedWorkflow ?? undefined, yesterdayStart, yesterdayEnd),
      ]);
      setMetrics(m);
      setYesterdayMetrics(ym);

      // Coverage
      if (wfData.length > 0) {
        const cov = await fetchCoverage(wfData.map(w => w.workflow_name));
        setCoverage(cov);
      }

      setLastFetchedAt(Date.now());
    } catch (err) {
      console.error("Refresh failed", err);
      setFetchError(true);
    }
  }, [selectedWorkflow]);

  refreshRef.current = fetchCoreData;

  // Initial load
  useEffect(() => {
    setLoadingWorkflows(true);
    setLoadingRuns(true);
    fetchCoreData().finally(() => {
      setLoadingWorkflows(false);
      setLoadingRuns(false);
    });
  }, [fetchCoreData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => refreshRef.current(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Issues tab data
  const loadIssues = useCallback(async () => {
    setLoadingIssues(true);
    try {
      const [rawSteps, statuses] = await Promise.all([
        fetchFailedStepsForIssues(selectedWorkflow ?? undefined),
        fetchIssueStatuses(selectedWorkflow ?? undefined),
      ]);
      setIssues(groupIntoIssues(rawSteps, statuses));
    } catch (err) {
      console.error("Failed to load issues", err);
    } finally {
      setLoadingIssues(false);
    }
  }, [selectedWorkflow]);

  useEffect(() => {
    if (activeTab === "issues") loadIssues();
    if (activeTab === "logs") {
      setLoadingLogs(true);
      fetchAllSteps(selectedWorkflow ?? undefined)
        .then(setAllSteps)
        .catch(console.error)
        .finally(() => setLoadingLogs(false));
    }
  }, [activeTab, selectedWorkflow, loadIssues]);

  // Steps when run selected
  useEffect(() => {
    if (!selectedRunId) { setSteps([]); setNodes([]); setEdges([]); setSelectedStepId(null); return; }
    setLoadingSteps(true);
    setSelectedStepId(null);
    Promise.allSettled([fetchSteps(selectedRunId), fetchDlqEntries({ runId: selectedRunId })])
      .then(([stepsResult, dlqResult]) => {
        const fetchedSteps = stepsResult.status === "fulfilled" ? stepsResult.value : [];
        if (dlqResult.status === "fulfilled") setDlqEntries(dlqResult.value);
        setSteps(fetchedSteps);
        const { nodes: n, edges: e } = buildGraph(fetchedSteps);
        setNodes(n);
        setEdges(e);
      })
      .finally(() => setLoadingSteps(false));
  }, [selectedRunId]);

  // Handlers
  const handleSelectWorkflow = useCallback((name: string | null) => setSelectedWorkflow(name), []);
  const handleSelectRun = useCallback((id: string) => { setSelectedRunId(id); setActiveTab("flow"); }, []);
  const handleNodeClick: NodeMouseHandler = useCallback((_e, node) => setSelectedStepId(node.id), []);
  const handleCloseDetail = useCallback(() => setSelectedStepId(null), []);

  const handleIssueStatusChange = useCallback((key: string, status: IssueStatus) => {
    setIssues(prev => prev.map(i => i.key === key ? { ...i, status } : i));
  }, []);

  const handleIssueSelectRun = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setActiveTab("flow");
    setSelectedIssueKey(null);
  }, []);

  const handleLogStepClick = useCallback((step: StepWithWorkflow) => {
    setSelectedStepId(step.id);
    setNodes(prev => {
      const exists = prev.find(n => n.id === step.id);
      if (exists) return prev;
      return [...prev, {
        id: step.id, type: "step", position: { x: 0, y: 0 },
        data: { label: step.name, stepId: step.id, status: step.status,
          duration_ms: step.duration_ms, attempt: step.attempt,
          error: step.error, input: step.input, output: step.output },
      }];
    });
  }, []);

  // Derived
  const selectedRun = runs.find(r => r.id === selectedRunId) ?? null;
  const selectedStepData: StepNodeData | null = selectedStepId
    ? (nodes.find(n => n.id === selectedStepId)?.data as StepNodeData) ?? null : null;
  const selectedDlqEntry = selectedStepId
    ? dlqEntries.find(d => (d.step_name ?? d.id) === selectedStepId) ?? null : null;
  const selectedIssue = selectedIssueKey
    ? issues.find(i => i.key === selectedIssueKey) ?? null : null;
  const unresolvedCount = issues.filter(i => i.status === "unresolved").length;

  void steps;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", overflow: "hidden" }}>
      {fetchError && (
        <div className="stale-banner">
          ⚠ Daten konnten nicht aktualisiert werden — zuletzt {lastFetchedAt ? `vor ${Math.floor((Date.now() - lastFetchedAt) / 60000)}m` : "nie"}
        </div>
      )}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          workflows={workflows}
          runs={runs}
          selectedRunId={selectedRunId}
          selectedWorkflow={selectedWorkflow}
          onSelectRun={handleSelectRun}
          onSelectWorkflow={handleSelectWorkflow}
          loadingWorkflows={loadingWorkflows}
          loadingRuns={loadingRuns}
          coverage={coverage}
        />

        <div className="main-area">
          <MetricsBar
            metrics={metrics}
            yesterdayMetrics={yesterdayMetrics}
            loading={!lastFetchedAt && loadingWorkflows}
            lastFetchedAt={lastFetchedAt}
            fetchError={fetchError}
            onRefresh={fetchCoreData}
          />

          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            issueCount={unresolvedCount}
          />

          {activeTab === "flow" && (
            <>
              <div className="run-header">
                {selectedRun ? (
                  <>
                    <span className="run-header-name">{selectedRun.workflow_name}</span>
                    <span className="run-header-id">{selectedRun.id.slice(0, 8)}</span>
                    <span className={`status-badge ${selectedRun.status}`}>{selectedRun.status}</span>
                    <span className="run-header-time">{timeAgo(selectedRun.started_at)}</span>
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Select a run to inspect its steps</span>
                )}
              </div>
              <div className="flow-area">
                {loadingSteps ? (
                  <div className="empty-state"><div className="empty-state-title">Loading steps…</div></div>
                ) : selectedRunId && nodes.length > 0 ? (
                  <FlowGraph nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
                ) : selectedRunId && !loadingSteps ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">&#9675;</div>
                    <div className="empty-state-title">No steps recorded</div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">&#11041;</div>
                    <div className="empty-state-title">No run selected</div>
                    <div className="empty-state-sub">Pick a run from the sidebar</div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "issues" && (
            <div className="tab-content">
              <div className="issues-content-area">
                <IssuesView
                  issues={issues}
                  loading={loadingIssues}
                  selectedIssueKey={selectedIssueKey}
                  onSelectIssue={setSelectedIssueKey}
                  onStatusChange={handleIssueStatusChange}
                />
                {selectedIssue && (
                  <IssuePanel
                    issue={selectedIssue}
                    onClose={() => setSelectedIssueKey(null)}
                    onStatusChange={handleIssueStatusChange}
                    onSelectRun={handleIssueSelectRun}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="tab-content">
              <LogsView steps={allSteps} loading={loadingLogs} onSelectStep={handleLogStepClick} />
            </div>
          )}
        </div>

        {selectedStepData && (
          <DetailPanel step={selectedStepData} dlqEntry={selectedDlqEntry} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles with zero errors**

```bash
cd assets/dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
cd assets/dashboard && npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Start dev server and manually verify**

```bash
cd assets/dashboard && npm run dev
```

Open `http://localhost:5173`. Verify:
- [ ] Default tab is "Issues" (not "Flow")
- [ ] Issues are grouped — multiple runs with same error = 1 issue row
- [ ] Sparkline visible in each issue row
- [ ] Clicking an issue opens the side panel
- [ ] "Als gelöst markieren" updates the status badge and moves issue to "Resolved" filter
- [ ] Freshness indicator shows time and pulses green
- [ ] ↺ button triggers a data reload
- [ ] Workflow sidebar shows coverage dots for active workflows
- [ ] MetricsBar shows delta row below Success Rate if yesterday data available
- [ ] Logs tab still works unchanged

- [ ] **Step 6: Build check**

```bash
cd assets/dashboard && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add assets/dashboard/src/components/TabBar.tsx assets/dashboard/src/App.tsx
git commit -m "feat: wire up IssuesView, auto-refresh, freshness banner, and coverage in App"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd assets/dashboard && npm test
```

Expected: all tests pass.

- [ ] **Step 2: Full build**

```bash
cd assets/dashboard && npm run build
```

Expected: no errors, `dist/` generated.

- [ ] **Step 3: Commit and push**

```bash
git add -A
git status  # verify only expected files
git commit -m "chore: dashboard redesign — final build verification"
```
