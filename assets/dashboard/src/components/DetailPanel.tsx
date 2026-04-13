import type { StepNodeData } from "../lib/graph";
import type { DlqEntry } from "../lib/queries";

interface DetailPanelProps {
  step: StepNodeData;
  dlqEntry?: DlqEntry | null;
  onClose: () => void;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatJson(obj: Record<string, unknown> | null): string {
  if (obj == null) return "null";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  running: "Running",
  pending: "Pending",
};

export default function DetailPanel({ step, dlqEntry, onClose }: DetailPanelProps) {
  const attempts = step.attempt ?? 1;

  // Build retry dots: all but last are failures (retried), last is success or fail
  const dots = Array.from({ length: attempts }, (_, i) => {
    if (i < attempts - 1) return "fail"; // earlier attempts failed
    return step.status === "completed" ? "pass" : "fail";
  });

  return (
    <aside className="detail-panel">
      <div className="detail-panel-header">
        <span className="detail-panel-title">{step.label}</span>
        <button
          className="detail-panel-close"
          onClick={onClose}
          aria-label="Close detail panel"
        >
          ×
        </button>
      </div>

      <div className="detail-panel-body">
        {/* Status */}
        <div className="detail-section">
          <div className="detail-section-label">Status</div>
          <div className={`detail-section-value`}>
            <span className={`status-badge ${step.status}`}>
              {STATUS_LABELS[step.status] ?? step.status}
            </span>
          </div>
        </div>

        {/* Duration + Attempts */}
        <div className="detail-row">
          <div className="detail-section">
            <div className="detail-section-label">Duration</div>
            <div
              className="detail-section-value"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
            >
              {formatDuration(step.duration_ms)}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-label">Attempts</div>
            <div
              className="detail-section-value"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
            >
              {attempts}
            </div>
          </div>
        </div>

        {/* Retry visualization */}
        {attempts > 1 && (
          <div className="detail-section">
            <div className="detail-section-label">Retry History</div>
            <div className="retry-dots">
              {dots.map((result, i) => (
                <div
                  key={i}
                  className={`retry-dot ${result}`}
                  title={`Attempt ${i + 1}: ${result === "pass" ? "success" : "failed"}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {step.input != null && (
          <div className="detail-section">
            <div className="detail-section-label">Input</div>
            <pre className="detail-code">{formatJson(step.input)}</pre>
          </div>
        )}

        {/* Output */}
        {step.status === "completed" && step.output != null && (
          <div className="detail-section">
            <div className="detail-section-label">Output</div>
            <pre className="detail-code">{formatJson(step.output)}</pre>
          </div>
        )}

        {/* Error */}
        {step.error && (
          <div className="detail-section">
            <div className="detail-section-label">Error</div>
            <pre className="detail-code error-block">{step.error}</pre>
          </div>
        )}

        {/* DLQ */}
        {dlqEntry && (
          <div className="detail-section">
            <div className="detail-section-label">Dead Letter Queue</div>
            <div className="dlq-notice">
              <span>⚠</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>In DLQ</div>
                <div style={{ fontSize: 10, opacity: 0.85 }}>{dlqEntry.error}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

