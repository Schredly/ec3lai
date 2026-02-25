import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface Props {
  tenantSlug: string;
}

export default function ContextPanel({ tenantSlug }: Props) {
  const { data: recordTypes } = useQuery({
    queryKey: ["recordTypes", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/record-types", { tenantSlug });
      return res.json();
    },
  });

  const { data: environments } = useQuery({
    queryKey: ["environments", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/environments", { tenantSlug });
      return res.json();
    },
  });

  const { data: intents } = useQuery({
    queryKey: ["promotionIntents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/promotion-intents", { tenantSlug });
      return res.json();
    },
  });

  const rts = recordTypes ?? [];
  const envs = environments ?? [];
  const proms = intents ?? [];

  return (
    <div>
      {/* Graph summary */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#888",
          }}
        >
          Graph
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
          }}
        >
          <Stat label="Record Types" value={rts.length} />
          <Stat
            label="Active"
            value={rts.filter((r: any) => r.status === "active").length}
          />
          <Stat
            label="Draft"
            value={rts.filter((r: any) => r.status === "draft").length}
          />
          <Stat label="Environments" value={envs.length} />
        </div>
      </div>

      {/* Promotions */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#888",
          }}
        >
          Promotions
        </h3>
        {proms.length === 0 ? (
          <p style={{ fontSize: "0.8rem", color: "#999" }}>No promotions yet.</p>
        ) : (
          proms.slice(0, 5).map((p: any) => (
            <div
              key={p.id}
              style={{
                padding: "0.4rem 0",
                borderBottom: "1px solid #f0f0f0",
                fontSize: "0.8rem",
              }}
            >
              <StatusBadge status={p.status} />
              <span style={{ marginLeft: "0.4rem", color: "#555" }}>
                {p.id.slice(0, 8)}...
              </span>
            </div>
          ))
        )}
      </div>

      {/* Agent status */}
      <div>
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#888",
          }}
        >
          Agents
        </h3>
        <AgentSummary tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#f8f9fb",
        borderRadius: "6px",
        padding: "0.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1a1a2e" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.65rem", color: "#888", marginTop: "0.1rem" }}>
        {label}
      </div>
    </div>
  );
}

function AgentSummary({ tenantSlug }: { tenantSlug: string }) {
  const { data: agents } = useQuery({
    queryKey: ["agents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/agents", { tenantSlug });
      return res.json();
    },
  });

  const list = agents ?? [];
  if (list.length === 0) {
    return <p style={{ fontSize: "0.8rem", color: "#999" }}>No agents registered.</p>;
  }

  const active = list.filter((a: any) => a.status === "active").length;
  const paused = list.filter((a: any) => a.status === "paused").length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Stat label="Total" value={list.length} />
        <Stat label="Active" value={active} />
        <Stat label="Paused" value={paused} />
      </div>
      {list.slice(0, 4).map((a: any) => (
        <div
          key={a.id}
          style={{
            padding: "0.3rem 0",
            borderBottom: "1px solid #f0f0f0",
            fontSize: "0.8rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#333", fontWeight: 500 }}>{a.name}</span>
          <span
            style={{
              padding: "0.1rem 0.4rem",
              borderRadius: "3px",
              fontSize: "0.65rem",
              fontWeight: 600,
              background: a.status === "active" ? "#d4edda" : a.status === "paused" ? "#fff3cd" : "#f0f0f0",
              color: a.status === "active" ? "#155724" : a.status === "paused" ? "#856404" : "#666",
              textTransform: "capitalize",
            }}
          >
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: "#f0f0f0", fg: "#666" },
    previewed: { bg: "#fff3cd", fg: "#856404" },
    approved: { bg: "#d4edda", fg: "#155724" },
    executed: { bg: "#cce5ff", fg: "#004085" },
  };
  const c = colors[status] ?? colors.draft;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        borderRadius: "3px",
        fontSize: "0.7rem",
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
      }}
    >
      {status}
    </span>
  );
}
