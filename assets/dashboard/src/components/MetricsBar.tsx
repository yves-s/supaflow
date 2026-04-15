import type { Metrics } from "../lib/queries";

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function timeAgoMs(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export interface MetricsBarProps {
  metrics: Metrics | null;
  loading?: boolean;
  lastFetchedAt?: number | null;
  onRefresh?: () => void;
  deltas?: {
    successRate?: number;
    totalRuns?: number;
    avgDuration?: number;
  };
}

interface DeltaProps {
  value: number | undefined;
  unit?: "%" | "ms" | "";
  invertSign?: boolean;
}

function Delta({ value, unit = "", invertSign = false }: DeltaProps) {
  if (value === undefined || Math.abs(value) < 0.5) return null;

  const positive = invertSign ? value < 0 : value > 0;
  const arrow = value > 0 ? "↑" : "↓";
  const formatted =
    unit === "%"
      ? `${Math.abs(value).toFixed(1)}%`
      : unit === "ms"
      ? formatDuration(Math.abs(value))
      : String(Math.abs(Math.round(value)));

  return (
    <div className={`metric-delta ${positive ? "positive" : "negative"}`}>
      {arrow} {formatted} vs. gestern
    </div>
  );
}

interface MetricCardProps {
  value: string;
  label: string;
  color: "white" | "green" | "red" | "amber";
  delta?: React.ReactNode;
}

function MetricCard({ value, label, color, delta }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div className={`metric-value ${color}`}>{value}</div>
      <div className="metric-label">{label}</div>
      {delta}
    </div>
  );
}

export default function MetricsBar({
  metrics,
  loading,
  lastFetchedAt,
  onRefresh,
  deltas,
}: MetricsBarProps) {
  const placeholder = "—";

  const dataAge = lastFetchedAt ? Date.now() - lastFetchedAt : null;
  const isFresh = dataAge !== null && dataAge < 30_000;
  const isStale = dataAge === null || dataAge > 60_000;

  return (
    <div className="metrics-bar">
      <MetricCard
        value={loading ? placeholder : String(metrics?.totalRuns ?? 0)}
        label="Total Runs"
        color="white"
        delta={
          !loading && (
            <Delta value={deltas?.totalRuns} unit="" />
          )
        }
      />
      <MetricCard
        value={loading ? placeholder : `${metrics?.successRate ?? 0}%`}
        label="Success Rate"
        color="green"
        delta={
          !loading && (
            <Delta value={deltas?.successRate} unit="%" />
          )
        }
      />
      <MetricCard
        value={loading ? placeholder : formatDuration(metrics?.avgDurationMs ?? 0)}
        label="Avg Duration"
        color="white"
        delta={
          !loading && (
            <Delta value={deltas?.avgDuration} unit="ms" invertSign />
          )
        }
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

      {/* Freshness indicator */}
      <div className="freshness-indicator">
        <div
          className={`freshness-dot ${isFresh ? "fresh" : "stale"}`}
          title={isStale ? "Daten veraltet" : "Daten aktuell"}
        />
        {lastFetchedAt && (
          <span className="freshness-text">
            vor {timeAgoMs(lastFetchedAt)}
          </span>
        )}
        {onRefresh && (
          <button
            className="freshness-refresh"
            onClick={onRefresh}
            title="Aktualisieren"
            aria-label="Daten aktualisieren"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
