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
  step_id: string | null;
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
    .from("workflow_steps")
    .select("*")
    .eq("run_id", runId)
    .order("order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Step[];
}

export async function fetchMetrics(workflowName?: string): Promise<Metrics> {
  let runsQuery = supabase.from("workflow_runs").select("status, duration_ms");
  if (workflowName) {
    runsQuery = runsQuery.eq("workflow_name", workflowName);
  }

  let dlqQuery = supabase.from("workflow_dlq").select("id").is("resolved_at", null);
  if (workflowName) {
    dlqQuery = dlqQuery.eq("workflow_name", workflowName);
  }

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

  const dlqCount = dlqResult.data?.length ?? 0;

  return { totalRuns, successRate, avgDurationMs, dlqCount, runningCount };
}

export async function fetchDlqEntries(opts?: { runId?: string; workflowName?: string }): Promise<DlqEntry[]> {
  let query = supabase
    .from("workflow_dlq")
    .select("*")
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
    .from("workflow_steps")
    .select("*")
    .in("run_id", runIds)
    .order("started_at", { ascending: false })
    .limit(200);
  if (stepsError) throw stepsError;

  return (steps ?? []).map(s => ({
    ...s,
    workflow_name: runMap.get(s.run_id)?.workflow_name ?? "unknown",
    run_status: runMap.get(s.run_id)?.status ?? "unknown",
  })) as StepWithWorkflow[];
}
