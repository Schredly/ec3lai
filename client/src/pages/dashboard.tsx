import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

  if (isLoading) return <p style={{ color: "#555" }}>Loading dashboard...</p>;
  if (!stats) return <p style={{ color: "#555" }}>No data available.</p>;

  // Chart data
  const eventTypeData = Object.entries(stats.events.byType as Record<string, number>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([type, count]) => ({ type: type.split(".").pop() ?? type, count }));

  const agentPieData = [
    { name: "Active", value: stats.agents.active, color: "#28a745" },
    { name: "Paused", value: stats.agents.paused, color: "#e0b030" },
    { name: "Inactive", value: stats.agents.inactive, color: "#555" },
  ].filter((d) => d.value > 0);

  const execPieData = [
    { name: "Completed", value: stats.executions.completed, color: "#28a745" },
    { name: "Failed", value: stats.executions.failed, color: "#ff4444" },
    { name: "Rejected", value: stats.executions.rejected, color: "#e0b030" },
  ].filter((d) => d.value > 0);

  const promotionBarData = [
    { stage: "Draft", count: stats.promotions.draft },
    { stage: "Previewed", count: stats.promotions.previewed },
    { stage: "Approved", count: stats.promotions.approved },
    { stage: "Executed", count: stats.promotions.executed },
    { stage: "Rejected", count: stats.promotions.rejected },
  ];

  return (
    <div>
      <h1 style={{ margin: "0 0 1.25rem", fontSize: "1.3rem", fontWeight: 700, color: "#e0e0f0" }}>
        Operations Dashboard
      </h1>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <KpiCard label="Active Agents" value={stats.agents.active} subtitle={`${stats.agents.total} total`} color="#28a745" />
        <KpiCard label="Events (24h)" value={stats.events.total24h} subtitle="domain events" color="#6384ff" />
        <KpiCard label="Failed Executions" value={stats.executions.failed} subtitle={`${stats.executions.completed} succeeded`} color="#ff4444" />
        <KpiCard
          label="Avg Exec Duration"
          value={stats.executions.avgDurationMs != null ? `${stats.executions.avgDurationMs}ms` : "\u2014"}
          subtitle="agent executions"
          color="#a855f7"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        {/* Event types bar chart */}
        <Section title="Events by Type (24h)">
          {eventTypeData.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "#555" }}>No events in the last 24 hours.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventTypeData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="type" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(99,132,255,0.08)" }}
                />
                <Bar dataKey="count" fill="#6384ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Agent status pie */}
        <Section title="Agent Status">
          {agentPieData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "#555", fontSize: "0.82rem" }}>
              No agents registered
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={agentPieData} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={3} strokeWidth={0}>
                    {agentPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {agentPieData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color }} />
                    <span style={{ fontSize: "0.75rem", color: "#a0a0b8" }}>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Second row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        {/* Promotions pipeline */}
        <Section title="Promotion Pipeline">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={promotionBarData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <XAxis dataKey="stage" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,132,255,0.08)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {promotionBarData.map((_, i) => (
                  <Cell key={i} fill={PROMO_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Execution breakdown pie + stats */}
        <Section title="Executions (24h)">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
            {execPieData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1rem 0", color: "#555", fontSize: "0.82rem" }}>
                No executions recorded
              </div>
            ) : (
              <>
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={execPieData} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={3} strokeWidth={0}>
                      {execPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  {execPieData.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color }} />
                      <span style={{ fontSize: "0.75rem", color: "#a0a0b8" }}>{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={execStatsRow}>
            <MiniStat label="Total" value={stats.executions.total} />
            <MiniStat label="Avg Duration" value={stats.executions.avgDurationMs != null ? `${stats.executions.avgDurationMs}ms` : "\u2014"} />
          </div>
        </Section>
      </div>

      {/* Bottom: Detail grids */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Agents breakdown */}
        <Section title="Agents Breakdown">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem" }}>
            <MiniStat label="Active" value={stats.agents.active} color="#28a745" />
            <MiniStat label="Paused" value={stats.agents.paused} color="#e0b030" />
            <MiniStat label="Inactive" value={stats.agents.inactive} />
            <MiniStat label="Installed" value={stats.agents.installed} color="#6384ff" />
            <MiniStat label="Draft" value={stats.agents.draft} />
            <MiniStat label="Total" value={stats.agents.total} />
          </div>
        </Section>

        {/* Promotion timeline */}
        <Section title="Recent Promotions">
          {stats.promotions.timeline.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "#555" }}>No promotion activity.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.25rem" }}>
              {stats.promotions.timeline.map((p: any) => (
                <div key={p.id} style={timelineRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <PromotionBadge status={p.status} />
                    <span style={{ color: "#a0a0b8", fontSize: "0.78rem", fontFamily: "monospace" }}>
                      {p.id.slice(0, 8)}...
                    </span>
                  </div>
                  <span style={{ color: "#555", fontSize: "0.72rem" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function KpiCard({ label, value, subtitle, color }: { label: string; value: number | string; subtitle: string; color: string }) {
  return (
    <div style={{
      background: `${color}0a`,
      borderRadius: "12px",
      padding: "1rem",
      border: `1px solid ${color}20`,
    }}>
      <div style={{ fontSize: "0.68rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color, margin: "0.2rem 0 0.1rem" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.72rem", color: "#555" }}>{subtitle}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      borderRadius: "8px",
      padding: "0.5rem",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: color ?? "#a0a0b8" }}>{value}</div>
      <div style={{ fontSize: "0.62rem", color: "#555", marginTop: "0.1rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px",
      padding: "1rem",
    }}>
      <h3 style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", fontWeight: 700, color: "#e0e0f0" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function PromotionBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: "rgba(255,255,255,0.06)", fg: "#888" },
    previewed: { bg: "rgba(255,200,50,0.12)", fg: "#e0b030" },
    approved: { bg: "rgba(40,167,69,0.12)", fg: "#28a745" },
    executed: { bg: "rgba(99,132,255,0.12)", fg: "#6384ff" },
    rejected: { bg: "rgba(255,68,68,0.12)", fg: "#ff4444" },
  };
  const c = colors[status] ?? colors.draft;
  return (
    <span style={{
      display: "inline-block",
      padding: "0.1rem 0.4rem",
      borderRadius: "4px",
      fontSize: "0.65rem",
      fontWeight: 600,
      background: c.bg,
      color: c.fg,
      textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}

/* --- Constants & Styles --- */

const PROMO_COLORS = ["#888", "#e0b030", "#28a745", "#6384ff", "#ff4444"];

const tooltipStyle: React.CSSProperties = {
  background: "#1a1a2e",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "0.78rem",
  color: "#e0e0f0",
};

const execStatsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "0.4rem",
  marginTop: "0.6rem",
};

const timelineRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.35rem 0.4rem",
  borderRadius: "6px",
  background: "rgba(255,255,255,0.02)",
};
