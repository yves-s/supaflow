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
