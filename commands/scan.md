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
