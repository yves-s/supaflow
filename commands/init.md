---
name: supaflow-init
description: Initialize or update Supaflow in the current project. Fresh install sets up runtime, schema, dashboard, and config. Re-run updates runtime and dashboard without touching schema or config.
---

# /supaflow:init — Initialize or Update Supaflow

Set up Supaflow in a new project, or update assets in an existing installation.

## Output Rules — READ FIRST

These rules override your default behavior for this entire command:

1. **No thinking out loud.** No "Key observations before instrumenting", no "Let me check the dashboard config".
2. **No file paths in user-facing output.** Say "Runtime" not "supabase/functions/_shared/supaflow.ts".
3. **No CLI commands as instructions.** Either do it yourself or say what's missing in plain language.
4. **No diffs or code changes shown.** The user didn't ask to see code.
5. **Progress lines use ✓ or ✗ only.** No ○, no →, no bullets.
6. **One done screen.** Not repeated. Not summarized again after.
7. **Language matches the user's language.** If the conversation is in German, output in German. If English, English. Be consistent — don't mix languages within one screen.

## Mode Detection

Check if `supaflow.json` exists in the project root:

- **Does NOT exist** → **Fresh Install**
- **Exists** → **Update Mode**

---

## Fresh Install

### Phase 1: Detect

Check preconditions in this order. Stop at the first failure.

**1. Supabase project**

Check if `supabase/` directory exists.

If it does NOT exist, output this screen and stop:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow needs a Supabase project.

  Create one at supabase.com and connect it
  to this repo. Then run /supaflow:init again.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**2. Credentials**

Look for `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`, `.env.local`, or `supabase/config.toml`.

If neither is found, output this screen and stop:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supabase project found, but credentials
  are missing.

  Add SUPABASE_URL and SUPABASE_ANON_KEY to
  your .env file. You can find them in your
  Supabase dashboard under Settings → API.

  Then run /supaflow:init again.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Do NOT ask the user to type credentials interactively. They belong in `.env`.

**3. Supabase CLI**

Check if `supabase` command is available (`which supabase`).

If not found, output this screen and stop:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supabase CLI not found.

  Install it with: brew install supabase/tap/supabase
  or: npm install -g supabase

  Then run /supaflow:init again.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If all three checks pass, proceed to Phase 2.

### Phase 2: Install

Output: `Installing Supaflow...`

Execute these 4 steps sequentially. After each success, output `  ✓ {step name}`. On failure, output `  ✗ {step name}` followed by a plain-language error message, then stop.

**Step 1: Runtime**

- Create `supabase/functions/_shared/` if it doesn't exist
- Copy `${CLAUDE_PLUGIN_ROOT}/assets/supaflow.ts` to `supabase/functions/_shared/supaflow.ts`
- Check existing Edge Function code for the project's import convention (`jsr:` vs `https://esm.sh` vs `npm:`)
- If the copied runtime's imports don't match the project convention, fix them silently

Output: `  ✓ Runtime`

**Step 2: Database schema**

- Generate timestamp: `TIMESTAMP=$(date +%Y%m%d%H%M%S)`
- Copy `${CLAUDE_PLUGIN_ROOT}/assets/supaflow_schema.sql` to `supabase/migrations/${TIMESTAMP}_supaflow.sql`
- Run `supabase db push`
- On failure, attempt recovery:
  - If the error mentions "remote migration" or "not found locally": run `supabase migration repair` for the conflicting migration(s), then retry `supabase db push`
  - If the error mentions "connect", "connection", or "refused": stop with `  ✗ Database schema` and message: "No database connection. Check that your Supabase project is reachable and run /supaflow:init again."
  - Any other error: stop with `  ✗ Database schema` and a plain-language description of what went wrong. No raw CLI output.

Output on success: `  ✓ Database schema`

**Step 3: Dashboard**

- Copy dashboard files from `${CLAUDE_PLUGIN_ROOT}/assets/dashboard/` to `dashboard/` in the project root:
  - `src/` directory
  - `index.html`
  - `vite.config.ts`
  - `package.json`
  - `tsconfig.json`
  - `tsconfig.app.json` (if exists in assets)
  - `tsconfig.node.json` (if exists in assets)
- Run `cd dashboard && npm install`
- On failure: stop with `  ✗ Dashboard` and message: "Could not install dashboard dependencies. Check that Node.js is installed and you're online, then run /supaflow:init again."

Output on success: `  ✓ Dashboard`

**Step 4: Config**

- Read the credentials found in Phase 1 (from `.env`, `.env.local`, or `config.toml`)
- Create `supaflow.json` in the project root:

```json
{
  "supabase_url": "<real value from env>",
  "supabase_anon_key": "<real value from env>",
  "dashboard_port": 3001
}
```

- Use the actual credential values. NEVER use placeholders like `https://<project-ref>.supabase.co`.

Output on success: `  ✓ Config`

### Phase 3: Done

Count Edge Functions: number of subdirectories in `supabase/functions/` excluding `_shared/` and `_utils/`.

**If Edge Functions were found ({N} > 0):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow is ready.

  ✓ Runtime, Schema, Dashboard — all set up
  ✓ {N} Edge Functions found

  Next step:
    /supaflow:scan — instruments your functions
    with retries, error handling, and workflow tracking.

  Dashboard:
    cd dashboard && npm run dev → http://localhost:3001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ███████╗██╗   ██╗██████╗  █████╗ ███████╗██╗      ██████╗ ██╗    ██╗
   ██╔════╝██║   ██║██╔══██╗██╔══██╗██╔════╝██║     ██╔═══██╗██║    ██║
   ███████╗██║   ██║██████╔╝███████║█████╗  ██║     ██║   ██║██║ █╗ ██║
   ╚════██║██║   ██║██╔═══╝ ██╔══██║██╔══╝  ██║     ██║   ██║██║███╗██║
   ███████║╚██████╔╝██║     ██║  ██║██║     ███████╗╚██████╔╝╚███╔███╔╝
   ╚══════╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝

   Your Edge Functions are now production-ready.
   Run /supaflow:scan anytime to catch new code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If no Edge Functions were found:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow is ready.

  ✓ Runtime, Schema, Dashboard — all set up

  No Edge Functions found yet.
  Write your first function, then run
  /supaflow:scan to instrument it.

  Dashboard:
    cd dashboard && npm run dev → http://localhost:3001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Do NOT commit automatically. Do NOT show additional summaries after the done screen.

---

## Update Mode

When `supaflow.json` already exists, only update runtime and dashboard assets.

1. Run **Phase 2 Step 1** (Runtime)
2. Run **Phase 2 Step 3** (Dashboard)
3. Output this screen:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow updated.

  ✓ Runtime
  ✓ Dashboard

  Schema and config were not changed.
  Run /supaflow:scan to re-instrument functions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Do NOT touch schema, config, or instrumented code during updates.
