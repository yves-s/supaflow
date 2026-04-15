import { useState, useEffect, useCallback } from "react";
import {
  fetchFailedStepsForIssues,
  fetchIssueStatuses,
  upsertIssueStatus,
} from "../lib/queries";
import { groupIntoIssues, type Issue, type IssueStatus } from "../lib/issues";
import IssuePanel from "./IssuePanel";
import ErrorsView from "./ErrorsView";
import type { Run, DlqEntry } from "../lib/queries";

interface IssuesViewProps {
  workflowName: string | null;
  onRunSelect: (runId: string) => void;
  // Pass-through for Runs view
  failedRuns: Run[];
  dlqEntries: DlqEntry[];
  loadingErrors: boolean;
  onSelectDlq: (entry: DlqEntry) => void;
}

function timeAgoMs(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Sparkline({ buckets }: { buckets: number[] }) {
  const max = Math.max(...buckets, 1);
  return (
    <div className="sparkline" aria-hidden>
      {buckets.map((count, i) => (
        <div
          key={i}
          className={`sparkline-bar${count > 0 ? " active" : ""}`}
          style={{ height: `${Math.max(2, Math.round((count / max) * 18))}px` }}
        />
      ))}
    </div>
  );
}

type FilterStatus = IssueStatus;
type ViewMode = "issues" | "runs";

export default function IssuesView({
  workflowName,
  onRunSelect,
  failedRuns,
  dlqEntries,
  loadingErrors,
  onSelectDlq,
}: IssuesViewProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("unresolved");
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("issues");

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const [steps, storedStatuses] = await Promise.all([
        fetchFailedStepsForIssues(workflowName ?? undefined),
        fetchIssueStatuses(workflowName ?? undefined),
      ]);
      const grouped = groupIntoIssues(steps, storedStatuses, Date.now());
      setIssues(grouped);
    } catch (err) {
      console.error("Failed to load issues:", err);
    } finally {
      setLoading(false);
    }
  }, [workflowName]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleStatusChange = useCallback(
    async (status: IssueStatus) => {
      if (!selectedIssue) return;
      try {
        await upsertIssueStatus({
          workflow_name: selectedIssue.workflowName,
          step_name: selectedIssue.stepName,
          error_pattern: selectedIssue.errorPattern,
          status,
        });
        await loadIssues();
        // Update selected issue in local state optimistically
        setSelectedIssue((prev) => (prev ? { ...prev, status } : null));
      } catch (err) {
        console.error("Failed to update issue status:", err);
      }
    },
    [selectedIssue, loadIssues]
  );

  const filteredIssues = issues.filter((issue) => {
    if (issue.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      issue.errorPattern.toLowerCase().includes(q) ||
      issue.workflowName.toLowerCase().includes(q) ||
      issue.stepName.toLowerCase().includes(q)
    );
  });

  if (viewMode === "runs") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="issues-toolbar">
          <div style={{ flex: 1 }} />
          <button
            className="filter-chip"
            onClick={() => setViewMode("issues")}
          >
            Issues
          </button>
          <button
            className="filter-chip active resolved"
            onClick={() => setViewMode("runs")}
          >
            Runs
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <ErrorsView
            failedRuns={failedRuns}
            dlqEntries={dlqEntries}
            loading={loadingErrors}
            onSelectRun={onRunSelect}
            onSelectDlq={onSelectDlq}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="issues-toolbar">
        <input
          className="issues-search"
          type="text"
          placeholder="Fehler oder Workflow suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`filter-chip${filter === "unresolved" ? " active" : ""}`}
          onClick={() => setFilter("unresolved")}
        >
          Unresolved
        </button>
        <button
          className={`filter-chip${filter === "ignored" ? " active ignored" : ""}`}
          onClick={() => setFilter("ignored")}
        >
          Ignored
        </button>
        <button
          className={`filter-chip${filter === "resolved" ? " active resolved" : ""}`}
          onClick={() => setFilter("resolved")}
        >
          Resolved
        </button>
        <div
          style={{
            width: 1,
            height: 20,
            background: "var(--border)",
            flexShrink: 0,
          }}
        />
        <button
          className="filter-chip active resolved"
          onClick={() => setViewMode("issues")}
          style={{ marginLeft: 0 }}
        >
          Issues
        </button>
        <button
          className="filter-chip"
          onClick={() => setViewMode("runs")}
        >
          Runs
        </button>
      </div>

      {/* Content */}
      <div className="issues-content-area">
        <div className="issues-list-pane">
          {loading ? (
            <div className="empty-state">
              <div className="empty-state-title">Lade Issues…</div>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="empty-state">
              <div
                className="empty-state-icon"
                style={{ color: "var(--status-completed)" }}
              >
                &#10003;
              </div>
              <div className="empty-state-title">
                Keine {filter}-Issues
              </div>
              <div className="empty-state-sub">
                {search
                  ? "Keine Treffer für deine Suche"
                  : `Alle Issues sind ${filter === "unresolved" ? "gelöst oder ignoriert" : filter === "resolved" ? "noch offen" : "nicht ignoriert"}`}
              </div>
            </div>
          ) : (
            <>
              <div className="issues-section-label">
                {filteredIssues.length} {filter} Issue{filteredIssues.length !== 1 ? "s" : ""}
              </div>
              {filteredIssues.map((issue) => (
                <IssueRow
                  key={issue.key}
                  issue={issue}
                  selected={selectedIssue?.key === issue.key}
                  onClick={() =>
                    setSelectedIssue((prev) =>
                      prev?.key === issue.key ? null : issue
                    )
                  }
                />
              ))}
            </>
          )}
        </div>

        {selectedIssue && (
          <IssuePanel
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
            onRunSelect={onRunSelect}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}

function IssueRow({
  issue,
  selected,
  onClick,
}: {
  issue: Issue;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`issue-row${selected ? " selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={`issue-accent ${issue.status}`} />

      <div className="issue-body">
        {/* Title row */}
        <div
          className={`issue-title${issue.status === "resolved" ? " resolved" : issue.status === "ignored" ? " ignored" : ""}`}
          style={{ fontFamily: "var(--font-mono)" }}
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
            {issue.errorPattern}
          </span>
          <span className="issue-count-badge">{issue.count}×</span>
        </div>

        {/* Subtitle */}
        <div className="issue-sub">
          {issue.workflowName} › {issue.stepName}
        </div>

        {/* Sparkline + meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkline buckets={issue.sparkline} />
          <div className="issue-meta">
            <span className="issue-meta-item">
              Zuerst: {timeAgoMs(issue.firstSeenAt)}
            </span>
            <span className="issue-meta-item">
              Zuletzt: {timeAgoMs(issue.lastSeenAt)}
            </span>
            <span className={`issue-status-badge ${issue.status}`}>
              {issue.status}
            </span>
          </div>
        </div>

        {/* Trend indicator */}
        {issue.trend === "increasing" && (
          <div className="issue-meta" style={{ marginTop: 4 }}>
            <span className="issue-meta-item trend-up">↑ wird häufiger</span>
          </div>
        )}
        {issue.trend === "decreasing" && (
          <div className="issue-meta" style={{ marginTop: 4 }}>
            <span className="issue-meta-item trend-down">↓ wird seltener</span>
          </div>
        )}
      </div>
    </div>
  );
}
