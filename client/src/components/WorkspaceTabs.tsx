interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function WorkspaceTabs({ tabs, activeTab, onTabChange }: Props) {
  return (
    <div style={barStyle}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              ...tabStyle,
              color: active ? "#fff" : "#666",
              borderBottom: active ? "2px solid #6384ff" : "2px solid transparent",
              background: active ? "rgba(99,132,255,0.06)" : "transparent",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: "flex",
  gap: "0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  marginBottom: "1.25rem",
};

const tabStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  border: "none",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 500,
  letterSpacing: "0.02em",
  transition: "all 0.15s ease",
  borderRadius: "4px 4px 0 0",
};
