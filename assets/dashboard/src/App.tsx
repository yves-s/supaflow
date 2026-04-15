import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import Sidebar from "./components/Sidebar";
import MetricsBar from "./components/MetricsBar";
import TabBar, { type TabId } from "./components/TabBar";
import FlowGraph from "./components/FlowGraph";
import DetailPanel from "./components/DetailPanel";
import IssuesView from "./components/IssuesView";
import LogsView from "./components/LogsView";
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
  if (!dateStr) return "--";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeAgoMs(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export default function App() {
  // Selection state
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("flow");

  // Data state
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dlqEntries, setDlqEntries] = useState<DlqEntry[]>([]);
  const [failedRuns, setFailedRuns] = useState<Run[]>([]);
  const [failedRunCount, setFailedRunCount] = useState(0);
  const [allSteps, setAllSteps] = useState<StepWithWorkflow[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);

  // Freshness state
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Delta (trend) state
  const [deltas, setDeltas] = useState<{
    successRate?: number;
    totalRuns?: number;
    avgDuration?: number;
  }>({});

  // Loading state
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Graph state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Track selected workflow ref to avoid stale closures in refresh
  const selectedWorkflowRef = useRef(selectedWorkflow);
  selectedWorkflowRef.current = selectedWorkflow;

  // ── Metrics fetch (with yesterday delta) ──────────────────────────────────

  const fetchMetricsWithDeltas = useCallback(async (workflowName: string | null) => {
    setLoadingMetrics(true);
    try {
      const now = new Date();
      const elapsedMin = now.getHours() * 60 + now.getMinutes();
      const todayFrom = new Date(now.getTime() - elapsedMin * 60_000);
      const yesterdayFrom = new Date(todayFrom.getTime() - 24 * 60 * 60_000);
      const yesterdayTo = new Date(now.getTime() - 24 * 60 * 60_000);

      const wf = workflowName ?? undefined;
      const [currentMetrics, yesterdayMetrics, count] = await Promise.all([
        fetchMetrics(wf, todayFrom, now),
        fetchMetrics(wf, yesterdayFrom, yesterdayTo),
        fetchFailedRunCount(wf),
      ]);

      setMetrics(currentMetrics);
      setFailedRunCount(count);
      setDeltas({
        successRate: currentMetrics.successRate - yesterdayMetrics.successRate,
        totalRuns: currentMetrics.totalRuns - yesterdayMetrics.totalRuns,
        avgDuration: currentMetrics.avgDurationMs - yesterdayMetrics.avgDurationMs,
      });
      setLastFetchedAt(Date.now());
      setFetchError(false);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
      setFetchError(true);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // ── Unresolved issues count for tab badge ─────────────────────────────────

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

  // ── Full refresh ───────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const wf = selectedWorkflowRef.current;
    await Promise.allSettled([
      fetchMetricsWithDeltas(wf),
      fetchRuns(wf ?? undefined).then(setRuns).catch(console.error),
      refreshUnresolvedCount(wf),
    ]);
  }, [fetchMetricsWithDeltas, refreshUnresolvedCount]);

  // ── Initial data fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    setLoadingWorkflows(true);
    fetchWorkflows()
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setLoadingWorkflows(false));
  }, []);

  // Refetch runs + metrics when workflow filter changes
  useEffect(() => {
    setLoadingRuns(true);
    setSelectedRunId(null);
    setSelectedStepId(null);
    setSteps([]);
    setNodes([]);
    setEdges([]);

    fetchRuns(selectedWorkflow ?? undefined)
      .then(setRuns)
      .catch(console.error)
      .finally(() => setLoadingRuns(false));

    fetchMetricsWithDeltas(selectedWorkflow);
    refreshUnresolvedCount(selectedWorkflow);
  }, [selectedWorkflow, fetchMetricsWithDeltas, refreshUnresolvedCount]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Refetch steps when run changes
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

  // Fetch data for Issues/Logs tabs on tab or workflow change
  useEffect(() => {
    if (activeTab === "issues") {
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
    } else if (activeTab === "logs") {
      setLoadingLogs(true);
      fetchAllSteps(selectedWorkflow ?? undefined)
        .then(setAllSteps)
        .catch(console.error)
        .finally(() => setLoadingLogs(false));
    }
  }, [activeTab, selectedWorkflow]);

  const handleSelectWorkflow = useCallback((name: string | null) => {
    setSelectedWorkflow(name);
  }, []);

  const handleSelectRun = useCallback((id: string) => {
    setSelectedRunId(id);
    setActiveTab("flow");
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedStepId(node.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedStepId(null);
  }, []);

  // Error/Log click handlers -- build StepNodeData for DetailPanel
  const handleErrorRunClick = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setActiveTab("flow");
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
        {
          id,
          type: "step",
          position: { x: 0, y: 0 },
          data: syntheticData,
        },
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

  // Derived values
  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;
  const selectedStepData: StepNodeData | null = selectedStepId
    ? (nodes.find((n) => n.id === selectedStepId)?.data as StepNodeData) ?? null
    : null;
  const selectedDlqEntry = selectedStepId
    ? dlqEntries.find((d) => (d.step_name ?? d.id) === selectedStepId) ?? null
    : null;

  // Error count for tab badge (legacy fallback)
  const errorCount = (metrics?.dlqCount ?? 0) + failedRunCount;

  // steps is used in effects above; suppress unused var
  void steps;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden" }}>
      <Sidebar
        workflows={workflows}
        runs={runs}
        selectedRunId={selectedRunId}
        selectedWorkflow={selectedWorkflow}
        onSelectRun={handleSelectRun}
        onSelectWorkflow={handleSelectWorkflow}
        loadingWorkflows={loadingWorkflows}
        loadingRuns={loadingRuns}
      />

      <div className="main-area">
        <MetricsBar
          metrics={metrics}
          loading={loadingMetrics}
          lastFetchedAt={lastFetchedAt}
          onRefresh={refresh}
          deltas={deltas}
        />

        {/* Stale banner */}
        {fetchError && lastFetchedAt && (
          <div className="stale-banner">
            ⚠ Daten konnten nicht aktualisiert werden — zuletzt vor{" "}
            {timeAgoMs(lastFetchedAt)}
          </div>
        )}

        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          errorCount={errorCount}
          unresolvedCount={unresolvedCount}
        />

        {activeTab === "flow" && (
          <>
            {/* Run header */}
            <div className="run-header">
              {selectedRun ? (
                <>
                  <span className="run-header-name">
                    {selectedRun.workflow_name}
                  </span>
                  <span className="run-header-id">
                    {selectedRun.id.slice(0, 8)}
                  </span>
                  <span className={`status-badge ${selectedRun.status}`}>
                    {selectedRun.status}
                  </span>
                  <span className="run-header-time">
                    {timeAgo(selectedRun.started_at)}
                  </span>
                </>
              ) : (
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Select a run to inspect its steps
                </span>
              )}
            </div>

            {/* Flow canvas */}
            <div className="flow-area">
              {loadingSteps ? (
                <div className="empty-state">
                  <div className="empty-state-title">Loading steps...</div>
                </div>
              ) : selectedRunId && nodes.length > 0 ? (
                <FlowGraph
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={handleNodeClick}
                />
              ) : selectedRunId && !loadingSteps && nodes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">&#9675;</div>
                  <div className="empty-state-title">No steps recorded</div>
                  <div className="empty-state-sub">
                    This run has no step data yet
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">&#11041;</div>
                  <div className="empty-state-title">No run selected</div>
                  <div className="empty-state-sub">
                    Pick a run from the sidebar to visualize its steps
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "issues" && (
          <div className="tab-content">
            <IssuesView
              workflowName={selectedWorkflow}
              onRunSelect={handleSelectRun}
              failedRuns={failedRuns}
              dlqEntries={dlqEntries}
              loadingErrors={loadingErrors}
              onSelectDlq={handleDlqClick}
            />
          </div>
        )}

        {activeTab === "logs" && (
          <div className="tab-content">
            <LogsView
              steps={allSteps}
              loading={loadingLogs}
              onSelectStep={handleLogStepClick}
            />
          </div>
        )}
      </div>

      {selectedStepData && (
        <DetailPanel
          step={selectedStepData}
          dlqEntry={selectedDlqEntry}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
