# EdgeFlow — Setup Guide

> **The argument:** n8n gives you a drag-and-drop canvas. Claude + Supabase Edge Functions gives you the same result — with retries, idempotency, DLQ, and a live observability dashboard — in a fraction of the time. No separate service, no vendor lock-in, just code that runs anywhere Deno runs.

EdgeFlow is a production-ready workflow engine built entirely on Supabase Edge Functions. No n8n. No Make. No Zapier. All state lives in Postgres.

---

## Demo Case: Klaviyo → HubSpot Unsubscribe Sync

When migrating from HubSpot to Klaviyo, unsubscribes need to be synchronized back. This demo implements the full workflow with realistic mock API calls and all the production patterns you'd need:

- **Idempotency** — webhook retries are deduplicated automatically
- **Retries with exponential backoff** — 3 attempts (1s / 2s / 4s delays) per step
- **Dead Letter Queue** — permanently failed steps are captured for manual intervention
- **Structured logging** — every step's input, output, and error is stored in Postgres
- **Live observability dashboard** — metrics, step timeline, and DLQ — no external tool needed

---

## Local Development (Recommended)

Run both services locally with zero deployment:

```bash
# Terminal 1 — Webhook receiver
deno task webhook

# Terminal 2 — Observability dashboard
deno task dashboard
```

Open: [http://localhost:8001](http://localhost:8001)

The dashboard connects to your Supabase project directly. No local database needed.

---

## Schema

Four tables form the EdgeFlow engine:

| Table | Purpose |
|---|---|
| `idempotency_keys` | Prevents duplicate execution on webhook retries |
| `workflow_runs` | One record per trigger (pending → running → completed/failed) |
| `step_states` | Tracks every logical step with retry count, input/output, errors |
| `dead_letter_queue` | Permanently failed steps that need manual intervention |

Apply the migration:

```bash
supabase db push
# or
supabase migration up
```

---

## Scenarios

| Scenario | Behavior |
|---|---|
| `happy` | All 3 unsubscribes succeed |
| `partial_failure` | Subscription `sub_002` fails after 3 retries → DLQ |
| `total_failure` | All unsubscribes fail → 3 DLQ entries |
| `slow` | 2s delay per step (shows timing in metrics) |
| `duplicate` | Same request sent twice — second is idempotency-skipped |

---

## Test

```bash
deno test --allow-env supabase/functions/tests/klaviyo-unsubscribe.test.ts
```

---

## Trigger Manually

```bash
curl -X POST http://localhost:8000 \
  -H "Authorization: Bearer dc3cb30dfe1614cc61933efcd8ede51314d65f4c58e6e1b3" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "scenario": "happy"}'
```

---

## Deploy to Supabase (Optional)

### 1. Set Secrets

```bash
supabase secrets set WEBHOOK_SECRET=your-secret-here
supabase secrets set KLAVIYO_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/klaviyo-unsubscribe
```

### 2. Deploy Edge Functions

```bash
supabase functions deploy klaviyo-unsubscribe
supabase functions deploy demo-dashboard
```

---

## Architecture

```
Webhook
  └── klaviyo-unsubscribe (Edge Function)
        ├── checkIdempotency()     -> idempotency_keys
        ├── createRun()            -> workflow_runs
        ├── executeStep("extract_email")
        ├── executeStep("fetch_subscriptions")   <- mockGetSubscriptions
        ├── executeStep("unsubscribe_sub_001")   <- mockUnsubscribe (retry x 3)
        ├── executeStep("unsubscribe_sub_002")   <- mockUnsubscribe (retry x 3)
        ├── executeStep("unsubscribe_sub_003")   <- mockUnsubscribe (retry x 3)
        │     └── on final failure -> dead_letter_queue
        └── completeRun()          -> workflow_runs

Dashboard (demo-dashboard Edge Function)
        ├── GET /            -> HTML observability UI
        ├── GET /api/metrics -> { total, completed, failed, dlqCount, successRate, avgMs }
        ├── GET /api/runs    -> workflow_runs + step_states
        ├── GET /api/dlq     -> dead_letter_queue entries
        └── POST /api/trigger -> proxies to klaviyo-unsubscribe
```

All state lives in Postgres. No Redis, no external queue, no n8n.

---

## Why Not n8n?

| | n8n | EdgeFlow |
|---|---|---|
| **Setup** | Docker or cloud subscription | `deno task webhook` |
| **State** | Internal DB (opaque) | Your Postgres — full control |
| **Retries** | Built-in, configurable in UI | Code — explicit, version-controlled |
| **Idempotency** | Manual workarounds | Built-in, insert-on-conflict |
| **Observability** | n8n execution log | Custom dashboard, queryable via SQL |
| **Cost** | $20–50+/month cloud | $0 (Supabase free tier) |
| **Speed to build** | Drag canvas + configure | Describe to Claude → done |
