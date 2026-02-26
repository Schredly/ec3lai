import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useState } from "react";

interface Props {
  tenantSlug: string;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "⊞" },
  { key: "apps", label: "Apps", icon: "◫" },
  { key: "builder", label: "Builder", icon: "✦" },
  { key: "agents", label: "Agents", icon: "⬡" },
  { key: "graph", label: "Graph", icon: "◈" },
  { key: "manage", label: "Settings", icon: "⚙" },
];

export default function LeftNav({ tenantSlug, activeSection, onNavigate }: Props) {
  const [appsExpanded, setAppsExpanded] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const { data: recordTypes } = useQuery({
    queryKey: ["recordTypes", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/record-types", { tenantSlug });
      return res.json();
    },
  });

  const { data: drafts } = useQuery({
    queryKey: ["vibeDrafts", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/vibe/drafts", { tenantSlug });
      return res.json();
    },
  });

  if (collapsed) {
    return (
      <div style={collapsedStyle}>
        <button onClick={() => setCollapsed(false)} style={collapseBtn}>›</button>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            title={item.label}
            style={{
              ...iconOnlyBtn,
              background: activeSection === item.key ? "rgba(99,132,255,0.15)" : "transparent",
              color: activeSection === item.key ? "#6384ff" : "#8888aa",
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={navStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#555", fontWeight: 600 }}>
            Tenant
          </div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e0e0f0", marginTop: "0.1rem" }}>
            {tenantSlug}
          </div>
        </div>
        <button onClick={() => setCollapsed(true)} style={collapseBtn}>‹</button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "0.5rem 0" }}>
        {NAV_ITEMS.map((item) => (
          <div key={item.key}>
            <button
              onClick={() => {
                onNavigate(item.key);
                if (item.key === "apps") setAppsExpanded(!appsExpanded);
              }}
              style={{
                ...navItemStyle,
                background: activeSection === item.key ? "rgba(99,132,255,0.12)" : "transparent",
                color: activeSection === item.key ? "#fff" : "#a0a0b8",
                borderLeft: activeSection === item.key ? "3px solid #6384ff" : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: "0.85rem", width: "20px", textAlign: "center" }}>{item.icon}</span>
              <span style={{ fontSize: "0.8rem", fontWeight: activeSection === item.key ? 600 : 400 }}>{item.label}</span>
              {item.key === "apps" && (
                <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#555" }}>
                  {appsExpanded ? "▾" : "▸"}
                </span>
              )}
            </button>

            {/* Expandable app list */}
            {item.key === "apps" && appsExpanded && (
              <div style={{ paddingLeft: "2rem" }}>
                {(recordTypes ?? []).slice(0, 10).map((rt: any) => (
                  <button
                    key={rt.id}
                    onClick={() => onNavigate(`app:${rt.key}`)}
                    style={subItemStyle}
                  >
                    {rt.name}
                  </button>
                ))}
                {(drafts ?? []).length > 0 && (
                  <div style={{ fontSize: "0.6rem", color: "#555", padding: "0.4rem 0.5rem 0.15rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Drafts
                  </div>
                )}
                {(drafts ?? []).slice(0, 5).map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => onNavigate("builder")}
                    style={{ ...subItemStyle, color: "#7878a0" }}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: "0.65rem", color: "#444" }}>
        EC3L v1.0
      </div>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "#111122",
  overflow: "hidden",
};

const collapsedStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.5rem 0",
  height: "100%",
  background: "#111122",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

const navItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.15s ease",
};

const subItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.3rem 0.5rem",
  border: "none",
  background: "transparent",
  color: "#8888aa",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "0.75rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const collapseBtn: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,0.04)",
  color: "#666",
  cursor: "pointer",
  borderRadius: "4px",
  padding: "0.15rem 0.4rem",
  fontSize: "0.8rem",
};

const iconOnlyBtn: React.CSSProperties = {
  border: "none",
  cursor: "pointer",
  borderRadius: "6px",
  padding: "0.4rem",
  fontSize: "1rem",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
