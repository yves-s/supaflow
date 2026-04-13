import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface StepNodeData {
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  duration_ms: number | null;
  attempt: number;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  stepId: string;
  [key: string]: unknown;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const STATUS_ICONS: Record<string, string> = {
  completed: "✓",
  failed: "✗",
  running: "◌",
  pending: "○",
};

function StepNode({ data, selected }: NodeProps) {
  const nodeData = data as StepNodeData;
  const status = nodeData.status ?? "pending";

  const classes = [
    "step-node",
    status,
    selected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div className={classes}>
        <div className="step-node-header">
          <span className="step-node-name">{nodeData.label}</span>
          <span className={`step-node-icon ${status}`}>
            {STATUS_ICONS[status] ?? "○"}
          </span>
        </div>
        <div className="step-node-duration">
          {formatDuration(nodeData.duration_ms)}
          {nodeData.attempt > 1 && (
            <span style={{ color: "var(--status-running)", marginLeft: 6 }}>
              ×{nodeData.attempt}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export default memo(StepNode);
