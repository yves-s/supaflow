# Dashboard Redesign — Signal-first (Approach B)

**Date:** 2026-04-15  
**Status:** Approved by user

## Problem

The current dashboard has two root trust issues:

1. **Freshness** — No indication of when data was last loaded. Users resort to asking Claude instead of checking the dashboard because they don't know if numbers are current.
2. **Completeness** — No way to know if all Edge Functions are instrumented. A silent gap looks identical to a healthy zero.

Additionally, the Errors tab lists every failed run individually — 11 runs with the same error pattern produce 11 identical rows. Signal is buried in noise.

## Goal

A dashboard the user can trust at a glance: grouped issues instead of repeated rows, visible data freshness, and per-workflow instrumentation coverage signals.

## Scope

Four changes to the existing React dashboard (`assets/dashboard/`). No navigation restructuring, no new pages. One new DB table + migration required.

---

## Design

### 1. Issues Tab (replaces Errors tab)

**Grouping logic:** Failed runs are clustered by `(workflow_name, step_name, error_pattern)`. The `error_pattern` is derived by normalising the raw error message with `computeErrorPattern()`:
- Strip sequences of 4+ consecutive digits → replaced with `<ID>`
- Strip UUID-format tokens (8-4-4-4-12 hex) → replaced with `<UUID>`
- All other content is left unchanged

Example: `Failed subscriptions: 680935167, 416655910` → `Failed subscriptions: <ID>, <ID>` (same pattern as `Failed subscriptions: 9110816`).

**Issue list row:**
- Title: cleaned error pattern (e.g. `Failed subscriptions: <ID>`)
- Subtitle: `workflow_name › step_name` in monospace
- Count badge: total affected runs (e.g. `11×`)
- Sparkline: 9 equal-width buckets of ~2h40m each, covering the last 24h. Zero-occurrence buckets render at baseline height. Y-scale is relative to the issue's own maximum bucket count.
- Timestamps: "Zuerst: 4h ago · Zuletzt: 25s ago"
- Status badge: `unresolved` (red) / `resolved` (green) / `ignored` (grey)
- Trend hint: "↑ wird häufiger" when the last 3 buckets average higher than the first 3 buckets

**Issue status persistence:** Stored in `supaflow_issues` table keyed by `(workflow_name, step_name, error_pattern)`. Status values: `unresolved`, `resolved`, `ignored`. Default on creation: `unresolved`.

**Regression detection:** Handled by the population mechanism (see Architecture). When a new run matches a `resolved` issue's key, it is automatically reopened to `unresolved`.

**Side panel (on issue click):**
- Error message as code block (raw, unsanitized)
- List of affected run IDs, each row clickable → switches to Flow tab with that run selected
- Action buttons: "Als gelöst markieren" / "Ignorieren" — these call `updateIssueStatus()` via a Supabase Edge Function (see RLS note below)

**Toolbar:**
- Search input (filters by error pattern or workflow name, client-side)
- Filter chips: Unresolved / Ignored / Resolved
- Toggle: Issues view / Runs view (Runs view = current ErrorsView behavior, kept as fallback)

**Empty state for filtered view:** When the active filter produces zero results, show: "Keine [Status]-Issues" with a neutral icon, using the existing `.empty-state` CSS pattern.

**Issues tab badge:** Displays count of `unresolved` issues only (not raw failed run count). The current `errorCount = dlqCount + failedRunCount` derivation in `App.tsx` is replaced with the count of issues with `status = 'unresolved'`.

### 2. Freshness & Auto-Refresh

**Auto-refresh interval:** 30 seconds. Refreshes metrics, issues list, and running count in the background without a page reload. No visible spinner unless a fetch takes >2s.

**Freshness indicator:** Positioned at the right end of the metrics bar:
- Pulsing green dot + "vor Xs" when data is <30s old
- Grey dot when >60s old (e.g. fetch failed)
- Manual refresh button (↺) beside it for immediate reload

**Error state:** If the last fetch failed, a banner appears below the metrics bar:
`⚠ Daten konnten nicht aktualisiert werden — zuletzt vor 2m`
This makes stale data visible rather than silently trusted.

### 3. Coverage Indicator

**Detection logic:** A workflow is considered potentially uninstrumented if it exists in the sidebar's workflow list but has produced no `step_states` records in the last 24 hours. This is a signal, not a guarantee — it detects silence, not missing code.

**Display:** Inline icon next to the workflow name in the sidebar:
- Green dot → activity in `step_states` within last 24h
- Yellow triangle (⚠) → no activity in >24h
- No icon → new workflow with fewer than 3 total records (insufficient history)

**Hover tooltip:** "Letzter Step vor 4h · 3 bekannte Steps" — inline, no separate panel.

**Scope limitation:** Coverage detection is purely signal-based (activity in the last 24h). It cannot perform static analysis of deployed code. A yellow triangle means "the dashboard has no recent data from this workflow" — the cause may be non-instrumentation, low traffic, or a paused workflow.

### 4. Metrics Trends

**Delta display:** Shown below each metric value, small and subdued. Format: `↓ 2% vs. gestern` in red, `↑ 1% vs. gestern` in green. Suppressed when delta <0.5% to avoid noise.

**Comparison window:** Always "same elapsed time yesterday". If the dashboard is opened at 14:00, it compares the last 14 hours against the same 14-hour window yesterday. Fixed — no user-configurable window.

**Which metrics get a delta:**
| Metric | Delta |
|---|---|
| Success Rate | ↑↓ percentage points |
| Total Runs | ↑↓ absolute count |
| Avg Duration | ↑↓ ms |
| DLQ Entries | None (snapshot) |
| Running | None (snapshot) |

**Hover tooltip** on metric card: "gestern: 98% · vorgestern: 97%" — two data points for context without cluttering the UI.

---

## Architecture

### New database table: `supaflow_issues`

```sql
create table supaflow_issues (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  step_name text not null,
  error_pattern text not null,
  status text not null default 'unresolved', -- unresolved | resolved | ignored
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  occurrence_count integer not null default 1,
  unique(workflow_name, step_name, error_pattern)
);
```

**RLS:** Anon role gets `SELECT` only. `INSERT` and `UPDATE` go through a dedicated Edge Function (`supaflow-issue-action`) using the service role key. This keeps the dashboard client read-only and avoids granting anon UPDATE on the issues table.

### Population mechanism

A Postgres trigger on `step_states` fires after INSERT/UPDATE when `status = 'failed'`. It:
1. Calls `computeErrorPattern()` (reimplemented in PL/pgSQL) on the `error` column
2. Upserts into `supaflow_issues` — incrementing `occurrence_count`, updating `last_seen_at`
3. If the matched issue has `status = 'resolved'`, reopens it to `unresolved` (regression detection)

`first_seen_at` is set only on initial INSERT (handled by `ON CONFLICT DO UPDATE` leaving it unchanged).

### New query functions (`queries.ts`)

- `fetchIssues(workflowName?)` — reads from `supaflow_issues`, returns issues with sparkline bucket arrays
- `updateIssueStatus(id, status)` — calls the `supaflow-issue-action` Edge Function (POST), not a direct Supabase client write
- `computeErrorPattern(errorMessage: string): string` — client-side normalisation for display purposes only; canonical pattern is computed by the DB trigger
- `fetchMetrics(workflowName?, from?: Date, to?: Date)` — **extended** to accept optional time window; used twice for trend delta (current window + same window yesterday)

### Modified components

- `TabBar.tsx` — rename "Errors" → "Issues"; badge now shows `unresolved` issue count
- `ErrorsView.tsx` → `IssuesView.tsx` — full replacement: grouped issue rows, toolbar, side panel with action buttons
- `Sidebar.tsx` — add coverage indicator icon + hover tooltip per workflow; coverage data fetched alongside workflow list
- `MetricsBar.tsx` — add freshness indicator (right-aligned) + delta row below each metric value
- `App.tsx` — add 30s `setInterval` auto-refresh, error state banner, two-window metrics fetch for trends

### New Edge Function

`supaflow-issue-action` — accepts `{ id, status }`, validates status value, updates `supaflow_issues` using service role. Returns updated issue row.

---

## Out of Scope

- Alert rules / notifications (Slack, email)
- Issue assignment to team members
- Static code analysis for instrumentation coverage
- Configurable refresh intervals
- Mobile layout
- Historical trend charts (sparklines only, not full time-series)
