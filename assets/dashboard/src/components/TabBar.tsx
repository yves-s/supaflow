export type TabId = "flow" | "errors" | "logs";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  errorCount: number;
}

export default function TabBar({ activeTab, onTabChange, errorCount }: TabBarProps) {
  return (
    <div className="tab-bar">
      <button
        className={`tab-item${activeTab === "flow" ? " active" : ""}`}
        onClick={() => onTabChange("flow")}
      >
        Flow
      </button>
      <button
        className={`tab-item${activeTab === "errors" ? " active" : ""}`}
        onClick={() => onTabChange("errors")}
      >
        Errors
        {errorCount > 0 && <span className="tab-count red">{errorCount}</span>}
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
