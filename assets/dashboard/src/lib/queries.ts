import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowSummary {
  workflow_name: string;
  total_runs: number;
  completed_runs: number;
  success_rate: number;
}

export interface Run {
  id: string;
  workflow_name: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
}

export interface Step {
  id: string;
  run_id: string;
  name: string;
  order: number;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  attempt: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
}

export interface DlqEntry {
  id: string;
  run_id: string;
  step_name: string | null;
  workflow_name: string;
  error: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Metrics {
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  dlqCount: number;
  runningCount: number;
}

export interface IssueSummary {
  id: string
  workflow_name: string
  step_name: string
  error_pattern: string
  status: 'unresolved' | 'resolved' | 'ignored'
}

export interface CoverageEntry {
  workflow_name: string
  lastActivityAt: number | null // ms, null if no steps at all
  knownStepCount: number
}

export interface FailedStepRaw {
  runId: string
  workflowName: string
  stepName: string
  error: string
  startedAt: number // ms
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchWorkflows(): Promise<WorkflowSummary[]> {
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("workflow_name, status");

  if (error) throw error;
  if (!data) return [];

  const map = new Map<string, { total: number; completed: number }>();

  for (const row of data) {
    const existing = map.get(row.workflow_name) ?? { total: 0, completed: 0 };
    existing.total += 1;
    if (row.status === "completed") existing.completed += 1;
    map.set(row.workflow_name, existing);
  }

  return Array.from(map.entries()).map(([workflow_name, counts]) => ({
    workflow_name,
    total_runs: counts.total,
    completed_runs: counts.completed,
    success_rate:
      counts.total > 0
        ? Math.round((counts.completed / counts.total) * 100)
        : 0,
  }));
}

export async function fetchRuns(workflowName?: string): Promise<Run[]> {
  let query = supabase
    .from("workflow_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  if (workflowName) {
    query = query.eq("workflow_name", workflowName);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Run[];
}

export async function fetchSteps(runId: string): Promise<Step[]> {
  const { data, error } = await supabase
    .from("step_states")
    .select("*")
    .eq("run_id", runId)
    .order("order", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, name: s.step_name })) as Step[];
}

export async function fetchMetrics(
  workflowName?: string,
  from?: Date,
  to?: Date
): Promise<Metrics> {
  let runsQuery = supabase.from("workflow_runs").select("status, duration_ms, started_at");
  if (workflowName) runsQuery = runsQuery.eq("workflow_name", workflowName);
  if (from) runsQuery = runsQuery.gte("started_at", from.toISOString());
  if (to) runsQuery = runsQuery.lte("started_at", to.toISOString());

  let dlqQuery = supabase
    .from("dead_letter_queue")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);
  if (workflowName) dlqQuery = dlqQuery.eq("workflow_name", workflowName);

  const [runsResult, dlqResult] = await Promise.all([runsQuery, dlqQuery]);

  const runs = runsResult.data ?? [];
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const runningCount = runs.filter((r) => r.status === "running").length;
  const successRate =
    totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

  const durations = runs
    .filter((r) => r.duration_ms != null)
    .map((r) => r.duration_ms as number);
  const avgDurationMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const dlqCount = dlqResult.count ?? 0;
  return { totalRuns, successRate, avgDurationMs, dlqCount, runningCount };
}

export async function fetchDlqEntries(opts?: { runId?: string; workflowName?: string }): Promise<DlqEntry[]> {
  let query = supabase
    .from("dead_letter_queue")
    .select("id, run_id, workflow_name, step_name, payload:input, error, created_at, resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  if (opts?.runId) {
    query = query.eq("run_id", opts.runId);
  }
  if (opts?.workflowName) {
    query = query.eq("workflow_name", opts.workflowName);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DlqEntry[];
}

export async function fetchFailedRunCount(workflowName?: string): Promise<number> {
  let query = supabase
    .from("workflow_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed");
  if (workflowName) {
    query = query.eq("workflow_name", workflowName);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchFailedRuns(workflowName?: string): Promise<Run[]> {
  let query = supabase
    .from("workflow_runs")
    .select("*")
    .eq("status", "failed")
    .order("started_at", { ascending: false })
    .limit(50);
  if (workflowName) {
    query = query.eq("workflow_name", workflowName);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Run[];
}

export interface StepWithWorkflow extends Step {
  workflow_name: string;
  run_status: string;
}

export async function fetchAllSteps(workflowName?: string): Promise<StepWithWorkflow[]> {
  let runsQuery = supabase
    .from("workflow_runs")
    .select("id, workflow_name, status")
    .order("started_at", { ascending: false })
    .limit(50);
  if (workflowName) {
    runsQuery = runsQuery.eq("workflow_name", workflowName);
  }
  const { data: runs, error: runsError } = await runsQuery;
  if (runsError) throw runsError;
  if (!runs || runs.length === 0) return [];

  const runIds = runs.map(r => r.id);
  const runMap = new Map(runs.map(r => [r.id, r]));

  const { data: steps, error: stepsError } = await supabase
    .from("step_states")
    .select("*")
    .in("run_id", runIds)
    .order("started_at", { ascending: false })
    .limit(200);
  if (stepsError) throw stepsError;

  return (steps ?? []).map((s) => ({
    ...s,
    name: s.step_name,
    workflow_name: runMap.get(s.run_id)?.workflow_name ?? "unknown",
    run_status: runMap.get(s.run_id)?.status ?? "unknown",
  })) as StepWithWorkflow[];
}

/** Reads persisted issue status flags from supaflow_issues. */
export async function fetchIssueStatuses(
  workflowName?: string
): Promise<IssueSummary[]> {
  let query = supabase.from("supaflow_issues").select("*");
  if (workflowName) query = query.eq("workflow_name", workflowName);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as IssueSummary[];
}

/** Upserts an issue status record. Creates row if it doesn't exist yet. */
export async function upsertIssueStatus(
  issue: Pick<IssueSummary, 'workflow_name' | 'step_name' | 'error_pattern' | 'status'>
): Promise<void> {
  const { error } = await supabase
    .from("supaflow_issues")
    .upsert(
      { ...issue, updated_at: new Date().toISOString() },
      { onConflict: 'workflow_name,step_name,error_pattern' }
    );
  if (error) throw error;
}

/**
 * Fetches failed steps from the last 7 days for issue grouping.
 */
export async function fetchFailedStepsForIssues(
  workflowName?: string
): Promise<FailedStepRaw[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let runsQuery = supabase
    .from("workflow_runs")
    .select("id, workflow_name, started_at")
    .eq("status", "failed")
    .gte("started_at", sevenDaysAgo)
    .order("started_at", { ascending: false })
    .limit(500);
  if (workflowName) runsQuery = runsQuery.eq("workflow_name", workflowName);

  const { data: runs, error: runsErr } = await runsQuery;
  if (runsErr) throw runsErr;
  if (!runs || runs.length === 0) return [];

  const runIds = runs.map(r => r.id);
  const runMeta = new Map(runs.map(r => [r.id, r]));

  const { data: steps, error: stepsErr } = await supabase
    .from("step_states")
    .select("run_id, step_name, error")
    .in("run_id", runIds)
    .eq("status", "failed")
    .not("error", "is", null);
  if (stepsErr) throw stepsErr;

  return (steps ?? [])
    .filter(s => s.error)
    .map(s => {
      const run = runMeta.get(s.run_id)!;
      return {
        runId: s.run_id,
        workflowName: run.workflow_name,
        stepName: s.step_name,
        error: s.error as string,
        startedAt: new Date(run.started_at).getTime(),
      };
    });
}

/**
 * Fetches unresolved DLQ entries mapped to FailedStepRaw format for issue grouping.
 * No time window — DLQ entries persist until resolved, matching the header count.
 */
export async function fetchDlqForIssues(
  workflowName?: string
): Promise<FailedStepRaw[]> {
  let query = supabase
    .from("dead_letter_queue")
    .select("run_id, workflow_name, step_name, error, created_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (workflowName) query = query.eq("workflow_name", workflowName);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .filter(d => d.error)
    .map(d => ({
      runId: d.run_id,
      workflowName: d.workflow_name,
      stepName: d.step_name ?? "(unknown)",
      error: d.error,
      startedAt: new Date(d.created_at).getTime(),
    }));
}

/**
 * For each workflow, returns the last step activity timestamp and known step count.
 */
export async function fetchCoverage(
  workflowNames: string[]
): Promise<CoverageEntry[]> {
  if (workflowNames.length === 0) return [];

  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("id, workflow_name")
    .in("workflow_name", workflowNames);

  if (!runs || runs.length === 0) {
    return workflowNames.map(wf => ({ workflow_name: wf, lastActivityAt: null, knownStepCount: 0 }));
  }

  const runIds = runs.map(r => r.id);
  const runToWorkflow = new Map(runs.map(r => [r.id, r.workflow_name]));

  const { data: steps } = await supabase
    .from("step_states")
    .select("run_id, started_at")
    .in("run_id", runIds)
    .order("started_at", { ascending: false });

  const activityMap = new Map<string, { lastAt: number; count: number }>();
  for (const wf of workflowNames) activityMap.set(wf, { lastAt: 0, count: 0 });

  for (const step of steps ?? []) {
    const wf = runToWorkflow.get(step.run_id);
    if (!wf) continue;
    const entry = activityMap.get(wf)!;
    const ts = new Date(step.started_at).getTime();
    if (ts > entry.lastAt) entry.lastAt = ts;
    entry.count++;
  }

  return workflowNames.map(wf => {
    const entry = activityMap.get(wf)!;
    return {
      workflow_name: wf,
      lastActivityAt: entry.lastAt > 0 ? entry.lastAt : null,
      knownStepCount: entry.count,
    };
  });
}
