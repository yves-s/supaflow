import { useState, useEffect, useCallback } from "react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import Sidebar from "./components/Sidebar";
import MetricsBar from "./components/MetricsBar";
import FlowGraph from "./components/FlowGraph";
import DetailPanel from "./components/DetailPanel";
import {
  fetchWorkflows,
  fetchRuns,
  fetchSteps,
  fetchMetrics,
  fetchDlqEntries,
  type WorkflowSummary,
  type Run,
  type Step,
  type Metrics,
  type DlqEntry,
} from "./lib/queries";
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
  // Selection state
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Data state
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dlqEntries, setDlqEntries] = useState<DlqEntry[]>([]);

  // Loading state
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Graph state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Fetch on mount
  useEffect(() => {
    setLoadingWorkflows(true);
    fetchWorkflows()
      .then(setWorkflows)
      .catch(console.error)
      .finally(() => setLoadingWorkflows(false));

    setLoadingMetrics(true);
    fetchMetrics()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => setLoadingMetrics(false));

    fetchDlqEntries().then(setDlqEntries).catch(console.error);
  }, []);

  // Refetch runs when workflow filter changes
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
      fetchDlqEntries(selectedRunId),
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

  const handleSelectWorkflow = useCallback((name: string | null) => {
    setSelectedWorkflow(name);
  }, []);

  const handleSelectRun = useCallback((id: string) => {
    setSelectedRunId(id);
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

  // Derived values
  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;
  const selectedStepData: StepNodeData | null = selectedStepId
    ? (nodes.find((n) => n.id === selectedStepId)?.data as StepNodeData) ?? null
    : null;
  const selectedDlqEntry = selectedStepId
    ? dlqEntries.find((d) => d.step_id === selectedStepId) ?? null
    : null;

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
              <div className="empty-state-title">Loading steps…</div>
            </div>
          ) : selectedRunId && nodes.length > 0 ? (
            <FlowGraph
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
            />
          ) : selectedRunId && !loadingSteps && nodes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">○</div>
              <div className="empty-state-title">No steps recorded</div>
              <div className="empty-state-sub">
                This run has no step data yet
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">⬡</div>
              <div className="empty-state-title">No run selected</div>
              <div className="empty-state-sub">
                Pick a run from the sidebar to visualize its steps
              </div>
            </div>
          )}
        </div>
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
