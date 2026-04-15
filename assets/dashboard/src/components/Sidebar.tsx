import { useState, useEffect } from "react";
import type { WorkflowSummary, Run, CoverageEntry } from "../lib/queries";
import { fetchCoverage } from "../lib/queries";

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

function timeAgoMs(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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

const DAY_MS = 24 * 60 * 60 * 1000;

interface CoverageIconProps {
  entry: CoverageEntry | undefined;
}

function CoverageIcon({ entry }: CoverageIconProps) {
  if (!entry) return null;

  // New workflow: fewer than 3 total records
  if (entry.knownStepCount < 3) return null;

  const now = Date.now();
  const isActive = entry.lastActivityAt !== null && now - entry.lastActivityAt < DAY_MS;
  const isStale = entry.lastActivityAt === null || now - entry.lastActivityAt >= DAY_MS;

  const tooltipText = entry.lastActivityAt
    ? `Letzter Step vor ${timeAgoMs(entry.lastActivityAt)} · ${entry.knownStepCount} bekannte Steps`
    : `Kein Activity · ${entry.knownStepCount} bekannte Steps`;

  return (
    <span className={`coverage-icon ${isActive ? "ok" : isStale ? "warn" : ""}`}>
      {isActive ? "●" : "⚠"}
      <span className="coverage-tooltip">{tooltipText}</span>
    </span>
  );
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
  const [coverage, setCoverage] = useState<CoverageEntry[]>([]);

  useEffect(() => {
    if (workflows.length === 0) return;
    const names = workflows.map((w) => w.workflow_name);
    fetchCoverage(names)
      .then(setCoverage)
      .catch(console.error);
  }, [workflows]);

  const coverageMap = new Map(coverage.map((c) => [c.workflow_name, c]));

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
                  <div
                    className="sidebar-item-name"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {wf.workflow_name}
                    </span>
                    <CoverageIcon entry={coverageMap.get(wf.workflow_name)} />
                  </div>
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
