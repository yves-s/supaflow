import type { Metrics } from "../lib/queries";

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface MetricsBarProps {
  metrics: Metrics | null;
  loading?: boolean;
}

interface MetricCardProps {
  value: string;
  label: string;
  color: "white" | "green" | "red" | "amber";
}

function MetricCard({ value, label, color }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className={`metric-value ${color}`}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export default function MetricsBar({ metrics, loading }: MetricsBarProps) {
  const placeholder = "—";

  return (
    <div className="metrics-bar">
      <MetricCard
        value={loading ? placeholder : String(metrics?.totalRuns ?? 0)}
        label="Total Runs"
        color="white"
      />
      <MetricCard
        value={loading ? placeholder : `${metrics?.successRate ?? 0}%`}
        label="Success Rate"
        color="green"
      />
      <MetricCard
        value={loading ? placeholder : formatDuration(metrics?.avgDurationMs ?? 0)}
        label="Avg Duration"
        color="white"
      />
      <MetricCard
        value={loading ? placeholder : String(metrics?.dlqCount ?? 0)}
        label="DLQ Entries"
        color="red"
      />
      <MetricCard
        value={loading ? placeholder : String(metrics?.runningCount ?? 0)}
        label="Running"
        color="amber"
      />
    </div>
  );
}
