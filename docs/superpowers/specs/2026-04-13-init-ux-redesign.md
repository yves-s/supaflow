# Init UX Redesign

> Zero manual commands. Zero technical jargon. The user runs `/supaflow:init`, and either everything works or they get a clear sentence explaining what's missing.

## Problem

The current `/supaflow:init` experience has fundamental UX failures:

1. **8 minutes of silence** — the init scans and instruments all Edge Functions inline, with no progress feedback
2. **Technical noise** — Claude's internal reasoning ("esm.sh → jsr: import convention", "EdgeRuntime.waitUntil fire-and-forget pattern") is dumped to the user
3. **Failed steps produce CLI commands** — when `supabase db push` fails, the user gets `supabase migration repair --status reverted 20260410110520` to copy-paste
4. **Credentials left as placeholders** — `supaflow.json` is created with `https://<project-ref>.supabase.co` even when real values exist in `.env`
5. **No clear "done" moment** — the summary is a technical changelog, not a celebration
6. **No guidance on what to do next** — no dashboard URL, no "run this to start"

## Design Principles

1. **Init = infrastructure only.** Copy runtime, create schema, install dashboard, create config. No code instrumentation — that's `/supaflow:scan`.
2. **Zero manual commands in any path.** Either the init handles it, or it tells the user what's missing so they can fix the precondition and re-run.
3. **Progress, not process.** Show `✓ Runtime copied`, not the `cp` command or import fixups.
4. **Auto-detect everything.** Credentials from `.env` / `.env.local` / `config.toml` — never ask the user to type them.
5. **Two outcomes only:** "Ready" or "Not yet — here's what's missing."

## Flow

### Entry: Detect Project State

Check for Supabase project:

```
EXISTS: supabase/ directory
EXISTS: credentials in .env, .env.local, or supabase/config.toml
```

**Four possible states:**

| State | Condition | Behavior |
|---|---|---|
| **No Supabase** | No `supabase/` dir | Show "Supabase needed" message, stop |
| **Supabase, no credentials** | `supabase/` exists but no URL/key found | Show "credentials needed" message, stop |
| **No Supabase CLI** | `supabase/` + credentials exist but `supabase` command not found | Show "CLI needed" message, stop |
| **Ready** | `supabase/` + credentials + CLI found | Proceed to install |

**Behavioral change from current init:** The old init asked the user to type in credentials interactively when not found in `.env`. The new init does NOT ask — it stops and tells the user to add them to `.env` first. This is intentional: interactive credential entry is error-prone and credentials should live in `.env` anyway.

### State: No Supabase

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow braucht ein Supabase-Projekt.

  Erstell eins auf supabase.com und verbinde es
  mit diesem Repo. Danach lauf /supaflow:init
  nochmal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

No CLI commands. No technical steps. The user knows how to set up Supabase or can find out — that's not Supaflow's scope.

### State: No Credentials

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supabase-Projekt gefunden, aber Credentials
  fehlen.

  Trag SUPABASE_URL und SUPABASE_ANON_KEY in
  deine .env ein. Du findest sie im Supabase
  Dashboard unter Settings → API.

  Danach lauf /supaflow:init nochmal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### State: No Supabase CLI

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supabase CLI nicht gefunden.

  Installier es mit: brew install supabase/tap/supabase
  oder: npm install -g supabase

  Danach lauf /supaflow:init nochmal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Note: This is the one exception to "no CLI commands" — installing a system tool is a genuine prerequisite the user must do themselves, and the install commands are standard (brew/npm).

### State: Ready → Install

Execute all steps silently. Show only progress lines:

```
Installing Supaflow...
  ✓ Runtime
  ✓ Database schema
  ✓ Dashboard
  ✓ Config
```

Each step either succeeds (✓) or the init stops and reports what went wrong in plain language.

**Step details (internal — not shown to user):**

1. **Runtime** — Copy `${CLAUDE_PLUGIN_ROOT}/assets/supaflow.ts` to `supabase/functions/_shared/supaflow.ts`. Create `_shared/` if needed. Fix imports to match project convention (detect from existing code). `CLAUDE_PLUGIN_ROOT` is set automatically by Claude Code when running a plugin command — it points to the plugin's root directory.
2. **Database schema** — Copy `${CLAUDE_PLUGIN_ROOT}/assets/supaflow_schema.sql` to `supabase/migrations/{TIMESTAMP}_supaflow.sql`, then run `supabase db push`. On failure: attempt automatic recovery (`supabase migration repair` etc.). If recovery fails: stop with plain-language message about database connection.
3. **Dashboard** — Copy `${CLAUDE_PLUGIN_ROOT}/assets/dashboard/` to `dashboard/` in project root. Then run `cd dashboard && npm install`. On `npm install` failure (missing Node.js, network issues): stop with "Dashboard-Abhängigkeiten konnten nicht installiert werden. Prüf ob Node.js installiert ist und du online bist, dann lauf /supaflow:init nochmal."
4. **Config** — Create `supaflow.json` in project root with auto-detected credentials from `.env` / `.env.local` / `config.toml`. Never use placeholders when real values are available.

**Schema recovery logic:**

If `supabase db push` fails:
1. Parse the error message
2. If "remote migrations not found locally" → run `supabase migration repair` automatically, then retry
3. If "no connection" → stop with: "Keine Verbindung zur Datenbank. Prüf ob dein Supabase-Projekt erreichbar ist und lauf /supaflow:init nochmal."
4. Any other error → stop with the error reason in plain language, no raw CLI output

### Done Screen — Happy Path

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow is ready.

  ✓ Runtime, Schema, Dashboard — alles installiert
  ✓ {N} Edge Functions gefunden

  Nächster Schritt:
    /supaflow:scan — instrumentiert deine Functions
    mit Retries, Error Handling und Workflow Tracking.

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

**`{N}` = count of subdirectories in `supabase/functions/` excluding `_shared/` and `_utils/`.**

### Done Screen — No Edge Functions Yet

If `supabase/functions/` is empty or only has `_shared/`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow is ready.

  ✓ Runtime, Schema, Dashboard — alles installiert

  Noch keine Edge Functions gefunden.
  Schreib deine erste Function, dann lauf
  /supaflow:scan um sie zu instrumentieren.

  Dashboard:
    cd dashboard && npm run dev → http://localhost:3001

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Update Mode

When `supaflow.json` already exists, the init is an update — only refresh runtime and dashboard assets.

**Detection:** `supaflow.json` exists in project root.

**Steps:** Copy runtime + dashboard only. No schema, no config, no scan.

**Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Supaflow updated.

  ✓ Runtime
  ✓ Dashboard

  Schema und Config wurden nicht verändert.
  Run /supaflow:scan wenn du Functions neu
  instrumentieren willst.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## What Changes in the Codebase

### `commands/init.md` — Full Rewrite

Replace the current 8-step process with the 3-phase flow described above. Key changes:
- Remove step 7 (scan and instrument) entirely — that's `/supaflow:scan`
- Add precondition checks (no Supabase, no credentials) with plain-language messages
- Add schema recovery logic (auto-repair before giving up)
- Replace the report template with the new done screens
- Add explicit instruction: "No technical output during install. Only progress lines."

### `skills/supaflow/SKILL.md` — No Changes

The skill is about instrumentation decisions. It's used by `/supaflow:scan`, not by init.

### `commands/scan.md` — No Changes

Scan already works as a separate command. The only change is that init now explicitly points to it as the next step.

## Output Rules (for the init command)

These rules govern what Claude outputs during the init process:

1. **No thinking out loud.** No "Key observations before instrumenting", no "Let me check the dashboard config".
2. **No file paths in user-facing output.** Say "Runtime" not "supabase/functions/_shared/supaflow.ts".
3. **No CLI commands as instructions.** Either do it or say what's missing.
4. **No diffs or code changes shown.** The user didn't ask to see code.
5. **Progress lines use ✓ or ✗ only.** No ○, no →, no bullets.
6. **One done screen.** Not repeated. Not summarized again after.
7. **Language matches the user's language.** If the project/conversation is in German, output in German. If English, English. The example screens in this spec use mixed language for illustration — the implementer must output consistently in one language per session.

## Non-Goals

- Init does not instrument Edge Functions (that's scan)
- Init does not create a Supabase project (that's supabase.com)
- Init does not teach the user what Supaflow does (that's the README)
- Init does not commit changes (user reviews first)
