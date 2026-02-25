import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface Props {
  tenantSlug: string;
}

export default function Dashboard({ tenantSlug }: Props) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboardStats", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/dashboard/stats", { tenantSlug });
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <p style={{ color: "#888" }}>Loading dashboard...</p>;
  if (!stats) return <p style={{ color: "#888" }}>No data available.</p>;

  return (
    <div>
      <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem", fontWeight: 700 }}>
        Operations Dashboard
      </h1>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <KpiCard label="Active Agents" value={stats.agents.active} subtitle={`${stats.agents.total} total`} color="#155724" bg="#d4edda" />
        <KpiCard label="Events (24h)" value={stats.events.total24h} subtitle="domain events" color="#004085" bg="#cce5ff" />
        <KpiCard label="Failed Executions" value={stats.executions.failed} subtitle={`${stats.executions.completed} succeeded`} color="#721c24" bg="#f8d7da" />
        <KpiCard
          label="Avg Exec Duration"
          value={stats.executions.avgDurationMs != null ? `${stats.executions.avgDurationMs}ms` : "—"}
          subtitle="agent executions"
          color="#856404"
          bg="#fff3cd"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Agent overview */}
        <Section title="Agents">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <MiniStat label="Active" value={stats.agents.active} />
            <MiniStat label="Paused" value={stats.agents.paused} />
            <MiniStat label="Inactive" value={stats.agents.inactive} />
            <MiniStat label="Installed" value={stats.agents.installed} />
            <MiniStat label="Draft" value={stats.agents.draft} />
            <MiniStat label="Total" value={stats.agents.total} />
          </div>
        </Section>

        {/* Workflow stats */}
        <Section title="Workflows">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
            <MiniStat label="Completed (24h)" value={stats.workflows.total} />
            <MiniStat
              label="Avg Duration"
              value={stats.workflows.avgDurationMs != null ? `${stats.workflows.avgDurationMs}ms` : "—"}
            />
          </div>
        </Section>

        {/* Event breakdown */}
        <Section title="Event Types (24h)">
          {Object.keys(stats.events.byType).length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#999" }}>No events in the last 24 hours.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Event Type", "Count"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.events.byType as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([type, count]) => (
                    <tr key={type}>
                      <td style={tdStyle}>{type}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Promotions */}
        <Section title="Promotions">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            <MiniStat label="Draft" value={stats.promotions.draft} />
            <MiniStat label="Approved" value={stats.promotions.approved} />
            <MiniStat label="Executed" value={stats.promotions.executed} />
          </div>
          {stats.promotions.timeline.length > 0 && (
            <div>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#888", marginBottom: "0.5rem", fontWeight: 600 }}>
                Recent Activity
              </div>
              {stats.promotions.timeline.map((p: any) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.4rem 0",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "0.8rem",
                  }}
                >
                  <div>
                    <PromotionBadge status={p.status} />
                    <span style={{ marginLeft: "0.5rem", color: "#666" }}>
                      {p.id.slice(0, 8)}...
                    </span>
                  </div>
                  <span style={{ color: "#999", fontSize: "0.75rem" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Execution stats */}
      <div style={{ marginTop: "1.5rem" }}>
        <Section title="Agent Executions (24h)">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            <MiniStat label="Total" value={stats.executions.total} />
            <MiniStat label="Completed" value={stats.executions.completed} />
            <MiniStat label="Failed" value={stats.executions.failed} />
            <MiniStat label="Rejected (Draft)" value={stats.executions.rejected} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  color,
  bg,
}: {
  label: string;
  value: number | string;
  subtitle: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: "8px",
        padding: "1.25rem 1rem",
        border: `1px solid ${bg}`,
      }}
    >
      <div style={{ fontSize: "0.75rem", color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color, margin: "0.25rem 0" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color, opacity: 0.7 }}>{subtitle}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: "#f8f9fb", borderRadius: "6px", padding: "0.6rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a1a2e" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "#888", marginTop: "0.1rem" }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "#333" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function PromotionBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: "#f0f0f0", fg: "#666" },
    previewed: { bg: "#fff3cd", fg: "#856404" },
    approved: { bg: "#d4edda", fg: "#155724" },
    executed: { bg: "#cce5ff", fg: "#004085" },
    rejected: { bg: "#f8d7da", fg: "#721c24" },
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
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.4rem 0.5rem",
  borderBottom: "2px solid #e5e7eb",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  color: "#888",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "0.8rem",
  color: "#555",
};
