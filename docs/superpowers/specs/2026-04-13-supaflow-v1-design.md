# Supaflow v1 — Design Spec

## What Is Supaflow?

A TypeScript runtime library + observability dashboard that adds retries, logging, idempotency, dead letter queues, and flow visualization to any workflow running on Supabase Edge Functions (or any Deno/TypeScript environment).

Workflows are written in code. Supaflow wraps each step with production-grade infrastructure. A React Flow dashboard visualizes runs and surfaces errors.

## Distribution

No CLI, no npm package. Three artifacts copied into the project:

| Artifact | Location | Purpose |
|---|---|---|
| `supaflow.ts` | `supabase/functions/_shared/supaflow.ts` | Runtime library |
| `supaflow_schema.sql` | `supabase/migrations/` | Postgres schema (4 tables) |
| `dashboard/` | `dashboard/` (Vite app) | React Flow observability UI |

The developer owns all code. No external dependency beyond Supabase client.

## Runtime API

### Basic Usage

```typescript
import { supaflow } from "./_shared/supaflow.ts";

export default supaflow.serve("order-fulfillment", async (flow) => {
  const { orderId } = flow.input<OrderRequest>();

  const order = await flow.step("validate", () => validateOrder(orderId));
  const payment = await flow.step("charge", () => chargePayment(order));

  for (const item of order.items) {
    await flow.step(`reserve-${item.sku}`, () => reserveStock(item));
  }

  await flow.step("confirm", () => sendEmail(order.email));
});
```

### `supaflow.serve(name, handler)`

Single entry point. Handles:
- `Deno.serve()` with request parsing
- Idempotency check (`Idempotency-Key` header, falls back to SHA-256 of request body)
- Run creation in DB
- HTTP response with run ID

Does NOT handle:
- Auth (developer's responsibility)
- Webhook signature validation (workflow-specific)
- Scheduling/cron (Supabase's job)

### `flow.input<T>()`

Returns parsed request body with TypeScript generics for type safety.

### `flow.step(name, fn, options?)`

Executes a workflow step with:
- Retries with exponential backoff (default: 3 attempts, 1s/2s/4s)
- Structured logging to `step_states` table
- Timing (duration_ms)
- Sequential ordering (auto-increment `order` per run)

Returns the step's return value on success. Throws after all retry attempts exhausted.

**Options:**

```typescript
interface StepOptions {
  maxAttempts?: number;    // default 3
  backoff?: number[];      // default [1000, 2000, 4000]
  timeout?: number;        // default 30000 (ms)
}
```

### Error Handling

**Step failure = run failure.** When a step exhausts all retries, it:
1. Writes the step to `dead_letter_queue`
2. Marks the step as `failed` in `step_states`
3. Throws an error
4. `supaflow.serve()` catches it, marks the run as `failed`, returns error response

**Partial failure** is opt-in via try/catch:

```typescript
for (const sub of subscriptions) {
  try {
    await flow.step(`unsub-${sub.id}`, () => unsubscribe(sub.id));
  } catch {
    // step is in DLQ, but run continues
  }
}
```

## Database Schema

Four tables. Based on existing migration with three added columns.

### Tables

**`idempotency_keys`** — Prevents duplicate execution on webhook retries.

```sql
create table idempotency_keys (
  key text primary key,
  created_at timestamptz not null default now()
);
```

**`workflow_runs`** — One record per trigger invocation.

```sql
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_name text not null,
  trigger_type text not null,
  trigger_payload jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms int,                -- NEW: computed at completion
  error text,
  metadata jsonb
);
```

**`step_states`** — Every logical step within a run.

```sql
create table step_states (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  step_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  input jsonb,
  output jsonb,
  attempt int not null default 1,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms int,                -- NEW: computed at completion
  "order" int not null default 0  -- NEW: execution order within run
);
```

**`dead_letter_queue`** — Permanently failed steps.

```sql
create table dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references workflow_runs(id) on delete cascade,
  step_name text not null,
  input jsonb,
  error text not null,
  attempts int not null default 1,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);
```

### Indexes

```sql
create index idx_workflow_runs_status on workflow_runs(status);
create index idx_step_states_run_id on step_states(run_id);
create index idx_step_states_order on step_states(run_id, "order");
create index idx_dead_letter_queue_run_id on dead_letter_queue(run_id);
create index idx_dead_letter_queue_unresolved on dead_letter_queue(resolved_at)
  where resolved_at is null;
```

### RLS

Read-only public access for dashboard. Service role full access for edge functions writing data. Production deployments should replace public read with `auth.uid()`-based policies.

## Dashboard

### Tech Stack

- **React Flow** (@xyflow/react) for workflow graph visualization
- **Vite** for build
- **Supabase JS client** for data fetching
- Deployed as static site (Supabase Hosting, Vercel, or any static host)

### Layout

Split view with four zones:

```
┌──────────┬───────────────────────────────────┬────────────┐
│          │  Metrics Bar (KPIs)               │            │
│ Sidebar  ├───────────────────────────────────┤  Detail    │
│          │  Run Header (name, status, time)  │  Panel     │
│ Workflows├───────────────────────────────────┤            │
│ + Runs   │                                   │  Input     │
│          │  React Flow Canvas                │  Output    │
│          │  (zoom, pan, minimap)             │  Error     │
│          │                                   │  Retries   │
│          │                                   │  DLQ       │
└──────────┴───────────────────────────────────┴────────────┘
```

### Sidebar

- **Workflows section**: Lists all distinct `workflow_name` values with run count and success rate
- **Recent Runs section**: Lists runs sorted by `started_at` desc, with status dot (green/red/amber), workflow name, time ago, duration

### Metrics Bar

Five KPIs computed from `workflow_runs` and `dead_letter_queue`:
- Total Runs
- Success Rate (%)
- Avg Duration (ms)
- DLQ Entries (unresolved)
- Currently Running

### Flow Graph

- **Nodes** = steps from `step_states` for the selected run, ordered by `order` column
- **Edges** = sequential connections between steps (derived from order); fan-out for parallel steps with shared prefix
- **Node colors**: green (completed), red (failed), amber (running), grey (pending/skipped)
- **Edge animation**: dashed animated stroke on edges leading to failed nodes
- **Interaction**: click node → Detail Panel shows step data
- **Controls**: zoom (scroll/pinch), pan (drag), fit-to-view button, minimap

### Detail Panel

Shown on node click. Displays:
- Step name
- Status (colored)
- Duration + attempt count
- Retry visualization (colored dots: green = pass, red = fail)
- Input (JSON)
- Output (JSON, if completed)
- Error (if failed)
- DLQ status (if queued)

### Data Flow

Dashboard connects to Supabase directly via anon key (read-only RLS). No backend API needed.

```
Dashboard (static site)
  → Supabase JS client
    → workflow_runs (list runs, metrics)
    → step_states (flow graph for selected run)
    → dead_letter_queue (DLQ entries, unresolved count)
```

### Flow Graph Construction

The graph is built from run data, not from a static schema:

1. Query `step_states` for a run, ordered by `order`
2. Steps execute sequentially → each step connects to the next
3. Steps with shared name prefix (e.g. `reserve-SKU001`, `reserve-SKU002`) are detected as fan-out from their common predecessor
4. Layout is computed by dagre (lightweight, standard React Flow layout lib)

A workflow that has never run shows an empty state. The first test run populates the graph.

## What Supaflow Does NOT Do

- **No auth** — developer handles authentication
- **No scheduling** — Supabase cron or external triggers
- **No workflow editor** — workflows are code
- **No CLI scaffolding** — copy files manually (CLI comes later)
- **No webhook validation** — workflow-specific concern
- **No multi-tenant isolation** — single-project scope

## File Structure (After Setup)

```
project/
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── supaflow.ts          ← runtime library
│   │   └── my-workflow/
│   │       └── index.ts             ← developer's workflow
│   └── migrations/
│       └── YYYYMMDD_supaflow.sql    ← schema
├── dashboard/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MetricsBar.tsx
│   │   │   ├── FlowGraph.tsx
│   │   │   └── DetailPanel.tsx
│   │   └── lib/
│   │       └── supabase.ts
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── supaflow.json                    ← config (supabase URL, anon key)
```

## Configuration

`supaflow.json` in project root:

```json
{
  "supabase_url": "https://xxx.supabase.co",
  "supabase_anon_key": "eyJ...",
  "dashboard_port": 3001
}
```

The runtime reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from environment variables (standard Supabase Edge Function env). The dashboard reads from `supaflow.json`; environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) override file values when set.
