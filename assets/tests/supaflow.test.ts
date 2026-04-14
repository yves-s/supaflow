import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { checkIdempotency, createRun, completeRun, executeStep, sha256 } from "../_shared/supaflow.ts";

// ---- Mock Supabase Client ----

function createMockSupabase(opts: { idempotencyExists?: boolean } = {}) {
  const calls: Array<{ table: string; op: string; data?: unknown }> = [];

  const mockBuilder = (table: string) => {
    let op = "";
    let insertData: unknown = null;

    const b: any = {
      insert(data: unknown) { op = "insert"; insertData = data; return b; },
      update(data: unknown) { op = "update"; return b; },
      select(_?: string) { return b; },
      eq(_col: string, _val: unknown) { return b; },
      is(_col: string, _val: unknown) { return b; },
      single() {
        calls.push({ table, op, data: insertData });

        if (table === "idempotency_keys" && op === "insert") {
          if (opts.idempotencyExists) {
            return Promise.resolve({ data: null, error: { code: "23505", message: "duplicate key" } });
          }
          return Promise.resolve({ data: { key: (insertData as any)?.key }, error: null });
        }

        if (table === "workflow_runs" && op === "insert") {
          return Promise.resolve({ data: { id: "run-001" }, error: null });
        }

        if (table === "step_states" && op === "insert") {
          return Promise.resolve({ data: { id: "step-001" }, error: null });
        }

        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: Function) {
        calls.push({ table, op, data: insertData });
        resolve({ data: null, error: null });
      },
    };
    return b;
  };

  return { from: (t: string) => mockBuilder(t), _calls: calls } as any;
}

// ---- Tests ----

Deno.test("sha256 — produces consistent hash", async () => {
  const h1 = await sha256("hello");
  const h2 = await sha256("hello");
  assertEquals(h1, h2);
  assertEquals(h1.length, 64);
});

Deno.test("sha256 — different inputs produce different hashes", async () => {
  const h1 = await sha256("hello");
  const h2 = await sha256("world");
  assertEquals(h1 !== h2, true);
});

Deno.test("checkIdempotency — new key returns isNew: true", async () => {
  const supabase = createMockSupabase({ idempotencyExists: false });
  const result = await checkIdempotency(supabase, "test-key-001");
  assertEquals(result.isNew, true);
});

Deno.test("checkIdempotency — duplicate key returns isNew: false", async () => {
  const supabase = createMockSupabase({ idempotencyExists: true });
  const result = await checkIdempotency(supabase, "test-key-001");
  assertEquals(result.isNew, false);
});

Deno.test("createRun — creates workflow run and returns id", async () => {
  const supabase = createMockSupabase();
  const runId = await createRun(supabase, "test-workflow", "webhook", { email: "a@b.com" });
  assertEquals(runId, "run-001");
});

Deno.test("executeStep — happy path returns output", async () => {
  const supabase = createMockSupabase();
  const output = await executeStep(
    supabase, "run-id", "test-workflow", "test_step", 1,
    async () => ({ result: "ok" }),
    { input: "data" }
  );
  assertEquals(output, { result: "ok" });
});

Deno.test("executeStep — retries on failure, throws after max attempts", async () => {
  const supabase = createMockSupabase();
  let attempts = 0;

  await assertRejects(
    () => executeStep(
      supabase, "run-id", "test-workflow", "failing_step", 1,
      async () => { attempts++; throw new Error("fail"); },
      undefined,
      { maxAttempts: 3, backoff: [0, 0, 0] }
    ),
    Error,
    "fail"
  );

  assertEquals(attempts, 3);
});

Deno.test("executeStep — respects custom maxAttempts", async () => {
  const supabase = createMockSupabase();
  let attempts = 0;

  await assertRejects(
    () => executeStep(
      supabase, "run-id", "test-workflow", "custom_step", 1,
      async () => { attempts++; throw new Error("fail"); },
      undefined,
      { maxAttempts: 5, backoff: [0, 0, 0, 0, 0] }
    ),
    Error,
    "fail"
  );

  assertEquals(attempts, 5);
});

Deno.test("completeRun — updates run with completed status", async () => {
  const supabase = createMockSupabase();
  await completeRun(supabase, "run-id", "completed", Date.now() - 100);
});

Deno.test("completeRun — updates run with failed status and error", async () => {
  const supabase = createMockSupabase();
  await completeRun(supabase, "run-id", "failed", Date.now() - 100, "Something went wrong");
});
