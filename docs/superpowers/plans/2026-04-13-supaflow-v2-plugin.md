# Supaflow v2 — Claude Code Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Supaflow from a standalone project into a Claude Code Plugin — with a Skill (SKILL.md), Init Command, Scan Command, Continuous Hook, and marketplace distribution.

**Architecture:** The repo root becomes the plugin root. v1 artifacts (runtime, schema, dashboard) move into `assets/`. New plugin-specific files (plugin.json, SKILL.md, commands, hooks) are created at the plugin root. The plugin installs into user projects via `/supaflow:init`.

**Tech Stack:** Claude Code Plugin system, Markdown (skills/commands), JSON (hooks/manifest), existing TypeScript runtime + React dashboard as assets.

**Spec:** `docs/superpowers/specs/2026-04-13-supaflow-v2-plugin-design.md`

---

## File Structure

### Move (v1 artifacts → assets/)

| From | To |
|---|---|
| `supabase/functions/_shared/supaflow.ts` | `assets/supaflow.ts` |
| `supabase/migrations/20260413000000_supaflow_schema.sql` | `assets/supaflow_schema.sql` |
| `dashboard/` (entire directory) | `assets/dashboard/` |

### Delete

| File | Reason |
|---|---|
| `supabase/functions/example-workflow/` | Example is useful for testing, but not part of plugin. Move to docs or delete. |
| `supabase/functions/tests/supaflow.test.ts` | Tests move to `assets/tests/` for reference, or stay for CI. |
| `supabase/` (empty structure after moves) | No longer needed at root |
| `supaflow.json` | Created per-project by init command, not part of plugin |
| `deno.json` | Project-level config, not plugin |
| `deno.lock` | Project-level lockfile |
| `.env.local` | Project-level env |

### Create

| File | Responsibility |
|---|---|
| `.claude-plugin/plugin.json` | Plugin manifest: name, version, description |
| `skills/supaflow/SKILL.md` | The brain: principles, runtime API reference, decision framework |
| `commands/supaflow-init.md` | Init command: detect project, copy assets, apply schema, full scan |
| `commands/supaflow-scan.md` | On-demand scan: full scan of all Edge Functions |
| `hooks/hooks.json` | Continuous mode: PostToolUse hook for file edits |
| `marketplace.json` | Own GitHub marketplace for distribution |
| `settings.json` | Default plugin settings (empty for now) |

### Keep (unchanged)

| File | Reason |
|---|---|
| `SETUP.md` | Update content, keep file |
| `CLAUDE.md` | Update content, keep file |
| `CHANGELOG.md` | Update content, keep file |
| `docs/superpowers/specs/` | Design specs, keep for reference |

---

## Task 1: Plugin Manifest

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `settings.json`

- [ ] **Step 1: Create plugin.json**

Create `.claude-plugin/plugin.json`:

```json
{
  "name": "supaflow",
  "version": "0.1.0",
  "description": "Automatic workflow instrumentation for Supabase Edge Functions. Adds retries, error handling, logging, idempotency, and dead letter queues — Claude does the work, you write normal TypeScript.",
  "author": {
    "name": "Yves Schleich"
  },
  "repository": "https://github.com/yves-s/edge-flow",
  "license": "MIT",
  "keywords": ["supabase", "workflows", "observability", "edge-functions", "retries", "error-handling"]
}
```

- [ ] **Step 2: Create settings.json**

Create `settings.json` at plugin root:

```json
{}
```

- [ ] **Step 3: Create marketplace.json**

Create `marketplace.json` at repo root:

```json
{
  "plugins": [
    {
      "name": "supaflow",
      "description": "Automatic workflow instrumentation for Supabase Edge Functions",
      "path": "."
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json settings.json marketplace.json
git commit -m "feat: add Claude Code Plugin manifest and marketplace config"
```

---

## Task 2: Move v1 Assets

**Files:**
- Move: `supabase/functions/_shared/supaflow.ts` → `assets/supaflow.ts`
- Move: `supabase/migrations/20260413000000_supaflow_schema.sql` → `assets/supaflow_schema.sql`
- Move: `dashboard/` → `assets/dashboard/`
- Move: `supabase/functions/tests/supaflow.test.ts` → `assets/tests/supaflow.test.ts`
- Delete: `supabase/functions/example-workflow/`
- Delete: `supabase/` (empty after moves)
- Delete: `supaflow.json`
- Delete: `project.json`
- Delete: `deno.json`
- Delete: `deno.lock`

- [ ] **Step 1: Create assets directory and move files**

```bash
mkdir -p assets/tests
mv supabase/functions/_shared/supaflow.ts assets/supaflow.ts
mv supabase/migrations/20260413000000_supaflow_schema.sql assets/supaflow_schema.sql
mv supabase/functions/tests/supaflow.test.ts assets/tests/supaflow.test.ts
mv dashboard assets/dashboard
```

- [ ] **Step 2: Remove old structure**

```bash
rm -rf supabase/functions/example-workflow
rm -rf supabase
rm -f supaflow.json project.json deno.json deno.lock
```

- [ ] **Step 3: Verify assets are complete**

```bash
ls assets/supaflow.ts
ls assets/supaflow_schema.sql
ls assets/tests/supaflow.test.ts
ls assets/dashboard/package.json
ls assets/dashboard/src/App.tsx
```

All files must exist.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move v1 artifacts to assets/ for plugin distribution"
```

Note: Using `git add -A` here because we're moving/deleting many files across the tree. Ensure `.gitignore` from Task 7 is applied first, or explicitly stage: `git add assets/ && git add -u` to avoid accidentally committing `.claude/` or `.pipeline/` directories.

---

## Task 3: The Skill (SKILL.md)

**Files:**
- Create: `skills/supaflow/SKILL.md`

This is the most important file in the entire plugin. It teaches Claude how to instrument workflows.

- [ ] **Step 1: Create SKILL.md**

Create `skills/supaflow/SKILL.md`:

```markdown
---
name: supaflow
description: Automatic workflow instrumentation for Supabase Edge Functions. Scans code, adds retries, error handling, logging, idempotency, and DLQ. Use when working with Edge Functions or when /supaflow:init or /supaflow:scan is invoked.
---

# Supaflow — Workflow Instrumentation Skill

You are instrumenting Supabase Edge Functions with production-grade workflow patterns. The user writes normal TypeScript. You add the robustness layer.

## Principles

1. **Every external call is a failure point.** HTTP requests, third-party SDKs, external APIs — they will fail. Wrap them in `flow.step()` with retries.
2. **Every multi-step process needs observability.** If a function does 3+ things sequentially, each is a step. Track them so the dashboard shows the flow.
3. **Every webhook handler needs idempotency.** Webhooks retry. Use `supaflow.serve()` which deduplicates automatically.
4. **When unsure if something can fail: it can.** Instrument it. Over-instrumentation is cheap. A missed failure in production is expensive.
5. **The user never writes `flow.step()` directly.** You do. The user writes business logic. You wrap it.

## Runtime API

The Supaflow runtime lives at `supabase/functions/_shared/supaflow.ts` in the user's project.

### `supaflow.serve(name, handler)`

Replaces `Deno.serve()`. Wraps the entire Edge Function with:
- JSON request parsing
- Idempotency check (`Idempotency-Key` header or SHA-256 of body)
- Workflow run creation in Postgres
- Automatic error response on failure

```typescript
import { supaflow } from "./_shared/supaflow.ts";

export default supaflow.serve("workflow-name", async (flow) => {
  // workflow logic here
});
```

### `flow.input<T>()`

Returns the parsed request body with TypeScript generics.

```typescript
const { email, orderId } = flow.input<{ email: string; orderId: string }>();
```

### `flow.step(name, fn, options?)`

Executes a workflow step with retries, structured logging, timing, and DLQ on permanent failure.

```typescript
const result = await flow.step("step-name", () => someAsyncOperation());
```

**Error semantics:**
- On success: returns the function's return value
- On failure after all retries: **throws**. The run is marked as failed.
- For partial failure (continue despite step failure): wrap in try/catch

```typescript
// Partial failure — run continues even if one step fails
for (const item of items) {
  try {
    await flow.step(`process-${item.id}`, () => processItem(item));
  } catch {
    // step is in DLQ, but run continues with other items
  }
}
```

### `StepOptions`

```typescript
await flow.step("name", fn, {
  maxAttempts: 5,                    // default: 3
  backoff: [2000, 4000, 8000, 16000], // default: [1000, 2000, 4000]
  timeout: 60_000,                   // default: 30000 (ms)
});
```

## Decision Framework

When you see code that should be instrumented, ask yourself:

### Can this call fail?
External HTTP requests, database operations, file operations, third-party SDK calls — yes. Pure computations, string formatting, in-memory operations — no.

### Is it idempotent?
- **Yes** (GET requests, reads, queries): retry is safe. Use default 3 attempts.
- **No** (POST creating resources, payments, sends): use `maxAttempts: 1` or ensure the external service supports idempotency keys.

### How long should it take?
- Fast APIs (< 1s typical): default 30s timeout is fine
- Slow operations (file processing, AI inference, batch operations): increase timeout
- Known-slow services: set timeout based on the service's documented limits

### What happens on permanent failure?
- **Run should abort:** Let the step throw (default behavior). The entire run fails.
- **Run should continue:** Wrap in try/catch. The failed step goes to DLQ but other steps proceed.
- Choose based on whether remaining steps depend on this step's output.

### How many retries?
- **3 (default):** Good for transient network errors, brief outages
- **5+:** Rate-limited APIs (429s), services with known flaky availability
- **1:** Non-idempotent writes, payment processing, sends that shouldn't be duplicated

### Backoff strategy?
- **Default [1000, 2000, 4000]:** Good for most cases
- **Longer delays:** Rate-limited APIs — respect `Retry-After` headers
- **Shorter delays:** Internal services with fast recovery

### Are there known failure patterns for this service?
Use your knowledge about the specific API or service. Stripe has built-in idempotency keys. Twilio webhooks retry with exponential backoff. OpenAI returns 429 with `Retry-After`. Supabase Edge Functions have a 150s wall time. Tailor your instrumentation to what you know about the service.

## When NOT to Instrument

- Pure computation (math, string operations, array manipulation)
- In-memory state changes
- Synchronous operations that cannot fail
- Steps that are already wrapped in `flow.step()`

## Converting Existing Edge Functions

When scanning an existing Edge Function:

1. **Identify the entry point.** Replace `Deno.serve()` with `supaflow.serve()`.
2. **Identify external calls.** Each `fetch()`, SDK call, or database operation becomes a `flow.step()`.
3. **Identify loops over external calls.** Each iteration becomes a substep with partial failure handling.
4. **Keep business logic unchanged.** Only add the instrumentation wrapper, don't refactor the logic.
5. **Preserve the function's interface.** Same HTTP endpoint, same request/response format.
```

- [ ] **Step 2: Commit**

```bash
git add skills/supaflow/SKILL.md
git commit -m "feat: add supaflow skill — principles, API reference, decision framework"
```

---

## Task 4: Init Command

**Files:**
- Create: `commands/supaflow-init.md`

- [ ] **Step 1: Create the init command**

Create `commands/supaflow-init.md`:

```markdown
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

Execute ALL steps sequentially. Do not ask for confirmation between steps (except step 7).

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

### Error Handling

- If Supabase CLI is not available: warn, skip schema apply, continue
- If no Edge Functions found: skip scan, inform user ("no functions to instrument yet")
- If a function cannot be instrumented (too complex, unclear structure): skip it, report it
```

- [ ] **Step 2: Commit**

```bash
git add commands/supaflow-init.md
git commit -m "feat: add /supaflow:init command — project setup and full scan"
```

---

## Task 5: Scan Command

**Files:**
- Create: `commands/supaflow-scan.md`

- [ ] **Step 1: Create the scan command**

Create `commands/supaflow-scan.md`:

```markdown
---
name: supaflow-scan
description: Scan all Edge Functions and instrument any uninstrumented code with Supaflow patterns. Run this to catch gaps or after adding new functions.
---

# /supaflow:scan — Scan and Instrument Edge Functions

Full scan of all Edge Functions in the current project. Finds uninstrumented external calls, multi-step processes, and webhook handlers. Instruments them with Supaflow.

## Prerequisites

- Supaflow must be initialized (`supabase/functions/_shared/supaflow.ts` exists)
- If not: suggest running `/supaflow:init` first

## Steps

1. Load the `supaflow` skill
2. Find all Edge Functions: `supabase/functions/*/index.ts` (excluding `_shared/`, `tests/`)
3. For each function:
   a. Read the code
   b. Check if it uses `supaflow.serve()` — if not, it's an uninstrumented function
   c. Check if all external calls are wrapped in `flow.step()` — find gaps
   d. Instrument missing parts using the skill's decision framework
4. Report findings:

```
Supaflow scan complete:
  ✓ {N} functions scanned
  ✓ {M} already fully instrumented
  ⚡ {K} functions updated:
    - {function-name}: added {changes}
  ○ {J} functions skipped (no external calls detected)

Review the changes, then commit when ready.
```

Do NOT commit automatically. Let the user review.
```

- [ ] **Step 2: Commit**

```bash
git add commands/supaflow-scan.md
git commit -m "feat: add /supaflow:scan command — on-demand full scan"
```

---

## Task 6: Continuous Hook

**Files:**
- Create: `hooks/hooks.json`

- [ ] **Step 1: Create hooks.json**

Create `hooks/hooks.json`:

```json
{
  "hooks": [
    {
      "event": "PostToolUse",
      "match": {
        "tool": ["Edit", "Write"],
        "path": "supabase/functions/**/*.ts"
      },
      "instructions": "A file in supabase/functions/ was just edited. Check if Supaflow is installed in this project (does supabase/functions/_shared/supaflow.ts exist?). If yes, quickly review the changed file: are all external calls (fetch, SDK calls, API requests) wrapped in flow.step()? Are multi-step processes tracked? If anything is missing, load the supaflow skill and instrument the gaps. Only instrument the changed file, not the entire project. If the file is in _shared/ or tests/, skip instrumentation."
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/hooks.json
git commit -m "feat: add continuous hook — PostToolUse instrumentation check"
```

---

## Task 7: Update Docs

**Files:**
- Modify: `SETUP.md`
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`
- Modify: `.gitignore`

- [ ] **Step 1: Rewrite SETUP.md**

Replace entire content of `SETUP.md` with:

```markdown
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
```

- [ ] **Step 2: Update CLAUDE.md**

Update the Projekt and Architektur sections to reflect the plugin structure:

Projekt: "**Supaflow** – Claude Code Plugin for automatic workflow instrumentation on Supabase Edge Functions."

Architektur:
```
.claude-plugin/plugin.json         — Plugin manifest
skills/supaflow/SKILL.md           — Instrumentation skill (principles, API, decisions)
commands/supaflow-init.md          — /supaflow:init command
commands/supaflow-scan.md          — /supaflow:scan command
hooks/hooks.json                   — Continuous PostToolUse hook
assets/supaflow.ts                 — Runtime (copied to projects on init)
assets/supaflow_schema.sql         — Schema (copied to projects on init)
assets/dashboard/                  — Dashboard app (copied to projects on init)
assets/tests/                      — Runtime tests
marketplace.json                   — GitHub marketplace config
```

Commands: `claude --plugin-dir .` (development), `/plugin validate` (check manifest)

- [ ] **Step 3: Update CHANGELOG.md**

Add under `## [Unreleased]`:

```markdown
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
- Project-level deno.json, supaflow.json, .env.local (now created per-project by init)
```

- [ ] **Step 4: Update .gitignore**

Replace content with:

```
assets/dashboard/node_modules/
assets/dashboard/dist/
.superpowers/
.claude/
.pipeline/
.env.local
deno.lock
```

- [ ] **Step 5: Commit**

```bash
git add SETUP.md CLAUDE.md CHANGELOG.md .gitignore
git commit -m "docs: update docs for plugin structure"
```

---

## Task 8: Verify Plugin Structure

- [ ] **Step 1: Verify directory tree**

```bash
find . -not -path './assets/dashboard/node_modules/*' -not -path './.git/*' -not -path './.superpowers/*' -not -path './.claude/*' -not -path './.pipeline/*' -not -path './docs/*' | sort
```

Expected structure:
```
.
./.claude-plugin/plugin.json
./assets/dashboard/...
./assets/supaflow.ts
./assets/supaflow_schema.sql
./assets/tests/supaflow.test.ts
./CHANGELOG.md
./CLAUDE.md
./commands/supaflow-init.md
./commands/supaflow-scan.md
./hooks/hooks.json
./marketplace.json
./SETUP.md
./settings.json
./.gitignore
```

- [ ] **Step 2: Validate plugin**

```bash
claude --plugin-dir . -c "/plugin validate"
```

Expected: Plugin validation passes.

- [ ] **Step 3: Test plugin loads**

```bash
claude --plugin-dir .
```

In the session, verify:
- `/supaflow:init` appears as available command
- `/supaflow:scan` appears as available command
- The supaflow skill is discoverable

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: plugin structure adjustments"
```

Only if fixes were needed.
