# Supaflow

A Claude Code Plugin that automatically instruments your Supabase Edge Functions with retries, error handling, structured logging, idempotency, and dead letter queues.

You write normal TypeScript. Claude adds the robustness layer.

## Why

Workflow tools like n8n and Make are powerful, but they're not built for the AI-native development workflow. You can speed things up with MCP servers or by generating JSON configs — but you still end up in configuration hell. You're clicking through UIs, setting up connections, configuring integrations, handling error cases manually, adding retry logic by hand, testing each step one by one. When something breaks, you're on your own debugging it in a visual editor.

With Claude Code, you can now build workflows faster in pure code — including error handling, edge cases, retries, all of it. **Supaflow builds the layer on top that makes this accessible to everyone.** Install the plugin, and every Supabase Edge Function in your project gets automatic instrumentation: retries, idempotency, structured logging, dead letter queues. No config, no UI clicking, no manual wiring.

And for the people who don't read code — or for when you just need to see what's happening — there's a visualization and observability layer. A dashboard that shows workflow runs, step states, failures, and timing. Full transparency into what your functions are doing, without digging through logs. Complete observability, added to your project with a single command.

## What it does

Supaflow wraps your Edge Functions with production-grade workflow patterns:

- **Retries with backoff** for every external call (HTTP, SDK, database)
- **Idempotency** for webhook handlers (deduplicates by header or body hash)
- **Step tracking** with structured logging for observability
- **Dead letter queue** for permanently failed steps
- **Dashboard** to visualize workflow runs, step states, and failures

## How it works

Supaflow is a Claude Code Plugin with three components:

1. **A continuous hook** that watches for edits to `supabase/functions/**/*.ts` and automatically instruments uninstrumented code
2. **Two commands** (`/supaflow:init` and `/supaflow:scan`) for setup and full-project scanning
3. **A skill** that teaches Claude the decision framework for when and how to instrument

When you (or Claude) edit an Edge Function, the hook fires and checks if external calls are wrapped in `flow.step()`. If not, it instruments them — choosing retry counts, backoff strategies, and timeout values based on the type of service being called.

## Installation

```bash
# In your Supabase project directory:
claude --plugin github:yves-s/supaflow
```

Then run the init command:

```
/supaflow:init
```

This will:
1. Copy the runtime to `supabase/functions/_shared/supaflow.ts`
2. Create a database migration with the workflow schema
3. Apply the schema (`supabase db push`)
4. Install the dashboard app
5. Scan and instrument all existing Edge Functions

## Usage

### Automatic (recommended)

Just write your Edge Functions normally. The PostToolUse hook detects edits to `supabase/functions/` and instruments them automatically.

### Manual scan

```
/supaflow:scan
```

Scans all Edge Functions and instruments any gaps.

### Audit DLQ errors

```
/supaflow:audit
```

Analyzes unresolved Dead Letter Queue entries, groups them by error pattern, reads the relevant Edge Function code, and proposes targeted fixes. Works for any workflow or API — no hardcoded patterns. Confirms before applying each fix.

## API

### `supaflow.serve(name, handler)`

Replaces `Deno.serve()`. Adds idempotency, run tracking, and error handling.

```typescript
import { supaflow } from "./_shared/supaflow.ts";

export default supaflow.serve("process-order", async (flow) => {
  const { orderId } = flow.input<{ orderId: string }>();

  const order = await flow.step("fetch-order", () =>
    fetch(`https://api.example.com/orders/${orderId}`).then(r => r.json())
  );

  await flow.step("send-confirmation", () =>
    sendEmail(order.email, "Order confirmed")
  );
});
```

### `flow.step(name, fn, options?)`

Wraps an async operation with retries, timing, and DLQ on permanent failure.

```typescript
await flow.step("call-stripe", () => stripe.charges.create({ ... }), {
  maxAttempts: 5,
  backoff: [2000, 4000, 8000, 16000],
  timeout: 60_000,
});
```

### `flow.input<T>()`

Returns the parsed request body with TypeScript generics.

## Database Schema

Supaflow creates four tables:

| Table | Purpose |
|---|---|
| `workflow_runs` | One record per Edge Function invocation |
| `step_states` | Every step within a run (status, timing, attempts) |
| `dead_letter_queue` | Steps that failed after all retries |
| `idempotency_keys` | Deduplication for webhook handlers |

All tables have RLS enabled with read access for the dashboard and write access for Edge Functions.

## License

MIT
