import type { Run, DlqEntry } from "../lib/queries";

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

interface ErrorsViewProps {
  failedRuns: Run[];
  dlqEntries: DlqEntry[];
  loading: boolean;
  onSelectRun: (id: string) => void;
  onSelectDlq: (entry: DlqEntry) => void;
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton skeleton-dot" />
          <div className="skeleton skeleton-line w-md" />
          <div className="skeleton skeleton-line w-xl" />
        </div>
      ))}
    </>
  );
}

export default function ErrorsView({
  failedRuns,
  dlqEntries,
  loading,
  onSelectRun,
  onSelectDlq,
}: ErrorsViewProps) {
  if (loading) {
    return (
      <div className="errors-view">
        <div className="errors-section-label">Failed Runs</div>
        <SkeletonRows count={4} />
      </div>
    );
  }

  const hasErrors = failedRuns.length > 0 || dlqEntries.length > 0;

  if (!hasErrors) {
    return (
      <div className="errors-view">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ color: "var(--status-completed)" }}>
            &#10003;
          </div>
          <div className="empty-state-title">No errors found</div>
          <div className="empty-state-sub">All good -- no errors to report</div>
        </div>
      </div>
    );
  }

  return (
    <div className="errors-view">
      {failedRuns.length > 0 && (
        <>
          <div className="errors-section-label">Failed Runs</div>
          {failedRuns.map((run) => (
            <button
              key={run.id}
              className="error-item"
              onClick={() => onSelectRun(run.id)}
            >
              <div className="error-dot" />
              <div className="error-content">
                <div className="error-header">
                  <span className="error-workflow">{run.workflow_name}</span>
                  <span className="error-run-id">{run.id.slice(0, 8)}</span>
                </div>
                <div className="error-message">
                  {run.error ?? "Run failed without error message"}
                </div>
              </div>
              <span className="error-time">{timeAgo(run.started_at)}</span>
            </button>
          ))}
        </>
      )}

      {dlqEntries.length > 0 && (
        <>
          <div className="errors-section-label">Dead Letter Queue</div>
          {dlqEntries.map((entry) => (
            <button
              key={entry.id}
              className="error-item"
              onClick={() => onSelectDlq(entry)}
            >
              <div className="error-dot dlq" />
              <div className="error-content">
                <div className="error-header">
                  <span className="error-workflow">{entry.workflow_name}</span>
                  <span className="error-run-id">{entry.run_id.slice(0, 8)}</span>
                </div>
                <div className="error-message dlq">{entry.error}</div>
                <div className="error-meta">
                  {entry.step_id && (
                    <span className="error-step">step: {entry.step_id.slice(0, 8)}</span>
                  )}
                </div>
              </div>
              <span className="error-time">{timeAgo(entry.created_at)}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
