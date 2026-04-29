import type { BreadcrumbSegment, ViewState } from "../lib/view";

interface TopbarProps {
  breadcrumbs: BreadcrumbSegment[];
  /** Status of the live data link — drives the pulse colour. */
  liveStatus: "live" | "stale" | "error";
  /** Range label shown on the range picker (UI only — no behaviour yet). */
  range: string;
  refreshing?: boolean;
  notifications?: number;
  onCrumbClick: (target: ViewState) => void;
  onRefresh: () => void;
}

const SearchIcon = () => (
  <svg className="topbar-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L13 13" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transition: "transform 200ms cubic-bezier(0.2,0,0,1)",
      animation: spinning ? "pulse 1s linear infinite" : undefined,
    }}
  >
    <path d="M2.5 8a5.5 5.5 0 0 1 9.7-3.5L13.5 6" />
    <path d="M13.5 2.5V6h-3.5" />
    <path d="M13.5 8a5.5 5.5 0 0 1-9.7 3.5L2.5 10" />
    <path d="M2.5 13.5V10h3.5" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7a4 4 0 1 1 8 0v3l1.2 2H2.8L4 10V7Z" />
    <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
    <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" />
  </svg>
);

export default function Topbar({
  breadcrumbs,
  liveStatus,
  range,
  refreshing,
  notifications,
  onCrumbClick,
  onRefresh,
}: TopbarProps) {
  const pulseClass =
    liveStatus === "live" ? "" : liveStatus === "stale" ? " is-stale" : " is-error";
  const pulseLabel =
    liveStatus === "live" ? "Live" : liveStatus === "stale" ? "Stale" : "Offline";

  return (
    <header className="topbar" role="banner">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((seg, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <span key={`${seg.label}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {seg.target && !isLast ? (
                <button
                  type="button"
                  className="breadcrumb"
                  onClick={() => onCrumbClick(seg.target!)}
                >
                  {seg.label}
                </button>
              ) : (
                <span className="breadcrumb is-current" aria-current={isLast ? "page" : undefined}>
                  {seg.label}
                </span>
              )}
              {!isLast && <span className="breadcrumb-sep" aria-hidden>/</span>}
            </span>
          );
        })}
      </nav>

      {/* Search (stub) */}
      <label className="topbar-search">
        <SearchIcon />
        <input
          type="search"
          className="topbar-search-input"
          placeholder="Search workflows, runs, errors…"
          disabled
          aria-label="Search"
        />
        <span className="topbar-search-kbd" aria-hidden>⌘K</span>
      </label>

      {/* Right-side actions */}
      <div className="topbar-actions">
        <span className={`live-pulse${pulseClass}`} aria-live="polite">
          <span className="live-pulse-dot" aria-hidden />
          {pulseLabel}
        </span>

        <button type="button" className="range-picker" aria-label="Time range">
          <CalendarIcon />
          <span>{range}</span>
        </button>

        <button
          type="button"
          className="icon-button"
          aria-label="Refresh"
          onClick={onRefresh}
        >
          <RefreshIcon spinning={refreshing} />
        </button>

        <button type="button" className="icon-button" aria-label="Notifications">
          <BellIcon />
          {notifications != null && notifications > 0 && (
            <span className="badge-dot" aria-hidden />
          )}
        </button>
      </div>
    </header>
  );
}
