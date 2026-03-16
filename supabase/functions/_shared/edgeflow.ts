// EdgeFlow Engine — shared module for all workflow functions
// Deno runtime, no npm packages

export interface RunOptions {
  metadata?: Record<string, unknown>;
}

export interface StepOptions {
  maxAttempts?: number; // default 3
  timeout?: number; // ms, default 30000
}

export interface IdempotencyResult {
  isNew: boolean;
}

// Structured logger
function log(level: "info" | "error" | "warn", data: Record<string, unknown>) {
  console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), ...data }));
}

// Create a new workflow run
export async function createRun(
  supabase: any,
  workflowName: string,
  triggerType: string,
  payload: Record<string, unknown>,
  options?: RunOptions
): Promise<string> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .insert({
      workflow_name: workflowName,
      trigger_type: triggerType,
      trigger_payload: payload,
      status: "running",
      metadata: options?.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`createRun failed: ${error.message}`);

  log("info", { event: "run_created", run_id: data.id, workflow_name: workflowName, trigger_type: triggerType });
  return data.id;
}

// Complete a workflow run
export async function completeRun(
  supabase: any,
  runId: string,
  status: "completed" | "failed",
  error?: string
): Promise<void> {
  const { error: dbError } = await supabase
    .from("workflow_runs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", runId);

  if (dbError) throw new Error(`completeRun failed: ${dbError.message}`);

  log("info", { event: "run_completed", run_id: runId, status, error: error ?? null });
}

// Check idempotency key — returns {isNew: true} if new, {isNew: false} if duplicate
export async function checkIdempotency(
  supabase: any,
  key: string
): Promise<IdempotencyResult> {
  // Try to insert — if it already exists, the unique constraint will fail
  const { error } = await supabase
    .from("idempotency_keys")
    .insert({ key })
    .single();

  if (error) {
    // Postgres unique violation code is 23505
    if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("unique")) {
      log("info", { event: "idempotency_duplicate", key });
      return { isNew: false };
    }
    throw new Error(`checkIdempotency failed: ${error.message}`);
  }

  log("info", { event: "idempotency_new", key });
  return { isNew: true };
}

// Execute a workflow step with retry and DLQ
export async function executeStep<T>(
  supabase: any,
  runId: string,
  stepName: string,
  fn: () => Promise<T>,
  input?: Record<string, unknown>,
  options?: StepOptions
): Promise<T | null> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const delays = [1000, 2000, 4000]; // exponential backoff

  // Create step record
  const { data: stepData, error: createError } = await supabase
    .from("step_states")
    .insert({
      run_id: runId,
      step_name: stepName,
      status: "running",
      input: input ?? null,
      attempt: 1,
    })
    .select("id")
    .single();

  if (createError) throw new Error(`executeStep create failed: ${createError.message}`);
  const stepId = stepData.id;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      // Update attempt count
      await supabase
        .from("step_states")
        .update({ attempt, status: "running", error: null })
        .eq("id", stepId);
    }

    log("info", { event: "step_attempt", run_id: runId, step_name: stepName, attempt });

    try {
      const output = await fn();

      // Mark step completed
      await supabase
        .from("step_states")
        .update({
          status: "completed",
          output: output as any,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stepId);

      log("info", { event: "step_completed", run_id: runId, step_name: stepName, attempt });
      return output;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log("warn", { event: "step_failed", run_id: runId, step_name: stepName, attempt, error: lastError.message });

      if (attempt < maxAttempts) {
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]));
      }
    }
  }

  // All attempts exhausted — mark step failed
  await supabase
    .from("step_states")
    .update({
      status: "failed",
      error: lastError?.message ?? "unknown error",
      completed_at: new Date().toISOString(),
    })
    .eq("id", stepId);

  // Write to Dead Letter Queue
  const { error: dlqError } = await supabase.from("dead_letter_queue").insert({
    run_id: runId,
    step_name: stepName,
    input: input ?? null,
    error: lastError?.message ?? "unknown error",
    attempts: maxAttempts,
  });

  if (dlqError) {
    log("error", { event: "dlq_write_failed", run_id: runId, step_name: stepName, error: dlqError.message });
  }

  log("error", { event: "step_to_dlq", run_id: runId, step_name: stepName, error: lastError?.message });
  return null;
}
