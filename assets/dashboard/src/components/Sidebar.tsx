import type { WorkflowSummary, Run } from "../lib/queries";

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

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function successRateColor(rate: number): "green" | "amber" | "red" {
  if (rate >= 80) return "green";
  if (rate >= 50) return "amber";
  return "red";
}

interface SidebarProps {
  workflows: WorkflowSummary[];
  runs: Run[];
  selectedRunId: string | null;
  selectedWorkflow: string | null;
  onSelectRun: (id: string) => void;
  onSelectWorkflow: (name: string | null) => void;
  loadingWorkflows?: boolean;
  loadingRuns?: boolean;
}

export default function Sidebar({
  workflows,
  runs,
  selectedRunId,
  selectedWorkflow,
  onSelectRun,
  onSelectWorkflow,
  loadingWorkflows,
  loadingRuns,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">S</div>
          <span className="sidebar-logo-text">Supaflow</span>
        </div>
      </div>

      {/* Workflows section */}
      <div className="sidebar-section" style={{ maxHeight: "40%", flexShrink: 0 }}>
        <div className="sidebar-section-label">Workflows</div>

        {loadingWorkflows ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>
            Loading…
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>
            No workflows found
          </div>
        ) : (
          <>
            <div
              className={`sidebar-item${selectedWorkflow === null ? " active" : ""}`}
              onClick={() => onSelectWorkflow(null)}
            >
              <div className="sidebar-item-main">
                <div className="sidebar-item-name">All workflows</div>
              </div>
            </div>
            {workflows.map((wf) => (
              <div
                key={wf.workflow_name}
                className={`sidebar-item${selectedWorkflow === wf.workflow_name ? " active" : ""}`}
                onClick={() => onSelectWorkflow(wf.workflow_name)}
              >
                <div className="sidebar-item-main">
                  <div className="sidebar-item-name">{wf.workflow_name}</div>
                  <div className="sidebar-item-meta">{wf.total_runs} runs</div>
                </div>
                <span
                  className={`sidebar-item-badge ${successRateColor(wf.success_rate)}`}
                >
                  {wf.success_rate}%
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Recent runs section */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Recent Runs</div>

        {loadingRuns ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>
            Loading…
          </div>
        ) : runs.length === 0 ? (
          <div style={{ padding: "8px 16px", color: "var(--text-muted)", fontSize: 11 }}>
            No runs found
          </div>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className={`sidebar-item${selectedRunId === run.id ? " active" : ""}`}
              onClick={() => onSelectRun(run.id)}
            >
              <div className={`status-dot ${run.status}`} />
              <div className="sidebar-item-main">
                <div className="sidebar-item-name">{run.workflow_name}</div>
                <div className="sidebar-item-meta">
                  {timeAgo(run.started_at)}
                  {run.duration_ms != null && (
                    <span style={{ marginLeft: 6 }}>
                      {formatDuration(run.duration_ms)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
