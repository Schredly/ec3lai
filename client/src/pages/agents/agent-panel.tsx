import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useState } from "react";

interface Props {
  tenantSlug: string;
}

export default function AgentPanel({ tenantSlug }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/agents", { tenantSlug });
      return res.json();
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["agentLogs", tenantSlug, selectedAgentId],
    queryFn: async () => {
      const res = await apiRequest(`/agents/${selectedAgentId}/logs`, { tenantSlug });
      return res.json();
    },
    enabled: !!selectedAgentId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; subscribedEvents: string[] }) => {
      const res = await apiRequest("/agents", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      setShowCreate(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest(`/agents/${id}/status`, {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  // Stats
  const agentList = agents ?? [];
  const activeCount = agentList.filter((a: any) => a.status === "active").length;
  const boundCount = agentList.filter((a: any) => a.boundPackageInstallId).length;

  if (isLoading) return <p style={{ color: "#555" }}>Loading agents...</p>;

  return (
    <div>
      {/* Header */}
      <div style={headerRow}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#e0e0f0" }}>
            Agent Control Tower
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#666" }}>
            {agentList.length} registered &middot; {activeCount} active &middot; {boundCount} bound
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={primaryBtn}>
          {showCreate ? "Cancel" : "+ Register Agent"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const events = (fd.get("events") as string)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            createMutation.mutate({
              name: fd.get("name") as string,
              subscribedEvents: events,
            });
          }}
          style={createForm}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem", alignItems: "start" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input name="name" required placeholder="e.g. Onboarding Bot" style={formInput} />
            </div>
            <div>
              <label style={labelStyle}>Subscribed Events (comma-separated)</label>
              <input name="events" placeholder="e.g. record.assigned, execution_completed" style={formInput} />
            </div>
          </div>
          <button type="submit" disabled={createMutation.isPending} style={{ ...primaryBtn, marginTop: "0.5rem" }}>
            {createMutation.isPending ? "Creating..." : "Create Agent"}
          </button>
        </form>
      )}

      {/* Agent cards */}
      {agentList.length === 0 ? (
        <div style={emptyState}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⬡</div>
          <p style={{ color: "#888", fontSize: "0.85rem" }}>No agents registered.</p>
          <p style={{ color: "#555", fontSize: "0.78rem" }}>Register an agent to start orchestrating.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {agentList.map((agent: any) => {
            const isSelected = selectedAgentId === agent.id;
            const lifecycle = getLifecycle(agent);

            return (
              <div key={agent.id} style={agentCard(isSelected)}>
                {/* Top row: Name + Status + Toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1 }}>
                    {/* Status indicator */}
                    <div style={statusOrb(agent.status)} />

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span
                          style={{ fontWeight: 600, fontSize: "0.92rem", color: "#e0e0f0", cursor: "pointer" }}
                          onClick={() => setSelectedAgentId(isSelected ? null : agent.id)}
                        >
                          {agent.name}
                        </span>
                        <LifecycleBadge lifecycle={lifecycle} />
                        <StatusBadge status={agent.status} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#555", marginTop: "0.15rem" }}>
                        ID: {agent.id?.slice(0, 8)}...
                        {agent.version && <span> &middot; v{agent.version}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {lifecycle === "draft" ? (
                      <span style={hintText}>Promote to activate</span>
                    ) : agent.status === "active" ? (
                      <button
                        onClick={() => toggleMutation.mutate({ id: agent.id, status: "paused" })}
                        style={toggleBtn("active")}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleMutation.mutate({ id: agent.id, status: "active" })}
                        style={toggleBtn("paused")}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={statsRow}>
                  <StatItem label="Executions" value={agent.executionCount ?? 0} />
                  <StatItem label="Last Run" value={agent.lastExecutionAt ? timeAgo(agent.lastExecutionAt) : "Never"} />
                  <StatItem
                    label="Last Status"
                    value={agent.lastExecutionStatus ?? "—"}
                    color={agent.lastExecutionStatus === "failed" ? "#ff4444" : agent.lastExecutionStatus === "completed" ? "#28a745" : "#888"}
                  />
                  <StatItem label="Bound Package" value={agent.boundPackageInstallId ? "Yes" : "None"} color={agent.boundPackageInstallId ? "#6384ff" : "#555"} />
                </div>

                {/* Event subscriptions */}
                {((agent.subscribedEvents as string[]) ?? []).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
                    <span style={{ fontSize: "0.68rem", color: "#555", marginRight: "0.2rem", lineHeight: "20px" }}>Events:</span>
                    {((agent.subscribedEvents as string[]) ?? []).map((ev: string, i: number) => (
                      <span key={i} style={eventPill}>{ev}</span>
                    ))}
                  </div>
                )}

                {/* Execution logs (expanded) */}
                {isSelected && (
                  <div style={logsSection}>
                    <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.78rem", fontWeight: 600, color: "#a0a0b8" }}>
                      Execution Log
                    </h4>
                    {(logs ?? []).length === 0 ? (
                      <p style={{ color: "#555", fontSize: "0.78rem" }}>No executions recorded.</p>
                    ) : (
                      <div style={{ display: "grid", gap: "0.3rem" }}>
                        {(logs ?? []).slice(0, 10).map((log: any) => (
                          <div key={log.id} style={logRow}>
                            <span style={logEvent}>{log.eventType}</span>
                            <LogStatusBadge status={log.status} />
                            <span style={logMeta}>{log.durationMs ?? "—"}ms</span>
                            <span style={logMeta}>{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --- Helper Components --- */

function LifecycleBadge({ lifecycle }: { lifecycle: "draft" | "installed" | "promoted" }) {
  const styles: Record<string, { bg: string; fg: string; border: string }> = {
    draft: { bg: "rgba(255,255,255,0.04)", fg: "#888", border: "rgba(255,255,255,0.08)" },
    installed: { bg: "rgba(99,132,255,0.12)", fg: "#6384ff", border: "rgba(99,132,255,0.2)" },
    promoted: { bg: "rgba(40,167,69,0.12)", fg: "#28a745", border: "rgba(40,167,69,0.2)" },
  };
  const s = styles[lifecycle];
  return (
    <span style={{
      display: "inline-block",
      padding: "0.1rem 0.4rem",
      borderRadius: "4px",
      fontSize: "0.62rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      background: s.bg,
      color: s.fg,
      border: `1px solid ${s.border}`,
    }}>
      {lifecycle}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    inactive: { bg: "rgba(255,255,255,0.04)", fg: "#555" },
    active: { bg: "rgba(40,167,69,0.12)", fg: "#28a745" },
    paused: { bg: "rgba(255,200,50,0.12)", fg: "#e0b030" },
  };
  const c = colors[status] ?? colors.inactive;
  return (
    <span style={{
      display: "inline-block",
      padding: "0.1rem 0.4rem",
      borderRadius: "4px",
      fontSize: "0.62rem",
      fontWeight: 600,
      textTransform: "capitalize",
      background: c.bg,
      color: c.fg,
    }}>
      {status}
    </span>
  );
}

function LogStatusBadge({ status }: { status: string }) {
  const fg = status === "completed" ? "#28a745" : status === "failed" ? "#ff4444" : "#888";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: fg, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.62rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: color ?? "#a0a0b8", marginTop: "0.1rem" }}>
        {value}
      </div>
    </div>
  );
}

/* --- Helpers --- */

function getLifecycle(agent: any): "draft" | "installed" | "promoted" {
  if (!agent.boundPackageInstallId) return "draft";
  // If bound and status has been active at least once, consider promoted
  if (agent.status === "active") return "promoted";
  return "installed";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* --- Styles --- */

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "1.25rem",
};

const primaryBtn: React.CSSProperties = {
  padding: "0.45rem 1rem",
  borderRadius: "8px",
  border: "none",
  background: "#6384ff",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.82rem",
  cursor: "pointer",
  transition: "all 0.15s ease",
};

const createForm: React.CSSProperties = {
  padding: "1rem",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  marginBottom: "1rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: "0.75rem",
  marginBottom: "0.25rem",
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const formInput: React.CSSProperties = {
  width: "100%",
  padding: "0.45rem 0.6rem",
  boxSizing: "border-box",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#e0e0f0",
  fontSize: "0.85rem",
  outline: "none",
};

const emptyState: React.CSSProperties = {
  textAlign: "center",
  padding: "3rem 1rem",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "12px",
  border: "1px dashed rgba(255,255,255,0.06)",
};

function agentCard(selected: boolean): React.CSSProperties {
  return {
    background: selected ? "rgba(99,132,255,0.04)" : "rgba(255,255,255,0.03)",
    borderRadius: "12px",
    border: `1px solid ${selected ? "rgba(99,132,255,0.15)" : "rgba(255,255,255,0.06)"}`,
    boxShadow: selected ? "0 4px 20px rgba(99,132,255,0.08)" : "0 2px 8px rgba(0,0,0,0.1)",
    padding: "0.85rem 1rem",
    transition: "all 0.2s ease",
  };
}

function statusOrb(status: string): React.CSSProperties {
  const colors: Record<string, string> = {
    active: "#28a745",
    paused: "#e0b030",
    inactive: "#555",
  };
  const color = colors[status] ?? "#555";
  return {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: color,
    boxShadow: status === "active" ? `0 0 6px ${color}60` : "none",
    flexShrink: 0,
  };
}

const hintText: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#555",
  fontStyle: "italic",
};

function toggleBtn(currentStatus: "active" | "paused"): React.CSSProperties {
  const isActive = currentStatus === "active";
  return {
    padding: "0.25rem 0.65rem",
    borderRadius: "6px",
    border: `1px solid ${isActive ? "rgba(255,200,50,0.2)" : "rgba(40,167,69,0.2)"}`,
    background: isActive ? "rgba(255,200,50,0.08)" : "rgba(40,167,69,0.08)",
    color: isActive ? "#e0b030" : "#28a745",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    transition: "all 0.15s ease",
  };
}

const statsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "0.75rem",
  marginTop: "0.65rem",
  padding: "0.5rem 0.6rem",
  background: "rgba(255,255,255,0.02)",
  borderRadius: "8px",
};

const eventPill: React.CSSProperties = {
  display: "inline-block",
  padding: "0.12rem 0.45rem",
  borderRadius: "4px",
  fontSize: "0.68rem",
  fontWeight: 500,
  background: "rgba(40,167,69,0.1)",
  color: "#28a745",
  fontFamily: "monospace",
};

const logsSection: React.CSSProperties = {
  marginTop: "0.6rem",
  paddingTop: "0.6rem",
  borderTop: "1px solid rgba(255,255,255,0.04)",
};

const logRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 2fr",
  gap: "0.5rem",
  alignItems: "center",
  padding: "0.35rem 0.5rem",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.02)",
};

const logEvent: React.CSSProperties = {
  fontSize: "0.75rem",
  fontFamily: "monospace",
  color: "#a0a0b8",
};

const logMeta: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#555",
};
