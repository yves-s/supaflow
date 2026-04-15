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

Four changes to the existing React dashboard (`assets/dashboard/`). No navigation restructuring, no new pages, no backend schema changes.

---

## Design

### 1. Issues Tab (replaces Errors tab)

**Grouping logic:** Failed runs are clustered by `(workflow_name, step_name, error_pattern)`. The `error_pattern` is derived by stripping numeric IDs from the raw error message — `Failed subscriptions: 680935167` and `Failed subscriptions: 416655910` both map to `Failed subscriptions: <ID>`, becoming a single issue.

**Issue list row:**
- Title: cleaned error pattern (e.g. `Failed subscriptions: <ID>`)
- Subtitle: `workflow_name › step_name` in monospace
- Count badge: total affected runs (e.g. `11×`)
- Sparkline: 9-bucket distribution of occurrences over the last 24h
- Timestamps: "Zuerst: 4h ago · Zuletzt: 25s ago"
- Status badge: `unresolved` (red) / `resolved` (green) / `ignored` (grey)
- Trend hint: "↑ wird häufiger" when occurrence frequency is increasing

**Issue status persistence:** Stored in a new `supaflow_issues` table keyed by `(workflow_name, step_name, error_pattern)`. Status values: `unresolved`, `resolved`, `ignored`. Default on creation: `unresolved`.

**Regression detection:** When a new run matches a `resolved` issue's key, the issue is automatically reopened to `unresolved`.

**Side panel (on issue click):**
- Error message as code block (raw, unsanitized)
- List of affected runs, each row clickable → switches to Flow tab with that run selected
- Action buttons: "Als gelöst markieren" / "Ignorieren"

**Toolbar:**
- Search input (filters by error pattern or workflow name, client-side)
- Filter chips: Unresolved / Ignored / Resolved
- Toggle: Issues view / Runs view (Runs view = current list behavior, kept as fallback)

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

**Detection logic:** A workflow is considered potentially uninstrumented if it exists in the sidebar's workflow list but has produced no `supaflow_steps` records in the last 24 hours. This is a signal, not a guarantee — it detects silence, not missing code.

**Display:** Inline icon next to the workflow name in the sidebar:
- Green dot → activity within last 24h
- Yellow triangle (⚠) → no activity in >24h
- No icon → new workflow, insufficient history to assess

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

RLS: same pattern as existing `supaflow_*` tables (anon read, service role write).

### New query functions (supabase.ts)

- `fetchIssues(workflowName?)` — returns grouped issues with occurrence count and sparkline buckets
- `updateIssueStatus(id, status)` — patch status field
- `computeErrorPattern(errorMessage)` — client-side: strip numeric sequences with regex

### Modified components

- `TabBar.tsx` — rename "Errors" to "Issues", keep same badge logic
- `ErrorsView.tsx` → `IssuesView.tsx` — full replacement with grouped issue rows + toolbar
- `Sidebar.tsx` — add coverage indicator icon + tooltip per workflow
- `MetricsBar.tsx` — add freshness indicator + delta display
- `App.tsx` — add 30s auto-refresh interval, error state banner

### Trend data

Computed client-side from two `fetchMetrics()` calls: one for current window, one for yesterday's window. No new DB functions needed — existing `fetchMetrics` accepts a time range parameter (to be added).

---

## Out of Scope

- Alert rules / notifications (Slack, email)
- Issue assignment to team members
- Static code analysis for instrumentation coverage
- Configurable refresh intervals
- Mobile layout
- Historical trend charts (sparklines only, not full time-series)
