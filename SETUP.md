# Supaflow — Setup Guide

Supaflow is a TypeScript workflow runtime with built-in retries, idempotency, dead letter queues, and a React Flow observability dashboard. All state lives in Postgres.

---

## Quick Start

### 1. Apply the schema

```bash
supabase db push
```

### 2. Write a workflow

```typescript
import { supaflow } from "./_shared/supaflow.ts";

export default supaflow.serve("my-workflow", async (flow) => {
  const { email } = flow.input<{ email: string }>();

  const user = await flow.step("lookup-user", () => findUser(email));
  await flow.step("send-welcome", () => sendEmail(user.id));
});
```

### 3. Run it

```bash
deno task example
```

```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORD-001", "email": "test@example.com", "items": [{"sku": "A", "quantity": 1, "price": 10}]}'
```

### 4. Open the dashboard

```bash
cd dashboard && npm install && npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## API Reference

### `supaflow.serve(name, handler)`

Wraps `Deno.serve()`. Handles JSON parsing, idempotency (`Idempotency-Key` header or SHA-256 of body), run creation, and error responses.

```typescript
export default supaflow.serve("workflow-name", async (flow) => {
  // workflow logic
});
```

### `flow.input<T>()`

Returns the parsed request body with TypeScript generics for type safety.

### `flow.step(name, fn, options?)`

Executes a workflow step with retries, structured logging, and DLQ on failure.

- On success: returns the step function's return value
- On failure (after all retries): throws, writes to DLQ, marks run as failed
- Partial failure: wrap in try/catch to continue the run

**Options:**

| Option | Default | Description |
|---|---|---|
| `maxAttempts` | 3 | Number of retry attempts |
| `backoff` | [1000, 2000, 4000] | Delay (ms) between retries |
| `timeout` | 30000 | Step timeout in ms |

---

## Schema

Four Postgres tables:

| Table | Purpose |
|---|---|
| `idempotency_keys` | Deduplicates webhook retries |
| `workflow_runs` | One record per trigger (status, duration, error) |
| `step_states` | Every step with input, output, retries, duration, order |
| `dead_letter_queue` | Failed steps for manual intervention |

---

## Dashboard

React Flow observability UI. Connects to Supabase directly via anon key.

**Features:**
- Workflow list with run counts and success rates
- Run history with status, duration, time
- Interactive flow graph (zoom, pan, minimap)
- Step detail panel (input, output, error, retries, DLQ status)
- Metrics bar (total runs, success rate, avg duration, DLQ count, running)

---

## Configuration

`supaflow.json` in project root:

```json
{
  "supabase_url": "https://xxx.supabase.co",
  "supabase_anon_key": "eyJ...",
  "dashboard_port": 3001
}
```

Runtime reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment variables.
Dashboard reads from `supaflow.json`; env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) override.

---

## Tests

```bash
deno task test
```

---

## Architecture

```
Webhook Request
  └── supaflow.serve("workflow-name", handler)
        ├── Idempotency check      → idempotency_keys
        ├── Create run              → workflow_runs
        ├── flow.step("step-1")     → step_states (retry × N)
        ├── flow.step("step-2")     → step_states (retry × N)
        │     └── on final failure  → dead_letter_queue
        └── Complete run            → workflow_runs

Dashboard (Vite + React Flow)
  └── Supabase JS client (anon key, read-only)
        ├── workflow_runs   → sidebar, metrics
        ├── step_states     → flow graph
        └── dead_letter_queue → DLQ panel
```
