---
name: supaflow-init
description: Initialize or update Supaflow in the current project. Fresh install copies everything and instruments functions. Re-run updates runtime and dashboard assets without touching schema, config, or instrumented code.
---

# /supaflow:init — Initialize or Update Supaflow

Set up Supaflow in a new project, or update assets in an existing installation.

## Mode Detection

Check if `supaflow.json` exists in the project root:

- **Does NOT exist** → **Fresh Install** (run all steps)
- **Exists** → **Update Mode** (run only steps 2 and 6, then report)

## Prerequisites

- Supabase project initialized (`supabase/` directory exists)
- Supabase CLI available (`supabase` command)
- `.env` or `supabase/config.toml` with project credentials

## Steps — Fresh Install

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
cp -r "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/src/" dashboard/src/
cp "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/index.html" dashboard/index.html
cp "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/vite.config.ts" dashboard/vite.config.ts
cp "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/package.json" dashboard/package.json
cp "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/tsconfig.json" dashboard/tsconfig.json
cp "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/tsconfig.app.json" dashboard/tsconfig.app.json 2>/dev/null
cp "${CLAUDE_PLUGIN_ROOT}/assets/dashboard/tsconfig.node.json" dashboard/tsconfig.node.json 2>/dev/null
cd dashboard && npm install
```

On fresh install, also update `dashboard/vite.config.ts` to read from the project's `supaflow.json`.

### 7. Full Scan and Instrument

Load the `supaflow` skill. Then:

1. Find all Edge Functions: `ls supabase/functions/*/index.ts` (excluding `_shared/`)
2. For each function:
   a. Read the code
   b. Identify: entry point (Deno.serve), external calls, multi-step flows
   c. Instrument using the skill's decision framework
   d. Track what was changed

### 8. Report — Fresh Install

**Do NOT commit automatically.** Show the user a polished summary using the exact format below. Adapt the content to what actually happened — but keep the structure, tone, and ASCII art.

**Rules for the report:**
- Use simple language. No jargon, no file paths in the summary section.
- Group what happened into clear categories.
- If schema wasn't applied (no local Supabase), put the manual step in "What you need to do" — otherwise omit it.
- "What you need to do" contains ONLY things the user must do manually. If everything worked, say so.
- Each manual step must explain exactly what to do and why, in one sentence.
- End with the ASCII art. Always.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Setup complete.

  What was installed:
    ✓ Workflow runtime (retries, idempotency, logging)
    ✓ Database schema (runs, steps, dead letter queue, dedup)
    ✓ Dashboard app (visual workflow monitor)
    ✓ Config file with your Supabase credentials

  What was instrumented:
    ✓ {function-name} — {N} steps ({brief description of what the steps do})
    ✓ {function-name} — {N} steps ({brief description})
    ...

  {If there were skipped functions:}
    ○ {function-name} — no external calls, nothing to instrument

  {If schema was NOT applied:}
  What you need to do:

    1. Apply the database schema
       Run: supabase migration repair --status reverted {timestamp}
       Then: supabase db push
       This creates the tables Supaflow needs to track your workflows.

    2. Add your real Supabase credentials to supaflow.json
       Replace the placeholder values for supabase_url and supabase_anon_key.
       You find them in your Supabase dashboard under Settings → API.

    3. Review the changes, then commit when you're happy.

  {If schema WAS applied:}
  What you need to do:

    1. Review the instrumented functions — Claude added retries and
       error handling to every external call. Check that it looks right.

    2. Commit when you're happy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ███████╗██╗   ██╗██████╗  █████╗ ███████╗██╗      ██████╗ ██╗    ██╗
   ██╔════╝██║   ██║██╔══██╗██╔══██╗██╔════╝██║     ██╔═══██╗██║    ██║
   ███████╗██║   ██║██████╔╝███████║█████╗  ██║     ██║   ██║██║ █╗ ██║
   ╚════██║██║   ██║██╔═══╝ ██╔══██║██╔══╝  ██║     ██║   ██║██║███╗██║
   ███████║╚██████╔╝██║     ██║  ██║██║     ███████╗╚██████╔╝╚███╔███╔╝
   ╚══════╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝

   Your Edge Functions are now production-ready.
   Run /supaflow:scan anytime to catch new uninstrumented code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Steps — Update Mode

When `supaflow.json` already exists, update assets and apply any pending schema changes.

1. Run **Step 2** (Copy Runtime)
2. Run **Step 6** (Install Dashboard)
3. **Apply schema migrations** (new step — see below)
4. Show the update report

### 3. Apply Schema Migrations

Schema changes are part of every update. Apply them automatically using the ensure file:

```bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
cp "${CLAUDE_PLUGIN_ROOT}/assets/supaflow_ensure.sql" \
   "supabase/migrations/${TIMESTAMP}_supaflow_ensure.sql"
supabase db push
```

**If `supabase` CLI is not available:** skip silently and add this to the report:

```
  ⚠ Schema migrations pending
    Run: supabase db push
    Or apply supabase/migrations/*_supaflow_ensure.sql manually.
    Until then, some dashboard features may not work correctly.
```

The ensure file uses `IF NOT EXISTS` / `IF EXISTS` throughout — safe to re-run on any version.

### 4. Update Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow updated.

  ✓ Runtime (supaflow.ts)
  ✓ Dashboard (src, config, dependencies)
  ✓ Schema migrations applied

  {If schema migrations were skipped:}
  ⚠ Schema migrations pending — run: supabase db push

  Run /supaflow:scan if you want to re-instrument functions.
  Review the changes, then commit when ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling

- If Supabase CLI is not available: warn, skip schema apply, add manual step to report
- If no Edge Functions found: skip scan, show "No functions found yet — write one and run /supaflow:scan"
- If a function cannot be instrumented (too complex, unclear structure): skip it, mention in report with reason
