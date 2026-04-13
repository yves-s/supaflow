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

export async function fetchMetrics(): Promise<Metrics> {
  const [runsResult, dlqResult] = await Promise.all([
    supabase.from("workflow_runs").select("status, duration_ms"),
    supabase
      .from("workflow_dlq")
      .select("id")
      .is("resolved_at", null),
  ]);

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

export async function fetchDlqEntries(runId?: string): Promise<DlqEntry[]> {
  let query = supabase
    .from("workflow_dlq")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });

  if (runId) {
    query = query.eq("run_id", runId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DlqEntry[];
}
