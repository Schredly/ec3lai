import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface Props {
  tenantSlug: string;
  onCommandPalette?: () => void;
}

export default function GlobalTopBar({ tenantSlug, onCommandPalette }: Props) {
  const { data: agents } = useQuery({
    queryKey: ["agents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/agents", { tenantSlug });
      return res.json();
    },
  });

  const activeAgents = (agents ?? []).filter((a: any) => a.status === "active").length;

  return (
    <div style={barStyle}>
      {/* Left: Tenant + App */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
            EC3L
          </span>
          <span style={divider} />
          <span style={{ fontSize: "0.8rem", color: "#a0a0b8", fontWeight: 500 }}>
            {tenantSlug}
          </span>
        </div>
      </div>

      {/* Center: Command palette trigger */}
      <button
        onClick={onCommandPalette}
        style={searchStyle}
      >
        <span style={{ color: "#666", fontSize: "0.8rem" }}>Search commands...</span>
        <kbd style={kbdStyle}>⌘K</kbd>
      </button>

      {/* Right: Promote + Agent status + Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <AgentIndicator count={activeAgents} />
        <div style={avatarStyle}>U</div>
      </div>
    </div>
  );
}

function AgentIndicator({ count }: { count: number }) {
  const active = count > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.6rem", borderRadius: "6px", background: active ? "rgba(40, 167, 69, 0.15)" : "rgba(255,255,255,0.05)" }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: active ? "#28a745" : "#555" }} />
      <span style={{ fontSize: "0.75rem", color: active ? "#28a745" : "#666", fontWeight: 500 }}>
        {count} agent{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "48px",
  padding: "0 1.25rem",
  background: "#0d0d1a",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  flexShrink: 0,
};

const divider: React.CSSProperties = {
  display: "inline-block",
  width: "1px",
  height: "16px",
  background: "rgba(255,255,255,0.12)",
};

const searchStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2rem",
  padding: "0.35rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  cursor: "pointer",
  minWidth: "280px",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.1rem 0.4rem",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.08)",
  color: "#666",
  fontSize: "0.65rem",
  fontFamily: "inherit",
  border: "1px solid rgba(255,255,255,0.06)",
};

const avatarStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  background: "rgba(99,132,255,0.2)",
  color: "#6384ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.75rem",
  fontWeight: 700,
};
