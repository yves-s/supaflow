import type { WorkflowSummary } from "../lib/queries";
import type { ViewKind } from "../lib/view";

interface NavItem {
  id: ViewKind;
  label: string;
  icon: JSX.Element;
  badge?: number;
}

interface AppSidebarProps {
  view: ViewKind;
  selectedWorkflow: string | null;
  workflows: WorkflowSummary[];
  loadingWorkflows?: boolean;
  unresolvedCount: number;
  onNavigate: (view: ViewKind) => void;
  onSelectWorkflow: (name: string | null) => void;
}

const HomeIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7l6-4.5L14 7v6.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Z" />
    <path d="M6.5 14.5v-4h3v4" />
  </svg>
);
const WorkflowsIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="4" height="3" rx="1" />
    <rect x="10" y="3" width="4" height="3" rx="1" />
    <rect x="6" y="10" width="4" height="3" rx="1" />
    <path d="M4 6v1.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6" />
    <path d="M8 8.5V10" />
  </svg>
);
const IssuesIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v4" />
    <circle cx="8" cy="11" r="0.5" fill="currentColor" />
  </svg>
);
const LogsIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2.5h10v11H3z" />
    <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1.5v1.7M8 12.8v1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M1.5 8h1.7M12.8 8h1.7M3.4 12.6l1.2-1.2M11.4 4.6l1.2-1.2" />
  </svg>
);

function workflowDotClass(rate: number): "completed" | "running" | "failed" | "" {
  if (rate >= 90) return "completed";
  if (rate >= 60) return "running";
  if (rate < 60) return "failed";
  return "";
}

export default function AppSidebar({
  view,
  selectedWorkflow,
  workflows,
  loadingWorkflows,
  unresolvedCount,
  onNavigate,
  onSelectWorkflow,
}: AppSidebarProps) {
  const navItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: <HomeIcon /> },
    { id: "workflows", label: "Workflows", icon: <WorkflowsIcon />, badge: workflows.length || undefined },
    { id: "issues", label: "Issues", icon: <IssuesIcon />, badge: unresolvedCount || undefined },
    { id: "logs", label: "Logs", icon: <LogsIcon /> },
  ];

  const isNavActive = (id: ViewKind): boolean => {
    if (id === "workflows") return view === "workflows" || view === "workflow" || view === "run";
    return view === id;
  };

  return (
    <aside className="sidebar">
      {/* Brand mark */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden>S</div>
        <span className="sidebar-brand-name">Supaflow</span>
      </div>

      {/* Project picker (static for now) */}
      <button type="button" className="sidebar-project-picker" disabled>
        <span className="sidebar-project-picker-dot" aria-hidden />
        <span className="sidebar-project-picker-name">Default project</span>
        <span className="sidebar-project-picker-caret" aria-hidden>▾</span>
      </button>

      {/* Top nav */}
      <nav className="sidebar-nav" aria-label="Primary">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-nav-item${isNavActive(item.id) ? " active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sidebar-nav-item-icon" aria-hidden>{item.icon}</span>
            <span className="sidebar-nav-item-label">{item.label}</span>
            {item.badge != null && (
              <span className="sidebar-nav-item-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Workflow list section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-label">Workflows</span>
          <button type="button" className="sidebar-section-action" aria-label="New workflow">
            <PlusIcon />
          </button>
        </div>

        <div className="sidebar-workflow-list">
          {loadingWorkflows ? (
            <div className="sidebar-empty">Loading…</div>
          ) : workflows.length === 0 ? (
            <div className="sidebar-empty">No workflows yet</div>
          ) : (
            workflows.map((wf) => (
              <button
                key={wf.workflow_name}
                type="button"
                className={`sidebar-workflow-item${
                  selectedWorkflow === wf.workflow_name ? " active" : ""
                }`}
                onClick={() => onSelectWorkflow(wf.workflow_name)}
              >
                <span
                  className={`sidebar-workflow-dot ${workflowDotClass(wf.success_rate)}`}
                  aria-hidden
                />
                <span className="sidebar-workflow-name">{wf.workflow_name}</span>
                <span className="sidebar-workflow-meta">{wf.total_runs}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User foot */}
      <div className="sidebar-foot">
        <div className="sidebar-foot-avatar" aria-hidden>YS</div>
        <div className="sidebar-foot-info">
          <span className="sidebar-foot-name">You</span>
          <span className="sidebar-foot-role">Owner</span>
        </div>
        <button type="button" className="sidebar-foot-action" aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>
    </aside>
  );
}
