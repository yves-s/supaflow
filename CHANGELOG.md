# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Changed
- Dashboard shell rebuilt for the new design: paper-white surface with oklch token system (primitive → semantic → component layers), Inter + Geist Mono typography, 248px sidebar with brand mark / project picker / top-nav (Overview · Workflows · Issues · Logs) / workflow list / user foot, and a topbar with breadcrumbs that reflect the active view, search input (stub), live pulse status, range picker, refresh, and bell. View routing in App.tsx switches between `overview | workflows | workflow | run | issues | logs`; breadcrumbs are clickable. The previous dark-theme tokens have been replaced.

### Fixed
- DLQ entries now visible in Issues tab — previously only the header count queried `dead_letter_queue`, while the Issues list only checked `workflow_runs`/`step_states` (7-day window), causing empty issue lists despite thousands of DLQ entries

### Added
- Issues tab replacing Errors tab: groups failed runs by (workflow_name, step_name, error_pattern) into Sentry-style issue rows with count badge, 9-bucket 24h sparkline, first/last seen timestamps, trend arrow, and unresolved/resolved/ignored status
- `supaflow_issues` table for storing issue status (unresolved/resolved/ignored) keyed by (workflow_name, step_name, error_pattern)
- `computeErrorPattern` — normalises error messages by stripping 4+ digit sequences → `<ID>` and UUID tokens → `<UUID>`
- Issue side panel with error details, affected run IDs (clickable → Flow tab), and resolve/ignore action buttons
- Freshness indicator in MetricsBar: pulsing green dot + "vor Xs" when data <30s old, grey dot when stale
- Manual refresh button (↺) next to freshness indicator
- Stale data banner shown below MetricsBar when last fetch failed
- 30-second auto-refresh interval for metrics, issues, and running count
- Metric trend deltas (↑↓) below Success Rate, Total Runs, Avg Duration — comparing current elapsed window to same window yesterday
- Coverage indicator per workflow in Sidebar: green dot (activity <24h) / yellow triangle (silent >24h) / no icon (<3 records)
- Coverage hover tooltip: "Letzter Step vor Xh · N bekannte Steps"
- Issues view toolbar: search input + Unresolved/Ignored/Resolved filter chips + Issues/Runs view toggle
- vitest + jsdom for testing pure dashboard functions; 8 tests for `computeErrorPattern` and `buildSparklineBuckets`

### Changed
- Dashboard tab "Errors" renamed to "Issues"; tab badge now shows unresolved issue count instead of raw failed run count
- `fetchMetrics` extended with optional `from`/`to` time window for trend delta comparison

### Added
- Dashboard tab navigation (Flow / Errors / Logs) for switching between views
- Errors view showing failed runs and Dead Letter Queue entries with detail panel integration
- Logs view showing chronological step list across all runs with workflow filtering
- Workflow-filtered KPIs — metrics update when selecting a workflow in the sidebar
- Skeleton loading states for all dashboard tabs
- Error count badge on Errors tab

### Changed
- Restructured from standalone project to Claude Code Plugin
- Runtime, schema, and dashboard moved to `assets/` (copied to projects on init)

### Added
- Plugin manifest (`.claude-plugin/plugin.json`)
- Supaflow Skill (`skills/supaflow/SKILL.md`) — teaches Claude to instrument workflows
- `/supaflow:init` command — project setup + full scan
- `/supaflow:scan` command — on-demand re-scan
- Continuous hook — auto-instruments on file edits
- GitHub marketplace config (`marketplace.json`)

### Removed
- Example workflow (replaced by init scan of real code)
- Project-level deno.json, project.json, supaflow.json (now created per-project by init)
