# Supaflow

A Claude Code Plugin that makes Claude build robust workflows automatically.

## Install

Add the marketplace and install:

```
/plugin marketplace add yves-s/edge-flow
/plugin install supaflow
```

Or load locally for development:

```
claude --plugin-dir /path/to/supaflow
```

## Use

In any Supabase project:

```
/supaflow:init
```

That's it. Claude scans your Edge Functions, adds retries, error handling, logging, idempotency, and dead letter queues. A React Flow dashboard shows your workflow runs.

After init, Claude instruments automatically whenever you write or change Edge Functions.

## Commands

| Command | What it does |
|---|---|
| `/supaflow:init` | Set up Supaflow in your project (once per project) |
| `/supaflow:scan` | Re-scan all Edge Functions, instrument gaps |

## What Gets Added to Your Project

| File | Purpose |
|---|---|
| `supabase/functions/_shared/supaflow.ts` | Runtime library (retries, DLQ, logging) |
| `supabase/migrations/*_supaflow.sql` | Database schema (4 tables) |
| `supaflow.json` | Config (Supabase credentials) |
| `dashboard/` | React Flow observability UI |

## How It Works

1. **Init:** Claude copies the runtime into your project, creates the database schema, and scans all your Edge Functions
2. **Instrumentation:** Claude wraps external calls in `flow.step()` with retries, error handling, and logging
3. **Continuous:** Every time you edit an Edge Function, Claude checks if new code needs instrumentation
4. **Dashboard:** Open `cd dashboard && npm run dev` to see your workflow runs, step timelines, and errors
