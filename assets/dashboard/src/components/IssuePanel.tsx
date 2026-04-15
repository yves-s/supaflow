import type { Issue, IssueStatus } from "../lib/issues";

interface IssuePanelProps {
  issue: Issue | null;
  onClose: () => void;
  onRunSelect: (runId: string) => void;
  onStatusChange: (status: IssueStatus) => void;
}

export default function IssuePanel({
  issue,
  onClose,
  onRunSelect,
  onStatusChange,
}: IssuePanelProps) {
  if (!issue) return null;

  const handleRunClick = (runId: string) => {
    onRunSelect(runId);
    onClose();
  };

  return (
    <div className="issue-panel">
      <div className="issue-panel-header">
        <span className="issue-panel-title">{issue.stepName}</span>
        <button className="detail-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="issue-panel-body">
        {/* Error pattern */}
        <div className="issue-panel-section">
          <div className="issue-panel-label">Error Pattern</div>
          <pre className="detail-code error-block">
            <code>{issue.errorPattern}</code>
          </pre>
        </div>

        {/* Workflow / Step */}
        <div className="issue-panel-section">
          <div className="issue-panel-label">Location</div>
          <div className="issue-panel-value" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {issue.workflowName} › {issue.stepName}
          </div>
        </div>

        {/* Affected runs */}
        <div className="issue-panel-section">
          <div className="issue-panel-label">
            Betroffene Runs ({issue.runIds.length})
          </div>
          <div>
            {issue.runIds.slice(0, 20).map((runId) => (
              <button
                key={runId}
                className="run-link"
                onClick={() => handleRunClick(runId)}
              >
                <span className="run-link-id">{runId.slice(0, 8)}</span>
                <span className="run-link-arrow">→</span>
              </button>
            ))}
            {issue.runIds.length > 20 && (
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  padding: "4px 10px",
                }}
              >
                + {issue.runIds.length - 20} weitere
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="issue-panel-section">
          <div className="issue-panel-label">Aktionen</div>
          <div className="issue-actions">
            {issue.status !== "resolved" && (
              <button
                className="issue-action-btn resolve"
                onClick={() => onStatusChange("resolved")}
              >
                Als gelöst markieren
              </button>
            )}
            {issue.status !== "ignored" && (
              <button
                className="issue-action-btn ignore"
                onClick={() => onStatusChange("ignored")}
              >
                Ignorieren
              </button>
            )}
            {(issue.status === "resolved" || issue.status === "ignored") && (
              <button
                className="issue-action-btn reopen"
                onClick={() => onStatusChange("unresolved")}
              >
                Wieder öffnen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
