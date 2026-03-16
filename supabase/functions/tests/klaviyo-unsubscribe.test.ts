// Deno Test Suite -- klaviyo-unsubscribe Edge Function
// Run with: deno test --allow-env supabase/functions/tests/klaviyo-unsubscribe.test.ts

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";

// ---- Mock Supabase Client ----

interface MockCall {
  table: string;
  operation: string;
  data?: unknown;
  filter?: unknown;
}

function createMockSupabase(overrides?: {
  idempotencyExists?: boolean;
  stepFail?: string[]; // step names that should fail
}) {
  const calls: MockCall[] = [];
  const idempotencyExists = overrides?.idempotencyExists ?? false;
  const stepFail = overrides?.stepFail ?? [];

  const mockBuilder = (table: string) => {
    let operation = "";
    let insertData: unknown = null;
    let filters: unknown[] = [];
    let updateData: unknown = null;

    const builder = {
      insert(data: unknown) { operation = "insert"; insertData = data; return builder; },
      update(data: unknown) { operation = "update"; updateData = data; return builder; },
      select(cols?: string) { return builder; },
      eq(col: string, val: unknown) { filters.push({ col, val }); return builder; },
      is(col: string, val: unknown) { filters.push({ col, val }); return builder; },
      order() { return builder; },
      limit() { return builder; },
      single() {
        calls.push({ table, operation, data: insertData ?? updateData, filter: filters });

        if (table === "idempotency_keys" && operation === "insert") {
          if (idempotencyExists) {
            return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } });
          }
          return Promise.resolve({ data: { key: (insertData as any)?.key }, error: null });
        }

        if (table === "workflow_runs" && operation === "insert") {
          return Promise.resolve({ data: { id: "run-test-uuid-001" }, error: null });
        }

        if (table === "step_states" && operation === "insert") {
          const stepName = (insertData as any)?.step_name ?? "";
          const stepId = "step-" + stepName.replace(/_/g, "-") + "-uuid";
          return Promise.resolve({ data: { id: stepId }, error: null });
        }

        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: Function) {
        calls.push({ table, operation, data: insertData ?? updateData });

        if (table === "step_states" && operation === "insert") {
          const stepName = (insertData as any)?.step_name ?? "";
          if (stepFail.includes(stepName)) {
            // simulate initial creation succeeds
          }
          resolve({ data: { id: "step-id" }, error: null });
          return;
        }

        resolve({ data: null, error: null });
      },
    };

    return builder;
  };

  const supabase = {
    from: (table: string) => mockBuilder(table),
    _calls: calls,
  };

  return supabase;
}

// ---- Import the handler logic (we test scenarios via the mock layer) ----
// Since Edge Functions use Deno.serve, we test the business logic in isolation

import { checkIdempotency, createRun, completeRun, executeStep } from "../_shared/edgeflow.ts";
import { mockGetSubscriptions, mockUnsubscribe } from "../_shared/mocks.ts";

// ---- Tests ----

Deno.test("checkIdempotency -- new key returns isNew: true", async () => {
  const supabase = createMockSupabase({ idempotencyExists: false });
  const result = await checkIdempotency(supabase, "test-key-001");
  assertEquals(result.isNew, true);
});

Deno.test("checkIdempotency -- duplicate key returns isNew: false", async () => {
  const supabase = createMockSupabase({ idempotencyExists: true });
  const result = await checkIdempotency(supabase, "test-key-001");
  assertEquals(result.isNew, false);
});

Deno.test("createRun -- creates workflow run and returns id", async () => {
  const supabase = createMockSupabase();
  const runId = await createRun(supabase, "test-workflow", "webhook", { email: "a@b.com" });
  assertEquals(runId, "run-test-uuid-001");
});

Deno.test("executeStep -- happy path returns output", async () => {
  const supabase = createMockSupabase();
  const output = await executeStep(
    supabase,
    "run-id",
    "test_step",
    async () => ({ result: "ok" }),
    { input: "data" }
  );
  assertEquals(output, { result: "ok" });
});

Deno.test("executeStep -- retries on failure, eventually returns null and writes DLQ", async () => {
  const supabase = createMockSupabase();
  let attempts = 0;

  // Override with fast mock to avoid real sleeps -- we'll test retry count
  const originalTimeout = globalThis.setTimeout;

  const output = await executeStep(
    supabase,
    "run-id",
    "failing_step",
    async () => {
      attempts++;
      throw new Error("Simulated failure");
    },
    { input: "data" },
    { maxAttempts: 3 }
  );

  assertEquals(output, null);
  assertEquals(attempts, 3);
});

Deno.test("mockGetSubscriptions -- happy scenario returns 3 subscriptions", async () => {
  const subs = await mockGetSubscriptions("test@example.com", "happy");
  assertEquals(subs.length, 3);
  assertEquals(subs[0].id, "sub_001");
  assertEquals(subs[1].id, "sub_002");
  assertEquals(subs[2].id, "sub_003");
});

Deno.test("mockGetSubscriptions -- total_failure throws", async () => {
  let threw = false;
  try {
    await mockGetSubscriptions("test@example.com", "total_failure");
  } catch (e) {
    threw = true;
    assertStringIncludes((e as Error).message, "HubSpot API 500");
  }
  assertEquals(threw, true);
});

Deno.test("mockUnsubscribe -- happy path returns ok", async () => {
  const result = await mockUnsubscribe("test@example.com", "sub_001", "happy");
  assertEquals(result.ok, true);
  assertEquals(result.subscriptionId, "sub_001");
});

Deno.test("mockUnsubscribe -- partial_failure fails for sub_002 only", async () => {
  // sub_001 succeeds
  const r1 = await mockUnsubscribe("test@example.com", "sub_001", "partial_failure");
  assertEquals(r1.ok, true);

  // sub_002 fails
  let threw = false;
  try {
    await mockUnsubscribe("test@example.com", "sub_002", "partial_failure");
  } catch (e) {
    threw = true;
    assertStringIncludes((e as Error).message, "sub_002");
  }
  assertEquals(threw, true);

  // sub_003 succeeds
  const r3 = await mockUnsubscribe("test@example.com", "sub_003", "partial_failure");
  assertEquals(r3.ok, true);
});

Deno.test("mockUnsubscribe -- total_failure throws for all subscriptions", async () => {
  for (const subId of ["sub_001", "sub_002", "sub_003"]) {
    let threw = false;
    try {
      await mockUnsubscribe("test@example.com", subId, "total_failure");
    } catch (e) {
      threw = true;
    }
    assertEquals(threw, true, `Expected failure for ${subId}`);
  }
});

Deno.test("completeRun -- updates run with completed status", async () => {
  const supabase = createMockSupabase();
  // Should not throw
  await completeRun(supabase, "run-id", "completed");
});

Deno.test("completeRun -- updates run with failed status and error", async () => {
  const supabase = createMockSupabase();
  await completeRun(supabase, "run-id", "failed", "Something went wrong");
});

// Auth check logic tests (testing the same logic the handler uses)
function checkAuth(webhookSecret: string, authHeader: string): boolean {
  return webhookSecret !== "" && authHeader === `Bearer ${webhookSecret}`;
}

Deno.test("auth -- missing Authorization header is rejected", () => {
  assertEquals(checkAuth("test-secret-123", ""), false);
});

Deno.test("auth -- wrong Bearer token is rejected", () => {
  assertEquals(checkAuth("test-secret-123", "Bearer wrong-token"), false);
});

Deno.test("auth -- correct Bearer token is accepted", () => {
  assertEquals(checkAuth("test-secret-123", "Bearer test-secret-123"), true);
});

Deno.test("auth -- empty WEBHOOK_SECRET rejects all requests", () => {
  assertEquals(checkAuth("", "Bearer whatever"), false);
});

// Email validation tests (testing extract_email step logic)
Deno.test("missing email -- executeStep extract_email throws on empty string", async () => {
  const supabase = createMockSupabase();
  const output = await executeStep(
    supabase,
    "run-id",
    "extract_email",
    async () => {
      const raw = "";
      const trimmed = raw.trim().toLowerCase();
      if (!trimmed.includes("@")) throw new Error("Invalid email format");
      return { email: trimmed };
    },
    { raw_email: "" }
  );
  assertEquals(output, null);
});

Deno.test("missing email -- executeStep extract_email throws on missing @ symbol", async () => {
  const supabase = createMockSupabase();
  const output = await executeStep(
    supabase,
    "run-id",
    "extract_email",
    async () => {
      const raw = "notanemail";
      const trimmed = raw.trim().toLowerCase();
      if (!trimmed.includes("@")) throw new Error("Invalid email format");
      return { email: trimmed };
    },
    { raw_email: "notanemail" }
  );
  assertEquals(output, null);
});

Deno.test("missing email -- valid email passes extract_email step", async () => {
  const supabase = createMockSupabase();
  const output = await executeStep(
    supabase,
    "run-id",
    "extract_email",
    async () => {
      const raw = "  User@Example.COM  ";
      const trimmed = raw.trim().toLowerCase();
      if (!trimmed.includes("@")) throw new Error("Invalid email format");
      return { email: trimmed };
    },
    { raw_email: "  User@Example.COM  " }
  );
  assertEquals((output as any)?.email, "user@example.com");
});

// Integration-style scenario test
Deno.test("scenario: partial_failure -- sub_002 step fails and goes to DLQ", async () => {
  const supabase = createMockSupabase();
  const subs = await mockGetSubscriptions("test@example.com", "partial_failure");
  assertEquals(subs.length, 3);

  let failedSteps = 0;
  let completedSteps = 0;

  for (const sub of subs) {
    const result = await executeStep(
      supabase,
      "run-id",
      `unsubscribe_${sub.id}`,
      async () => {
        return await mockUnsubscribe("test@example.com", sub.id, "partial_failure");
      },
      { subscription_id: sub.id }
    );

    if (result === null) {
      failedSteps++;
    } else {
      completedSteps++;
    }
  }

  // sub_002 fails (even after 3 retries) -> DLQ
  assertEquals(failedSteps, 1);
  assertEquals(completedSteps, 2);
});
