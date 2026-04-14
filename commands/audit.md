---
name: supaflow-audit
description: Analyze unresolved DLQ entries, group by error pattern, diagnose root causes using the relevant Edge Function code, and propose targeted fixes. Generalist — works for any workflow, any API, any error type. No hardcoded patterns.
---

# /supaflow:audit — DLQ Error Analysis

Diagnose why workflow steps are failing and propose fixes. Combines DLQ error data with the actual Edge Function code that produced the failures. The analysis is done by Claude — not a lookup table.

## Prerequisites

- Supaflow initialized (`supaflow.json` exists in project root)
- At least one unresolved DLQ entry

If `supaflow.json` is not found: output `Supaflow is not initialized. Run /supaflow:init first.` and stop.

## Steps

### 1. Load Credentials

Read `supaflow.json` from the project root. Use whichever tool is available:

```bash
# Option A — node (preferred when available)
SUPABASE_URL=$(node -e "process.stdout.write(require('./supaflow.json').supabase_url)")
SUPABASE_KEY=$(node -e "process.stdout.write(require('./supaflow.json').supabase_anon_key)")

# Option B — jq (fallback)
SUPABASE_URL=$(jq -r '.supabase_url' supaflow.json)
SUPABASE_KEY=$(jq -r '.supabase_anon_key' supaflow.json)

# Option C — python3 (last resort)
SUPABASE_URL=$(python3 -c "import json; d=json.load(open('supaflow.json')); print(d['supabase_url'], end='')")
SUPABASE_KEY=$(python3 -c "import json; d=json.load(open('supaflow.json')); print(d['supabase_anon_key'], end='')")
```

Try Option A first. If `node` is not found, try Option B, then Option C. If none of the three are available, output: `Cannot parse supaflow.json — install node, jq, or python3 and retry.` and stop.

### 2. Query Unresolved DLQ Entries

```bash
curl -s "${SUPABASE_URL}/rest/v1/dead_letter_queue?resolved_at=is.null&select=id,workflow_name,step_name,input,error,attempts,created_at&order=created_at.desc&limit=200" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}"
```

If the response is an empty array `[]`: output the following and stop:

```
No unresolved DLQ entries — your workflows are clean.
```

If the request fails (network error, auth error): show the raw error and suggest checking credentials in `supaflow.json`. Stop.

### 3. Cluster Entries by Error Pattern

Group entries by the combination of **normalized error text** and **step name prefix** (strip dynamic suffixes — see Error Handling section). Two entries belong to the same cluster only when both their error pattern and their step name pattern match. This prevents a generic error like "timeout" from merging unrelated steps across different workflows into a single cluster.

Normalize error text as follows. Normalization removes per-entry variation while preserving semantic structure:

- Replace UUIDs with `{id}`
- Replace email addresses with `{email}`
- Replace numeric IDs within text with `{N}`
- Keep API error codes, HTTP status codes, and error category names intact

For each cluster, collect:
- `count` — number of entries
- `workflow_names` — unique workflow names in this cluster
- `step_names` — unique step name patterns in this cluster
- `error_sample` — one full, un-normalized error text
- `first_at` / `last_at` — date range
- `input_sample` — the `input` field from the first entry (may be null)

### 4. Analyze Each Cluster

For each cluster:

**4a. Find the Edge Function code**

Attempt to read: `supabase/functions/{workflow_name}/index.ts`

If the file exists: read it and use it in the analysis.
If the file does not exist: mark as "function not in this project" and continue.

**4b. Analyze the combination**

Read the error text AND the function code together. Determine:

1. **What is the error?** What did the external service or system return? Is it transient (will resolve on retry) or permanent (a code or config issue)?

2. **Where in the code does this happen?** Which `flow.step()` call, and what is the step doing?

3. **Why is it failing?** What is the root cause?

**4c. Classify the root cause** into one of:

| Category | Meaning |
|---|---|
| `idempotency` | Operation already applied — treating as failure is wrong, should be no-op |
| `validation` | Data doesn't meet the API's requirements — fix input guard or upstream data |
| `transient` | Rate limit, timeout, brief outage — increase retries or backoff |
| `auth` | Credential or permission issue — fix config |
| `logic` | Code bug — step logic is incorrect |
| `unknown` | Cannot determine from available context |

**4d. Formulate a concrete fix**

- `idempotency`: catch the specific error condition and return early (treat as success)
- `validation`: add a guard condition before the step, or fix the data transformation
- `transient`: increase `maxAttempts` or adjust `backoff` in `StepOptions`
- `auth`: explain which credential to check and where
- `logic`: describe the specific code change needed
- `unknown`: describe what additional context would help diagnose

### 5. Output Structured Report

Present clusters in descending order by entry count. One block per cluster:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Cluster {N} of {total}  ·  {count} entries

  Workflow:  {workflow_names}
  Step:      {step_names}
  Period:    {first_at} – {last_at}

  Error:
    {error_sample}

  Diagnosis:
    {1–3 sentences. Reference specific code if found.
     Explain what is happening and why.}

  Root cause: {category}

  Fix:
    {Concrete description. For code fixes: show the
     relevant before/after snippet.}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

After all clusters, show the summary line:

```
{total} cluster(s) · {entry_count} entries total
{fixable} fixable in code — {config} require config/data changes — {unknown} unknown
```

### 6. Confirm and Apply Fixes

For each cluster where the fix involves a code change (categories: `idempotency`, `validation`, `logic`):

```
Apply fix for Cluster {N}? [yes / skip]
```

If confirmed:

1. Read the Edge Function file
2. Apply the minimal change that addresses the root cause
3. Do NOT refactor surrounding code
4. Do NOT add features beyond the fix
5. Show the diff after applying

Do NOT commit automatically. The user reviews and commits when ready.

If the fix is `transient` or `auth`: explain what to change, but do not edit files automatically (these are config/ops changes, not code fixes).

### 7. Resolve DLQ Entries

After applying a fix (or if the user wants to clean up without a code fix), offer to mark the entries as resolved:

```
Mark {count} entries for Cluster {N} as resolved? [yes / skip]
```

If yes, attempt the PATCH with the anon key. Use both `workflow_name` and `step_name` in the filter to scope the update to exactly this cluster and avoid accidentally resolving entries from other clusters that share the same workflow name:

```bash
RESOLVED_AT=$(node -e "process.stdout.write(new Date().toISOString())")
curl -s -X PATCH \
  "${SUPABASE_URL}/rest/v1/dead_letter_queue?workflow_name=eq.{workflow_name}&step_name=eq.{step_name}&resolved_at=is.null" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"resolved_at\": \"${RESOLVED_AT}\", \"resolved_by\": \"supaflow:audit\"}"
```

If a cluster spans multiple step names, run the PATCH once per unique `step_name` in the cluster.

**If the PATCH returns 403 (RLS blocks writes via anon key):** The write policy requires service role. Output the equivalent SQL so the user can run it manually via the Supabase dashboard or MCP:

```sql
UPDATE dead_letter_queue
SET resolved_at = now(), resolved_by = 'supaflow:audit'
WHERE workflow_name = '{workflow_name}'
  AND step_name = '{step_name}'
  AND resolved_at IS NULL;
```

If the cluster spans multiple step names, include them with `step_name IN ('{step_name_1}', '{step_name_2}')` instead.

### 8. Final Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Audit complete.

  ✓ {N} cluster(s) analyzed
  ✓ {M} fix(es) applied
  ✓ {K} DLQ entries marked resolved

  Next steps:
    - Review the changes in the affected functions
    - Deploy the updated functions: supabase functions deploy {name}
    - Run /supaflow:audit again to verify the queue stays clean

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If nothing was changed: `No changes made. Run /supaflow:audit again after addressing the issues manually.`

## Error Handling

| Situation | Response |
|---|---|
| `supaflow.json` not found | `Supaflow is not initialized. Run /supaflow:init first.` |
| DLQ query returns 401/403 | Check that `supabase_anon_key` in `supaflow.json` is correct |
| DLQ query fails (network) | Show raw error, suggest checking `supabase_url` |
| Edge Function file not found | Note in cluster as "function not in this project — fix must be applied manually" |
| Fix cannot be determined | Classify as `unknown`, describe what context would help |
| Step name is dynamic (e.g. `send:{id}`) | Strip the dynamic suffix for file lookup, use full name in report |
