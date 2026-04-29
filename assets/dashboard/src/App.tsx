import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import AppSidebar from "./components/AppSidebar";
import Topbar from "./components/Topbar";
import FlowGraph from "./components/FlowGraph";
import DetailPanel from "./components/DetailPanel";
import IssuesView from "./components/IssuesView";
import LogsView from "./components/LogsView";
import type { ViewKind, ViewState } from "./lib/view";
import { buildBreadcrumbs } from "./lib/view";
import {
  fetchWorkflows,
  fetchRuns,
  fetchSteps,
  fetchMetrics,
  fetchDlqEntries,
  fetchFailedRuns,
  fetchFailedRunCount,
  fetchAllSteps,
  fetchFailedStepsForIssues,
  fetchIssueStatuses,
  type WorkflowSummary,
  type Run,
  type Step,
  type Metrics,
  type DlqEntry,
  type StepWithWorkflow,
} from "./lib/queries";
import { groupIntoIssues } from "./lib/issues";
import { buildGraph } from "./lib/graph";
import type { StepNodeData } from "./components/StepNode";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function App() {
  // ── View routing state ────────────────────────────────────────────────────
  const [view, setView] = useState<ViewState>({ kind: "overview" });

  // ── Selection state (workflow & run selection live alongside view) ────────
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // ── Data state ────────────────────────────────────────────────────────────
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dlqEntries, setDlqEntries] = useState<DlqEntry[]>([]);
  const [failedRuns, setFailedRuns] = useState<Run[]>([]);
  const [failedRunCount, setFailedRunCount] = useState(0);
  const [allSteps, setAllSteps] = useState<StepWithWorkflow[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  // ── Freshness state (drives live-pulse) ───────────────────────────────────
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ── Graph state (run view) ────────────────────────────────────────────────
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const selectedWorkflowRef = useRef(selectedWorkflow);
  selectedWorkflowRef.current = selectedWorkflow;

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchMetricsForWorkflow = useCallback(async (workflowName: string | null) => {
    setLoadingMetrics(true);
    try {
      const wf = workflowName ?? undefined;
      const [currentMetrics, count] = await Promise.all([
        fetchMetrics(wf),
        fetchFailedRunCount(wf),
      ]);
      setMetrics(currentMetrics);
      setFailedRunCount(count);
      setLastFetchedAt(Date.now());
      setFetchError(false);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      setFetchError(true);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const refreshUnresolvedCount = useCallback(async (workflowName: string | null) => {
    try {
      const [steps, storedStatuses] = await Promise.all([
        fetchFailedStepsForIssues(workflowName ?? undefined),
        fetchIssueStatuses(workflowName ?? undefined),
      ]);
      const issues = groupIntoIssues(steps, storedStatuses, Date.now());
      setUnresolvedCount(issues.filter((i) => i.status === "unresolved").length);
    } catch (err) {
      console.error("Failed to refresh unresolved count:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    const wf = selectedWorkflowRef.current;
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetchMetricsForWorkflow(wf),
        fetchRuns(wf ?? undefined).then(setRuns).catch(console.error),
        refreshUnresolvedCount(wf),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMetricsForWorkflow, refreshUnresolvedCount]);

  // ── Initial workflow fetch ────────────────────────────────────────────────
  useEffect(() => {
    setLoadingWorkflows(true);
    fetchWorkflows()
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setLoadingWorkflows(false));
  }, []);

  // ── Refetch runs/metrics when workflow filter changes ─────────────────────
  useEffect(() => {
    if (selectedWorkflow === null) {
      // overview / workflows / issues / logs scope — still want metrics + runs feed
      fetchMetricsForWorkflow(null);
      refreshUnresolvedCount(null);
      setLoadingRuns(true);
      fetchRuns(undefined)
        .then(setRuns)
        .catch(console.error)
        .finally(() => setLoadingRuns(false));
      return;
    }
    setLoadingRuns(true);
    fetchRuns(selectedWorkflow)
      .then(setRuns)
      .catch(console.error)
      .finally(() => setLoadingRuns(false));

    fetchMetricsForWorkflow(selectedWorkflow);
    refreshUnresolvedCount(selectedWorkflow);
  }, [selectedWorkflow, fetchMetricsForWorkflow, refreshUnresolvedCount]);

  // ── Auto-refresh every 30s ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // ── Refetch steps when run changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedRunId) {
      setSteps([]);
      setNodes([]);
      setEdges([]);
      setSelectedStepId(null);
      return;
    }
    setLoadingSteps(true);
    setSelectedStepId(null);

    Promise.allSettled([
      fetchSteps(selectedRunId),
      fetchDlqEntries({ runId: selectedRunId }),
    ])
      .then(([stepsResult, dlqResult]) => {
        const fetchedSteps =
          stepsResult.status === "fulfilled" ? stepsResult.value : [];
        if (stepsResult.status === "rejected") console.error(stepsResult.reason);
        if (dlqResult.status === "fulfilled") setDlqEntries(dlqResult.value);
        else console.error(dlqResult.reason);
        setSteps(fetchedSteps);
        const { nodes: n, edges: e } = buildGraph(fetchedSteps);
        setNodes(n);
        setEdges(e);
      })
      .finally(() => setLoadingSteps(false));
  }, [selectedRunId]);

  // ── Per-view side data (issues / logs) ────────────────────────────────────
  useEffect(() => {
    if (view.kind === "issues") {
      setLoadingErrors(true);
      Promise.allSettled([
        fetchFailedRuns(selectedWorkflow ?? undefined),
        fetchDlqEntries({ workflowName: selectedWorkflow ?? undefined }),
      ])
        .then(([failedRunsResult, dlqResult]) => {
          if (failedRunsResult.status === "fulfilled")
            setFailedRuns(failedRunsResult.value);
          else console.error(failedRunsResult.reason);
          if (dlqResult.status === "fulfilled") setDlqEntries(dlqResult.value);
          else console.error(dlqResult.reason);
        })
        .finally(() => setLoadingErrors(false));
    } else if (view.kind === "logs") {
      setLoadingLogs(true);
      fetchAllSteps(selectedWorkflow ?? undefined)
        .then(setAllSteps)
        .catch(console.error)
        .finally(() => setLoadingLogs(false));
    }
  }, [view.kind, selectedWorkflow]);

  // ── Navigation handlers ───────────────────────────────────────────────────

  const navigateTo = useCallback((target: ViewState) => {
    setView(target);
    if (target.workflow !== undefined) {
      setSelectedWorkflow(target.workflow);
    }
    if (target.runId !== undefined) {
      setSelectedRunId(target.runId);
    } else if (target.kind !== "run") {
      setSelectedRunId(null);
    }
  }, []);

  const handleNavigate = useCallback(
    (kind: ViewKind) => {
      if (kind === "workflows") {
        navigateTo({ kind: "workflows" });
      } else if (kind === "overview" || kind === "issues" || kind === "logs") {
        navigateTo({ kind });
      }
    },
    [navigateTo],
  );

  const handleSelectWorkflow = useCallback(
    (name: string | null) => {
      if (name === null) {
        navigateTo({ kind: "workflows", workflow: null });
      } else {
        navigateTo({ kind: "workflow", workflow: name });
      }
    },
    [navigateTo],
  );

  const handleSelectRun = useCallback(
    (id: string) => {
      const run = runs.find((r) => r.id === id) ?? null;
      navigateTo({
        kind: "run",
        workflow: run?.workflow_name ?? selectedWorkflow,
        runId: id,
      });
    },
    [navigateTo, runs, selectedWorkflow],
  );

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedStepId(node.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStepId(null);
  }, []);

  const handleDlqClick = useCallback((entry: DlqEntry) => {
    const stepKey = entry.step_name ?? entry.id;
    setSelectedStepId(stepKey);
    const syntheticData: StepNodeData = {
      label: entry.step_name ?? "DLQ Entry",
      stepId: stepKey,
      status: "failed",
      duration_ms: null,
      attempt: 1,
      error: entry.error,
      input: entry.payload,
      output: null,
    };
    setNodes((prev) => {
      const id = entry.step_name ?? entry.id;
      const exists = prev.find((n) => n.id === id);
      if (exists) return prev;
      return [
        ...prev,
        { id, type: "step", position: { x: 0, y: 0 }, data: syntheticData },
      ];
    });
  }, []);

  const handleLogStepClick = useCallback((step: StepWithWorkflow) => {
    setSelectedStepId(step.id);
    const syntheticData: StepNodeData = {
      label: step.name,
      stepId: step.id,
      status: step.status,
      duration_ms: step.duration_ms,
      attempt: step.attempt,
      error: step.error,
      input: step.input,
      output: step.output,
    };
    setNodes((prev) => {
      const exists = prev.find((n) => n.id === step.id);
      if (exists) return prev;
      return [
        ...prev,
        {
          id: step.id,
          type: "step",
          position: { x: 0, y: 0 },
          data: syntheticData,
        },
      ];
    });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;
  const selectedStepData: StepNodeData | null = selectedStepId
    ? (nodes.find((n) => n.id === selectedStepId)?.data as StepNodeData) ?? null
    : null;
  const selectedDlqEntry = selectedStepId
    ? dlqEntries.find((d) => (d.step_name ?? d.id) === selectedStepId) ?? null
    : null;

  const breadcrumbs = buildBreadcrumbs(view);
  const liveStatus: "live" | "stale" | "error" = fetchError
    ? "error"
    : lastFetchedAt && Date.now() - lastFetchedAt > 90_000
    ? "stale"
    : "live";

  // Suppressing unused vars used by deps (steps + loadingMetrics gate child-views later)
  void steps;
  void loadingMetrics;
  void metrics;
  void failedRunCount;

  return (
    <div className="app-shell">
      <AppSidebar
        view={view.kind}
        selectedWorkflow={selectedWorkflow}
        workflows={workflows}
        loadingWorkflows={loadingWorkflows}
        unresolvedCount={unresolvedCount}
        onNavigate={handleNavigate}
        onSelectWorkflow={handleSelectWorkflow}
      />

      <main className="app-main">
        <Topbar
          breadcrumbs={breadcrumbs}
          liveStatus={liveStatus}
          range="Last 24h"
          refreshing={refreshing}
          notifications={unresolvedCount}
          onCrumbClick={navigateTo}
          onRefresh={refresh}
        />

        <section className="app-view">
          {view.kind === "overview" && (
            <OverviewSlot />
          )}

          {view.kind === "workflows" && (
            <WorkflowsSlot
              workflows={workflows}
              loading={loadingWorkflows}
              onSelect={(name) => navigateTo({ kind: "workflow", workflow: name })}
            />
          )}

          {view.kind === "workflow" && (
            <WorkflowSlot
              workflowName={view.workflow ?? selectedWorkflow}
              runs={runs}
              loadingRuns={loadingRuns}
              onSelectRun={handleSelectRun}
            />
          )}

          {view.kind === "run" && (
            <RunSlot
              run={selectedRun}
              loadingSteps={loadingSteps}
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              workflowName={view.workflow ?? selectedRun?.workflow_name ?? null}
            />
          )}

          {view.kind === "issues" && (
            <IssuesSlot
              workflowName={selectedWorkflow}
              onRunSelect={handleSelectRun}
              failedRuns={failedRuns}
              dlqEntries={dlqEntries}
              loadingErrors={loadingErrors}
              onSelectDlq={handleDlqClick}
            />
          )}

          {view.kind === "logs" && (
            <LogsSlot
              steps={allSteps}
              loading={loadingLogs}
              onSelectStep={handleLogStepClick}
            />
          )}
        </section>
      </main>

      {selectedStepData && (
        <DetailPanel
          step={selectedStepData}
          dlqEntry={selectedDlqEntry}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );

  // ── View slot components — minimal headers, empty bodies acceptable ───────

  function OverviewSlot() {
    return (
      <>
        <header className="view-header">
          <div className="view-header-title-group">
            <span className="view-eyebrow">Dashboard</span>
            <h1 className="view-title">Overview</h1>
            <p className="view-subtitle">
              Health, throughput, and recent activity across all workflows.
            </p>
          </div>
        </header>
        <div className="view-stub">
          <div className="view-stub-title">Overview content lands in a sibling ticket</div>
          <div className="view-stub-sub">KPIs, charts, and recent activity will fill this space.</div>
        </div>
      </>
    );
  }

  function WorkflowsSlot({
    workflows,
    loading,
    onSelect,
  }: {
    workflows: WorkflowSummary[];
    loading: boolean;
    onSelect: (name: string) => void;
  }) {
    return (
      <>
        <header className="view-header">
          <div className="view-header-title-group">
            <span className="view-eyebrow">Catalog</span>
            <h1 className="view-title">Workflows</h1>
            <p className="view-subtitle">
              {workflows.length} workflow{workflows.length === 1 ? "" : "s"} instrumented.
            </p>
          </div>
        </header>
        {loading ? (
          <div className="view-stub">
            <div className="view-stub-title">Loading workflows…</div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="view-stub">
            <div className="view-stub-title">No workflows yet</div>
            <div className="view-stub-sub">Run /supaflow:scan to instrument your Edge Functions.</div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", display: "grid", gap: 8 }}>
            {workflows.map((wf) => (
              <li key={wf.workflow_name}>
                <button
                  type="button"
                  className="card"
                  onClick={() => onSelect(wf.workflow_name)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                >
                  <span className="status-dot completed" aria-hidden />
                  <span style={{ fontWeight: 500, flex: 1 }}>{wf.workflow_name}</span>
                  <span className="tnum" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {wf.total_runs} runs · {wf.success_rate}% success
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  function WorkflowSlot({
    workflowName,
    runs,
    loadingRuns,
    onSelectRun,
  }: {
    workflowName: string | null;
    runs: Run[];
    loadingRuns: boolean;
    onSelectRun: (id: string) => void;
  }) {
    return (
      <>
        <header className="view-header">
          <div className="view-header-title-group">
            <span className="view-eyebrow">Workflow</span>
            <h1 className="view-title">{workflowName ?? "Untitled workflow"}</h1>
            <p className="view-subtitle">
              Runs, structure and reliability for this workflow.
            </p>
          </div>
        </header>
        {loadingRuns ? (
          <div className="view-stub">
            <div className="view-stub-title">Loading runs…</div>
          </div>
        ) : runs.length === 0 ? (
          <div className="view-stub">
            <div className="view-stub-title">No runs recorded</div>
            <div className="view-stub-sub">This workflow has not executed yet.</div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", display: "grid", gap: 6 }}>
            {runs.slice(0, 25).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="card"
                  onClick={() => onSelectRun(r.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <span className={`status-dot ${r.status}`} aria-hidden />
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {r.id.slice(0, 8)}
                  </span>
                  <span className={`status-badge ${r.status}`}>{r.status}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                    {timeAgo(r.started_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  function RunSlot({
    run,
    loadingSteps,
    nodes,
    edges,
    onNodeClick,
    workflowName,
  }: {
    run: Run | null;
    loadingSteps: boolean;
    nodes: Node[];
    edges: Edge[];
    onNodeClick: NodeMouseHandler;
    workflowName: string | null;
  }) {
    return (
      <>
        <header className="view-header">
          <div className="view-header-title-group">
            <span className="view-eyebrow">{workflowName ?? "Workflow"}</span>
            <h1 className="view-title">
              {run ? `Run ${run.id.slice(0, 8)}` : "Run"}
            </h1>
            {run && (
              <p className="view-subtitle">
                <span className={`status-badge ${run.status}`} style={{ marginRight: 8 }}>
                  {run.status}
                </span>
                Started {timeAgo(run.started_at)}
              </p>
            )}
          </div>
        </header>

        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-panel)",
            height: "calc(100vh - var(--topbar-height) - 200px)",
            minHeight: 320,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {loadingSteps ? (
            <div className="empty-state">
              <div className="empty-state-title">Loading steps…</div>
            </div>
          ) : nodes.length > 0 ? (
            <FlowGraph nodes={nodes} edges={edges} onNodeClick={onNodeClick} />
          ) : run ? (
            <div className="empty-state">
              <div className="empty-state-icon">○</div>
              <div className="empty-state-title">No steps recorded</div>
              <div className="empty-state-sub">This run has no step data yet.</div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">⬢</div>
              <div className="empty-state-title">No run selected</div>
              <div className="empty-state-sub">Pick a run to inspect its steps.</div>
            </div>
          )}
        </div>
      </>
    );
  }

  function IssuesSlot(props: {
    workflowName: string | null;
    onRunSelect: (runId: string) => void;
    failedRuns: Run[];
    dlqEntries: DlqEntry[];
    loadingErrors: boolean;
    onSelectDlq: (entry: DlqEntry) => void;
  }) {
    return (
      <>
        <header className="view-header">
          <div className="view-header-title-group">
            <span className="view-eyebrow">Reliability</span>
            <h1 className="view-title">Issues</h1>
            <p className="view-subtitle">
              Failures grouped by signature. Resolve, snooze, or jump to the run.
            </p>
          </div>
        </header>
        <IssuesView {...props} />
      </>
    );
  }

  function LogsSlot(props: {
    steps: StepWithWorkflow[];
    loading: boolean;
    onSelectStep: (step: StepWithWorkflow) => void;
  }) {
    return (
      <>
        <header className="view-header">
          <div className="view-header-title-group">
            <span className="view-eyebrow">Activity</span>
            <h1 className="view-title">Logs</h1>
            <p className="view-subtitle">
              Step-level activity stream across all instrumented workflows.
            </p>
          </div>
        </header>
        <LogsView {...props} />
      </>
    );
  }
}
