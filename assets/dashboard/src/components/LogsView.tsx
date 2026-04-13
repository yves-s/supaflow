import type { StepWithWorkflow } from "../lib/queries";

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--:--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "--";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface LogsViewProps {
  steps: StepWithWorkflow[];
  loading: boolean;
  onSelectStep: (step: StepWithWorkflow) => void;
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton skeleton-line w-sm" />
          <div className="skeleton skeleton-line w-md" />
          <div className="skeleton skeleton-line w-lg" />
          <div className="skeleton skeleton-dot" />
          <div className="skeleton skeleton-line w-sm" />
        </div>
      ))}
    </>
  );
}

export default function LogsView({ steps, loading, onSelectStep }: LogsViewProps) {
  if (loading) {
    return (
      <div className="logs-view">
        <SkeletonRows count={8} />
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="logs-view">
        <div className="empty-state">
          <div className="empty-state-icon">&#9776;</div>
          <div className="empty-state-title">No steps recorded yet</div>
          <div className="empty-state-sub">
            Steps will appear here as workflows execute
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="logs-view">
      {steps.map((step) => (
        <button
          key={step.id}
          className="log-item"
          onClick={() => onSelectStep(step)}
        >
          <span className="log-timestamp">{formatTime(step.started_at)}</span>
          <span className="log-workflow">{step.workflow_name}</span>
          <span className="log-step">{step.name}</span>
          <span className={`log-status ${step.status}`} />
          <span className="log-duration">{formatDuration(step.duration_ms)}</span>
        </button>
      ))}
    </div>
  );
}
