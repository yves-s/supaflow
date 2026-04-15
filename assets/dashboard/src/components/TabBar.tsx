export type TabId = "flow" | "issues" | "logs";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  errorCount: number;
  unresolvedCount?: number;
}

export default function TabBar({
  activeTab,
  onTabChange,
  errorCount,
  unresolvedCount,
}: TabBarProps) {
  // Show unresolvedCount on Issues tab when available, otherwise fall back to errorCount
  const issuesBadge = unresolvedCount !== undefined ? unresolvedCount : errorCount;

  return (
    <div className="tab-bar">
      <button
        className={`tab-item${activeTab === "flow" ? " active" : ""}`}
        onClick={() => onTabChange("flow")}
      >
        Flow
      </button>
      <button
        className={`tab-item${activeTab === "issues" ? " active" : ""}`}
        onClick={() => onTabChange("issues")}
      >
        Issues
        {issuesBadge > 0 && (
          <span className="tab-count red">{issuesBadge}</span>
        )}
      </button>
      <button
        className={`tab-item${activeTab === "logs" ? " active" : ""}`}
        onClick={() => onTabChange("logs")}
      >
        Logs
      </button>
    </div>
  );
}
