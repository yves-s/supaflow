# Supaflow v2 — Claude Code Plugin Design

## What Is Supaflow?

Supaflow is a Claude Code Plugin that makes Claude build robust workflows automatically. When installed, Claude scans existing Edge Functions, recognizes flows, and instruments them with retries, error handling, logging, idempotency, and dead letter queues. Going forward, every new or changed Edge Function gets the same treatment — automatically.

The user never writes `flow.step()`. Claude does. The user writes normal TypeScript. Supaflow teaches Claude how to make it production-grade.

## User Experience

**Once per machine:**
```
/plugin install supaflow
```
(via own GitHub marketplace, or local path during development)

**Once per project:**
```
/supaflow:init
```

**After that:** Write code as usual. Claude instruments automatically.

## Plugin Structure

```
supaflow/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── supaflow/
│       └── SKILL.md
├── commands/
│   ├── supaflow-init.md
│   └── supaflow-scan.md
├── hooks/
│   └── hooks.json
├── assets/
│   ├── supaflow.ts              ← runtime, copied to project on init
│   ├── supaflow_schema.sql      ← migration, copied to project on init
│   └── dashboard/               ← dashboard app, copied to project on init
└── settings.json
```

## Distribution

Three tiers, all supported simultaneously:

1. **Own GitHub Marketplace** (immediate): `marketplace.json` in the supaflow repo. User adds marketplace, installs plugin. No approval needed.
2. **Local path** (development): `claude --plugin-dir ./supaflow` or `enabledPlugins` in settings.
3. **Official Claude Code Registry** (when approved): `/plugin install supaflow` directly.

## The Skill (SKILL.md)

The skill is the brain. It does NOT contain a pattern catalog — Claude already knows what rate limits and timeouts are. Instead it contains:

### Block 1: Principles

- Every external call is a potential failure point — instrument it
- Every multi-step process needs observability — track it
- Every webhook handler needs idempotency — deduplicate it
- When unsure if something can fail: it can. Instrument it
- Decide per call: Is it idempotent? What happens on failure? Can it be retried?

### Block 2: Runtime API Reference

Documentation for the Supaflow runtime that Claude copies into projects:

- `supaflow.serve(name, handler)` — wraps Deno.serve() with idempotency, run tracking, error responses
- `flow.step(name, fn, options?)` — executes a step with retries, logging, DLQ on failure
- `flow.input<T>()` — typed request body
- `StepOptions` — `maxAttempts` (default 3), `backoff` (default [1000, 2000, 4000]), `timeout` (default 30000)
- Error semantics: step failure = run failure (throws after retries exhausted), partial failure via try/catch

### Block 3: Decision Framework

Questions Claude asks itself when instrumenting code:

- **Can this call fail?** → If yes: `flow.step()` with retry
- **Is the call idempotent?** → If yes: retry safe. If no: 1 attempt only, DLQ on failure
- **How long should it take?** → Set timeout based on what the call does
- **What if it permanently fails?** → DLQ. Partial failure okay or abort run?
- **How many retries make sense?** → 3 default. More for rate limits, fewer for auth failures
- **Are there known failure patterns?** → Claude uses its own knowledge about the API/service

## The Init Command (supaflow-init.md)

Triggered by `/supaflow:init`. Claude executes:

1. **Detect project** — find Supabase URL/keys from `.env`, `supabase/config.toml`, or ask user
2. **Copy runtime** — `supaflow.ts` into `supabase/functions/_shared/`
3. **Create migration** — schema SQL into `supabase/migrations/`
4. **Apply schema** — `supabase db push`
5. **Create config** — `supaflow.json` with detected credentials
6. **Install dashboard** — `dashboard/` directory with Vite + React Flow app
7. **Full scan** — read all Edge Functions, recognize patterns, instrument with Supaflow
8. **Report** — show what was instrumented, what was changed, let user review before committing

Step 8 is critical: no automatic commit. Claude shows the changes, user approves, then commit.

## The Hook (Continuous Mode)

`hooks.json` registers a PostToolUse hook on file edits. When Claude writes or modifies a file in `supabase/functions/`:

- Check: is Supaflow installed in this project? (`_shared/supaflow.ts` exists?)
- If yes: are all external calls and multi-step processes in the changed code instrumented?
- If no: load the supaflow skill, instrument the missing parts

Lightweight — only checks changed code, not a full scan.

## On-Demand Scan

User says "check my code" or runs `/supaflow:scan` (a second command in the plugin). Full scan like init step 7, but on current codebase. Finds gaps that slipped through.

## Runtime (supaflow.ts)

The existing v1 runtime, unchanged. Copied from plugin `assets/` into the user's project on init. The user owns the file from that point — no dependency, no lock-in.

Key APIs:
- `supaflow.serve(name, handler)` — HTTP handler with idempotency, run tracking
- `flow.step(name, fn, options?)` — step execution with retries, logging, DLQ
- `flow.input<T>()` — typed request body

## Database Schema

Four Postgres tables, copied as migration on init:

- `idempotency_keys` — deduplicates webhook retries
- `workflow_runs` — one record per trigger (status, duration_ms, error)
- `step_states` — every step with input, output, retries, duration_ms, order
- `dead_letter_queue` — permanently failed steps for manual intervention

## Dashboard

React Flow observability dashboard, copied on init. Vite + React app.

- Sidebar: workflow list + run history
- Metrics bar: total runs, success rate, avg duration, DLQ entries, running
- Flow graph: React Flow DAG built from step_states (dagre layout)
- Detail panel: step input, output, error, retries, DLQ status
- Connects to Supabase directly via anon key (read-only RLS)

## What Supaflow Does NOT Do

- No auth — developer handles authentication
- No scheduling — Supabase cron or external triggers
- No workflow editor — workflows are code, Claude writes the instrumentation
- No AST parsing — Claude reads and understands code directly
- No pattern catalog — Claude uses its own knowledge about APIs and failure modes

## Relationship to v1

v1 built the runtime (`supaflow.ts`), schema, dashboard, and example workflow. All of this is preserved as the `assets/` that the plugin copies on init. The new work in v2 is:

- Plugin manifest and structure
- The Skill (SKILL.md)
- The Init Command (supaflow-init.md)
- The Continuous Hook
- The Scan Command
- Restructuring the repo from "a project" to "a plugin that installs into projects"
