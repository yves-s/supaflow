/**
 * View routing — minimal in-memory state. URL-state persistence is intentionally
 * out of scope (see T-1053 ticket). useState in App.tsx is the source of truth.
 */

export type ViewKind =
  | "overview"
  | "workflows"
  | "workflow"
  | "run"
  | "issues"
  | "logs";

export interface ViewState {
  kind: ViewKind;
  /** Selected workflow name when kind is `workflow` or `run`. */
  workflow?: string | null;
  /** Selected run id when kind is `run`. */
  runId?: string | null;
}

export interface BreadcrumbSegment {
  label: string;
  /** Target view to navigate to when clicked. `null` means current (non-clickable). */
  target: ViewState | null;
}

/**
 * Build breadcrumb trail for a given view. The leaf segment has `target = null`
 * so the topbar can render it as the current location.
 */
export function buildBreadcrumbs(state: ViewState): BreadcrumbSegment[] {
  switch (state.kind) {
    case "overview":
      return [{ label: "Overview", target: null }];

    case "workflows":
      return [{ label: "Workflows", target: null }];

    case "workflow":
      return [
        { label: "Workflows", target: { kind: "workflows" } },
        { label: state.workflow ?? "Workflow", target: null },
      ];

    case "run":
      return [
        { label: "Workflows", target: { kind: "workflows" } },
        {
          label: state.workflow ?? "Workflow",
          target: state.workflow
            ? { kind: "workflow", workflow: state.workflow }
            : null,
        },
        {
          label: state.runId ? `Run ${state.runId.slice(0, 8)}` : "Run",
          target: null,
        },
      ];

    case "issues":
      return [{ label: "Issues", target: null }];

    case "logs":
      return [{ label: "Logs", target: null }];
  }
}
