import { useState, useEffect, useCallback } from "react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import Sidebar from "./components/Sidebar";
import MetricsBar from "./components/MetricsBar";
import TabBar, { type TabId } from "./components/TabBar";
import FlowGraph from "./components/FlowGraph";
import DetailPanel from "./components/DetailPanel";
import ErrorsView from "./components/ErrorsView";
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
  type WorkflowSummary,
  type Run,
  type Step,
  type Metrics,
  type DlqEntry,
  type StepWithWorkflow,
} from "./lib/queries";
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

  // Fetch workflows on mount
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

    setLoadingMetrics(true);
    Promise.all([
      fetchMetrics(selectedWorkflow ?? undefined),
      fetchFailedRunCount(selectedWorkflow ?? undefined),
    ])
      .then(([m, count]) => {
        setMetrics(m);
        setFailedRunCount(count);
      })
      .catch(console.error)
      .finally(() => setLoadingMetrics(false));
  }, [selectedWorkflow]);

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

    Promise.all([
      fetchSteps(selectedRunId),
      fetchDlqEntries({ runId: selectedRunId }),
    ])
      .then(([fetchedSteps, dlq]) => {
        setSteps(fetchedSteps);
        setDlqEntries(dlq);
        const { nodes: n, edges: e } = buildGraph(fetchedSteps);
        setNodes(n);
        setEdges(e);
      })
      .catch(console.error)
      .finally(() => setLoadingSteps(false));
  }, [selectedRunId]);

  // Fetch data for Errors/Logs tabs on tab or workflow change
  useEffect(() => {
    if (activeTab === "errors") {
      setLoadingErrors(true);
      Promise.all([
        fetchFailedRuns(selectedWorkflow ?? undefined),
        fetchDlqEntries({ workflowName: selectedWorkflow ?? undefined }),
      ])
        .then(([failedRunsResult, dlq]) => {
          setFailedRuns(failedRunsResult);
          setDlqEntries(dlq);
        })
        .catch(console.error)
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

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedStepId(node.id);
    },
    []
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedStepId(null);
  }, []);

  // Error/Log click handlers -- build StepNodeData for DetailPanel
  const handleErrorRunClick = useCallback((runId: string) => {
    setSelectedRunId(runId);
    setActiveTab("flow");
  }, []);

  const handleDlqClick = useCallback((entry: DlqEntry) => {
    // Show DLQ detail in the detail panel by constructing step-like data
    setSelectedStepId(entry.step_id ?? entry.id);
    // We need to set a synthetic node for the detail panel
    const syntheticData: StepNodeData = {
      label: entry.step_id ? `step:${entry.step_id.slice(0, 8)}` : "DLQ Entry",
      stepId: entry.step_id ?? entry.id,
      status: "failed",
      duration_ms: null,
      attempt: 1,
      error: entry.error,
      input: entry.payload,
      output: null,
    };
    // Store in nodes so the derived value picks it up
    setNodes((prev) => {
      const id = entry.step_id ?? entry.id;
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
    // Add synthetic node for detail panel
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
    ? dlqEntries.find((d) => d.step_id === selectedStepId) ?? null
    : null;

  // Error count for tab badge
  const errorCount = (metrics?.dlqCount ?? 0) + failedRunCount;

  // steps is used in the effects above; suppress unused var by referencing it
  void steps;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
        <MetricsBar metrics={metrics} loading={loadingMetrics} />

        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          errorCount={errorCount}
        />

        {activeTab === "flow" && (
          <>
            {/* Run header */}
            <div className="run-header">
              {selectedRun ? (
                <>
                  <span className="run-header-name">{selectedRun.workflow_name}</span>
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

        {activeTab === "errors" && (
          <div className="tab-content">
            <ErrorsView
              failedRuns={failedRuns}
              dlqEntries={dlqEntries}
              loading={loadingErrors}
              onSelectRun={handleErrorRunClick}
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
