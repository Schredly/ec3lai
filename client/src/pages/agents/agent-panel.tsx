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
      const res = await apiRequest(`/agents/${selectedAgentId}/logs`, {
        tenantSlug,
      });
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
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
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

  if (isLoading) return <p style={{ color: "#888" }}>Loading agents...</p>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
          Agents
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            border: "none",
            background: "#6384ff",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {showCreate ? "Cancel" : "Register Agent"}
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
          style={{
            padding: "1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "1rem",
            background: "#fff",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              Name
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Onboarding Bot"
              style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ddd" }}
            />
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              Subscribed Events (comma-separated)
            </label>
            <input
              name="events"
              placeholder="e.g. record.assigned, execution_completed"
              style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #ddd" }}
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              background: "#6384ff",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {/* Agent list */}
      {(agents ?? []).length === 0 ? (
        <p style={{ color: "#888" }}>No agents registered. Create one to get started.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Binding", "Status", "Events", "Last Execution", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.6rem 0.75rem",
                      borderBottom: "2px solid #e5e7eb",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#888",
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {(agents ?? []).map((agent: any) => (
              <tr key={agent.id}>
                <td style={cellStyle}>
                  <span
                    style={{ color: "#6384ff", cursor: "pointer", fontWeight: 600 }}
                    onClick={() =>
                      setSelectedAgentId(
                        selectedAgentId === agent.id ? null : agent.id
                      )
                    }
                  >
                    {agent.name}
                  </span>
                </td>
                <td style={cellStyle}>
                  <AgentBindingBadge agent={agent} />
                </td>
                <td style={cellStyle}>
                  <AgentStatusBadge status={agent.status} />
                </td>
                <td style={{ ...cellStyle, fontSize: "0.8rem", color: "#666" }}>
                  {((agent.subscribedEvents as string[]) ?? []).length} subscriptions
                </td>
                <td style={{ ...cellStyle, fontSize: "0.8rem", color: "#888" }}>
                  {agent.lastExecutionAt
                    ? new Date(agent.lastExecutionAt).toLocaleString()
                    : "Never"}
                  {agent.lastExecutionStatus && (
                    <span style={{ marginLeft: "0.4rem" }}>
                      ({agent.lastExecutionStatus})
                    </span>
                  )}
                </td>
                <td style={cellStyle}>
                  {agent.status === "active" ? (
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: agent.id, status: "paused" })
                      }
                      style={actionBtnStyle}
                    >
                      Pause
                    </button>
                  ) : !agent.boundPackageInstallId ? (
                    <span style={{ fontSize: "0.75rem", color: "#999", fontStyle: "italic" }}>
                      Promote to activate
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: agent.id, status: "active" })
                      }
                      style={actionBtnStyle}
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Execution logs for selected agent */}
      {selectedAgentId && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Execution Logs
          </h2>
          {(logs ?? []).length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.85rem" }}>No executions yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Event", "Status", "Duration", "Time"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "0.5rem",
                        borderBottom: "2px solid #e5e7eb",
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        color: "#888",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).slice(0, 20).map((log: any) => (
                  <tr key={log.id}>
                    <td style={logCellStyle}>{log.eventType}</td>
                    <td style={logCellStyle}>
                      <AgentStatusBadge status={log.status} />
                    </td>
                    <td style={logCellStyle}>{log.durationMs ?? "—"}ms</td>
                    <td style={logCellStyle}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "0.85rem",
};

const logCellStyle: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "0.8rem",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  borderRadius: "4px",
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.8rem",
};

function AgentBindingBadge({ agent }: { agent: any }) {
  const isBound = !!agent.boundPackageInstallId;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.7rem",
        fontWeight: 600,
        background: isBound ? "#cce5ff" : "#f8f9fa",
        color: isBound ? "#004085" : "#999",
        border: isBound ? "none" : "1px dashed #ccc",
      }}
    >
      {isBound ? `Installed (v${agent.version})` : "Draft"}
    </span>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    inactive: { bg: "#f0f0f0", fg: "#666" },
    active: { bg: "#d4edda", fg: "#155724" },
    paused: { bg: "#fff3cd", fg: "#856404" },
    completed: { bg: "#d4edda", fg: "#155724" },
    failed: { bg: "#f8d7da", fg: "#721c24" },
  };
  const c = colors[status] ?? colors.inactive;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.7rem",
        fontWeight: 600,
        background: c.bg,
        color: c.fg,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}
