# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Added
- Supaflow runtime library (`supaflow.serve()`, `flow.step()`, `flow.input()`) with retries, idempotency, DLQ, and timeout
- React Flow observability dashboard (Vite + React) with sidebar, metrics bar, flow graph, and detail panel
- Database schema with `duration_ms` and `order` columns for step tracking
- Example workflow (order-fulfillment) demonstrating the full API
- Unit tests for runtime internals (10 tests)
- `supaflow.json` configuration file for dashboard credentials

### Removed
- Demo code: klaviyo-unsubscribe workflow, demo-dashboard, mock API layer, edgeflow.ts
