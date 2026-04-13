# Init UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `commands/init.md` so that `/supaflow:init` delivers a zero-manual-commands, progress-driven setup experience.

**Architecture:** Single command file rewrite. No new files, no code changes, no runtime changes. The command file is a Claude Code plugin instruction that tells Claude how to behave when the user runs `/supaflow:init`.

**Tech Stack:** Markdown (Claude Code command format)

**Spec:** `docs/superpowers/specs/2026-04-13-init-ux-redesign.md`

---

## File Map

- Modify: `commands/init.md` — full rewrite

No other files are created or modified.

---

### Task 1: Rewrite commands/init.md

**Files:**
- Modify: `commands/init.md` (full rewrite, preserve frontmatter)

The new command file must implement the spec's 3-phase flow. Below is the exact structure.

- [ ] **Step 1: Read the current file and spec**

Read both files to have full context:
- `commands/init.md` — current implementation (preserve `name` and `description` from frontmatter)
- `docs/superpowers/specs/2026-04-13-init-ux-redesign.md` — the spec to implement

- [ ] **Step 2: Write the new commands/init.md**

Rewrite the file completely. The new structure must be:

```markdown
---
name: supaflow-init
description: Initialize or update Supaflow in the current project. Fresh install sets up runtime, schema, dashboard, and config. Re-run updates runtime and dashboard without touching schema or config.
---

# /supaflow:init — Initialize or Update Supaflow

## Output Rules — READ FIRST

{Copy all 7 output rules from spec section "Output Rules" verbatim.
These rules override your default behavior for this entire command.
Place them at the top so Claude reads them before executing any step.}

## Mode Detection

Check if `supaflow.json` exists in the project root:
- Does NOT exist → Fresh Install
- Exists → Update Mode

---

## Fresh Install

### Phase 1: Detect

Check preconditions in this order. Stop at the first failure.

1. Check: does `supabase/` directory exist?
   - No → output the "No Supabase" screen, stop
2. Check: do credentials exist in `.env`, `.env.local`, or `supabase/config.toml`?
   Look for `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`).
   - No → output the "No Credentials" screen, stop
3. Check: is `supabase` CLI available? (`which supabase`)
   - No → output the "No CLI" screen, stop

If all pass → proceed to Phase 2.

{Include the exact screen templates from the spec for each failure state}

### Phase 2: Install

Output: `Installing Supaflow...`

Execute these 4 steps. After each success, output `  ✓ {step name}`.
On failure, output `  ✗ {step name}` with a plain-language error message and stop.

**Step 1: Runtime**
- Create `supabase/functions/_shared/` if it doesn't exist
- Copy `${CLAUDE_PLUGIN_ROOT}/assets/supaflow.ts` → `supabase/functions/_shared/supaflow.ts`
- Detect the project's import convention from existing Edge Function code
  (e.g. `jsr:` vs `https://esm.sh` vs `npm:`)
- If the runtime's imports don't match → fix them silently

**Step 2: Database schema**
- `TIMESTAMP=$(date +%Y%m%d%H%M%S)`
- Copy `${CLAUDE_PLUGIN_ROOT}/assets/supaflow_schema.sql` → `supabase/migrations/${TIMESTAMP}_supaflow.sql`
- Run `supabase db push`
- On failure: attempt recovery
  - If error contains "remote migration" / "not found locally" → run `supabase migration repair` for the conflicting migration, then retry `supabase db push`
  - If error contains "connect" / "connection" / "refused" → stop with: database connection error message
  - Any other error → stop with plain-language description, no raw CLI output

**Step 3: Dashboard**
- Copy `${CLAUDE_PLUGIN_ROOT}/assets/dashboard/` → `dashboard/` in project root
  (copy src/, index.html, vite.config.ts, package.json, tsconfig*.json)
- Run `cd dashboard && npm install`
- On failure → stop with: npm install error message

**Step 4: Config**
- Read credentials from the source found in Phase 1
- Create `supaflow.json` in project root:
  ```json
  {
    "supabase_url": "<real value from .env>",
    "supabase_anon_key": "<real value from .env>",
    "dashboard_port": 3001
  }
  ```
- NEVER use placeholder values. If real values were found (they were — Phase 1 passed), use them.

### Phase 3: Done

Count Edge Functions: subdirectories in `supabase/functions/` excluding `_shared/` and `_utils/`.

If count > 0 → output the "Happy Path" done screen with {N} replaced.
If count = 0 → output the "No Edge Functions" done screen.

{Include the exact done screen templates from the spec, including ASCII art}

---

## Update Mode

1. Run Phase 2 Step 1 (Runtime) only
2. Run Phase 2 Step 3 (Dashboard) only
3. Output the update done screen

{Include the exact update screen template from the spec}

---

## Error Handling

- Every failure stops the init and outputs a plain-language message
- Never show raw CLI output, error codes, or stack traces
- Every error message ends with "... und lauf /supaflow:init nochmal"
  (or English equivalent matching the conversation language)
- Do NOT ask the user what to do. Either recover automatically or tell them what's missing.
```

The actual content must fill in all `{...}` placeholders with the exact screen templates from the spec. The structure above is the skeleton — the implementer copies the screen text verbatim from the spec.

- [ ] **Step 3: Verify the rewrite**

Read the new `commands/init.md` and verify:
1. Frontmatter `name: supaflow-init` and `description` are present
2. Output Rules section exists at the top
3. All 4 precondition states have screen templates
4. All 4 install steps have clear instructions
5. Schema recovery logic is present
6. All 3 done screens (happy, no functions, update) are present with ASCII art where applicable
7. No references to "scan and instrument" or step 7 from the old init
8. No `?` in instructional text (no questions to the user)

- [ ] **Step 4: Commit**

```bash
git add commands/init.md
git commit -m "feat: rewrite init command for zero-manual-commands UX

Redesigns /supaflow:init from 8-step developer-centric process to
3-phase user-friendly flow: detect → install → done.

- Precondition checks with plain-language messages
- Silent install with progress lines
- Auto-detect credentials from .env
- Schema recovery on failure
- Removes inline instrumentation (now /supaflow:scan only)

Spec: docs/superpowers/specs/2026-04-13-init-ux-redesign.md"
```
