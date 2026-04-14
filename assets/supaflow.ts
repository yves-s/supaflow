// Supaflow Runtime — workflow engine for Supabase Edge Functions

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---- Types ----

export interface StepOptions {
  maxAttempts?: number;
  backoff?: number[];
  timeout?: number;
  /** Data to record as step input for observability. Appears in the dashboard detail panel. */
  input?: Record<string, unknown>;
}

export interface FlowContext {
  input<T = Record<string, unknown>>(): T;
  step<T>(name: string, fn: () => Promise<T>, options?: StepOptions): Promise<T>;
}

interface IdempotencyResult {
  isNew: boolean;
}

// ---- Logger ----

function log(level: "info" | "error" | "warn", data: Record<string, unknown>) {
  console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), ...data }));
}

// ---- Idempotency ----

/** @internal exported for testing */
export async function checkIdempotency(
  supabase: SupabaseClient,
  key: string
): Promise<IdempotencyResult> {
  const { error } = await supabase
    .from("idempotency_keys")
    .insert({ key })
    .single();

  if (error) {
    if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("unique")) {
      log("info", { event: "idempotency_duplicate", key });
      return { isNew: false };
    }
    throw new Error(`checkIdempotency failed: ${error.message}`);
  }

  log("info", { event: "idempotency_new", key });
  return { isNew: true };
}

// ---- Run Management ----

/** @internal exported for testing */
export async function createRun(
  supabase: SupabaseClient,
  workflowName: string,
  triggerType: string,
  payload: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_name: workflowName,
      trigger_type: triggerType,
      trigger_payload: payload,
      status: "running",
    })
    .select("id")
    .single();

  if (error) throw new Error(`createRun failed: ${error.message}`);
  log("info", { event: "run_created", run_id: data.id, workflow_name: workflowName });
  return data.id;
}

/** @internal exported for testing */
export async function completeRun(
  supabase: SupabaseClient,
  runId: string,
  status: "completed" | "failed",
  startedAt: number,
  error?: string
): Promise<void> {
  const durationMs = Date.now() - startedAt;
  const { error: dbError } = await supabase
    .from("workflow_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      error: error ?? null,
    })
    .eq("id", runId);

  if (dbError) throw new Error(`completeRun failed: ${dbError.message}`);
  log("info", { event: "run_completed", run_id: runId, status, duration_ms: durationMs });
}

// ---- Step Execution ----

/** @internal exported for testing */
export async function executeStep<T>(
  supabase: SupabaseClient,
  runId: string,
  workflowName: string,
  stepName: string,
  stepOrder: number,
  fn: () => Promise<T>,
  input?: Record<string, unknown>,
  options?: StepOptions
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const backoff = options?.backoff ?? [1000, 2000, 4000];
  const timeout = options?.timeout ?? 30_000;

  const stepStart = Date.now();
  const { data: stepData, error: createError } = await supabase
    .from("step_states")
    .insert({
      run_id: runId,
      step_name: stepName,
      status: "running",
      input: input ?? null,
      attempt: 1,
      order: stepOrder,
    })
    .select("id")
    .single();

  if (createError) throw new Error(`step create failed: ${createError.message}`);
  const stepId = stepData.id;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      await supabase
        .from("step_states")
        .update({ attempt, status: "running", error: null })
        .eq("id", stepId);
    }

    log("info", { event: "step_attempt", run_id: runId, step_name: stepName, attempt });

    try {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error(`Step timeout after ${timeout}ms`)),
          timeout
        );
      });
      let result: T;
      try {
        result = await Promise.race([fn(), timeoutPromise]);
      } finally {
        clearTimeout(timeoutHandle);
      }

      const durationMs = Date.now() - stepStart;
      await supabase
        .from("step_states")
        .update({
          status: "completed",
          output: result as any,
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
        })
        .eq("id", stepId);

      log("info", { event: "step_completed", run_id: runId, step_name: stepName, attempt, duration_ms: durationMs });
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log("warn", { event: "step_failed", run_id: runId, step_name: stepName, attempt, error: lastError.message });

      if (attempt < maxAttempts) {
        const delay = backoff[attempt - 1] ?? backoff[backoff.length - 1];
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  const durationMs = Date.now() - stepStart;
  await supabase
    .from("step_states")
    .update({
      status: "failed",
      error: lastError?.message ?? "unknown error",
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    })
    .eq("id", stepId);

  await supabase.from("dead_letter_queue").insert({
    run_id: runId,
    workflow_name: workflowName,
    step_name: stepName,
    input: input ?? null,
    error: lastError?.message ?? "unknown error",
    attempts: maxAttempts,
  });

  log("error", { event: "step_to_dlq", run_id: runId, step_name: stepName, error: lastError?.message });

  throw lastError ?? new Error(`Step "${stepName}" failed after ${maxAttempts} attempts`);
}

// ---- SHA-256 Helper ----

/** @internal exported for testing */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---- Public API: supaflow.serve() ----

export const supaflow = {
  serve(
    workflowName: string,
    handler: (flow: FlowContext) => Promise<void>
  ) {
    return Deno.serve(async (req: Request) => {
      let body: Record<string, unknown>;
      const rawBody = await req.text();
      try {
        body = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(supabaseUrl, supabaseKey);

      const idempotencyKey =
        req.headers.get("Idempotency-Key") ??
        await sha256(rawBody);

      const { isNew } = await checkIdempotency(supabase, idempotencyKey);
      if (!isNew) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "duplicate", idempotency_key: idempotencyKey }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const runStartedAt = Date.now();
      const runId = await createRun(supabase, workflowName, "webhook", body);

      let stepOrder = 0;

      const flow: FlowContext = {
        input<T>() {
          return body as T;
        },
        async step<T>(name: string, fn: () => Promise<T>, options?: StepOptions): Promise<T> {
          stepOrder++;
          return executeStep<T>(supabase, runId, workflowName, name, stepOrder, fn, options?.input, options);
        },
      };

      try {
        await handler(flow);
        await completeRun(supabase, runId, "completed", runStartedAt);
        return new Response(
          JSON.stringify({ run_id: runId, status: "completed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await completeRun(supabase, runId, "failed", runStartedAt, errorMessage);
        return new Response(
          JSON.stringify({ run_id: runId, status: "failed", error: errorMessage }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    });
  },
};
