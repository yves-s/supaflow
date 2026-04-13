---
name: supaflow-init
description: Initialize Supaflow in the current project. Copies runtime, creates migration, applies schema, installs dashboard, and scans all Edge Functions for instrumentation.
---

# /supaflow:init — Initialize Supaflow

Set up Supaflow in the current Supabase project. This command runs once per project.

## Prerequisites

- Supabase project initialized (`supabase/` directory exists)
- Supabase CLI available (`supabase` command)
- `.env` or `supabase/config.toml` with project credentials

## Steps

Execute ALL steps sequentially. Do not ask for confirmation between steps (except step 8).

### 1. Detect Project

Find Supabase credentials:

1. Check `.env` or `.env.local` for `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Check `supabase/config.toml` for project reference
3. If neither found: ask the user for Supabase URL and anon key

Store the values for later steps.

### 2. Copy Runtime

Copy `supaflow.ts` from the plugin assets into the project:

```bash
cp "${CLAUDE_PLUGIN_ROOT}/assets/supaflow.ts" supabase/functions/_shared/supaflow.ts
```

If `supabase/functions/_shared/` does not exist, create it.

### 3. Create Migration

Copy the schema SQL from plugin assets:

```bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
cp "${CLAUDE_PLUGIN_ROOT}/assets/supaflow_schema.sql" "supabase/migrations/${TIMESTAMP}_supaflow.sql"
```

### 4. Apply Schema

```bash
supabase db push
```

If this fails (e.g., no local Supabase, remote-only): inform the user and continue. The schema can be applied later.

### 5. Create Config

Create `supaflow.json` in the project root with the detected credentials:

```json
{
  "supabase_url": "<detected>",
  "supabase_anon_key": "<detected>",
  "dashboard_port": 3001
}
```

### 6. Install Dashboard

Copy the dashboard from plugin assets:

```bash
cp -r "${CLAUDE_PLUGIN_ROOT}/assets/dashboard" ./dashboard
cd dashboard && npm install
```

Update `dashboard/vite.config.ts` to read from the project's `supaflow.json`.

### 7. Full Scan and Instrument

Load the `supaflow` skill. Then:

1. Find all Edge Functions: `ls supabase/functions/*/index.ts` (excluding `_shared/`)
2. For each function:
   a. Read the code
   b. Identify: entry point (Deno.serve), external calls, multi-step flows
   c. Instrument using the skill's decision framework
   d. Track what was changed

### 8. Report

**Do NOT commit automatically.** Show the user a summary:

```
Supaflow initialized:
  ✓ Runtime copied to supabase/functions/_shared/supaflow.ts
  ✓ Migration created: supabase/migrations/{timestamp}_supaflow.sql
  ✓ Schema applied to database
  ✓ Config created: supaflow.json
  ✓ Dashboard installed: dashboard/

  Instrumented {N} Edge Functions:
  - {function-name}: {number of steps} steps, {changes made}
  - ...

  Review the changes, then commit when ready.
```

Let the user review all changes before committing.

## Error Handling

- If Supabase CLI is not available: warn, skip schema apply, continue
- If no Edge Functions found: skip scan, inform user ("no functions to instrument yet")
- If a function cannot be instrumented (too complex, unclear structure): skip it, report it
