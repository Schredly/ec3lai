import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useState } from "react";

interface Props {
  tenantSlug: string;
  activeTab: string;
}

export default function RightContextPanel({ tenantSlug, activeTab }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div style={collapsedStyle}>
        <button onClick={() => setCollapsed(false)} style={expandBtn}>‹</button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", fontWeight: 600 }}>
          Context
        </span>
        <button onClick={() => setCollapsed(true)} style={expandBtn}>›</button>
      </div>

      {activeTab === "builder" && <BuilderContext tenantSlug={tenantSlug} />}
      {activeTab === "graph" && <GraphContext tenantSlug={tenantSlug} />}
      {activeTab === "agents" && <AgentContext tenantSlug={tenantSlug} />}
      {activeTab === "versions" && <VersionContext tenantSlug={tenantSlug} />}
      {activeTab === "dashboard" && <DashboardContext tenantSlug={tenantSlug} />}
      {activeTab === "apps" && <GraphContext tenantSlug={tenantSlug} />}
    </div>
  );
}

function BuilderContext({ tenantSlug }: { tenantSlug: string }) {
  const { data: drafts } = useQuery({
    queryKey: ["vibeDrafts", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/vibe/drafts", { tenantSlug });
      return res.json();
    },
  });

  const draftList = drafts ?? [];

  return (
    <div style={sectionPad}>
      <SectionHeader title="Draft Metadata" />
      <StatRow label="Total Drafts" value={draftList.length} />
      <StatRow label="Active" value={draftList.filter((d: any) => d.status === "draft").length} />

      <SectionHeader title="Domain Events" />
      <p style={hintText}>Events emitted on draft save:</p>
      <EventTag name="vibe.draft_patched" />
      <EventTag name="vibe.draft_version_created" />

      <SectionHeader title="Promotion Warnings" />
      <p style={hintText}>Draft changes must be installed before promotion.</p>
    </div>
  );
}

function GraphContext({ tenantSlug }: { tenantSlug: string }) {
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

  const rts = recordTypes ?? [];
  const envs = environments ?? [];

  return (
    <div style={sectionPad}>
      <SectionHeader title="Graph Summary" />
      <div style={statsGrid}>
        <MiniStat label="Record Types" value={rts.length} />
        <MiniStat label="Active" value={rts.filter((r: any) => r.status === "active").length} />
        <MiniStat label="Draft" value={rts.filter((r: any) => r.status === "draft").length} />
        <MiniStat label="Environments" value={envs.length} />
      </div>
    </div>
  );
}

function AgentContext({ tenantSlug }: { tenantSlug: string }) {
  const { data: agents } = useQuery({
    queryKey: ["agents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/agents", { tenantSlug });
      return res.json();
    },
  });

  const list = agents ?? [];
  const active = list.filter((a: any) => a.status === "active");

  return (
    <div style={sectionPad}>
      <SectionHeader title="Agent Status" />
      <div style={statsGrid}>
        <MiniStat label="Total" value={list.length} />
        <MiniStat label="Active" value={active.length} />
        <MiniStat label="Paused" value={list.filter((a: any) => a.status === "paused").length} />
        <MiniStat label="Draft" value={list.filter((a: any) => !a.boundPackageInstallId).length} />
      </div>

      {active.length > 0 && (
        <>
          <SectionHeader title="Active Subscriptions" />
          {active.slice(0, 3).map((a: any) => (
            <div key={a.id} style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#c0c0d0", fontWeight: 500 }}>{a.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", marginTop: "0.15rem" }}>
                {((a.subscribedEvents as string[]) ?? []).slice(0, 3).map((e: string, i: number) => (
                  <EventTag key={i} name={e} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function VersionContext({ tenantSlug }: { tenantSlug: string }) {
  const { data: intents } = useQuery({
    queryKey: ["promotionIntents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/promotion-intents", { tenantSlug });
      return res.json();
    },
  });

  const proms = intents ?? [];

  return (
    <div style={sectionPad}>
      <SectionHeader title="Promotions" />
      <div style={statsGrid}>
        <MiniStat label="Total" value={proms.length} />
        <MiniStat label="Executed" value={proms.filter((p: any) => p.status === "executed").length} />
      </div>

      {proms.length > 0 && (
        <>
          <SectionHeader title="Recent" />
          {proms.slice(0, 5).map((p: any) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: "0.75rem" }}>
              <StatusBadge status={p.status} />
              <span style={{ color: "#555" }}>{p.id.slice(0, 8)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function DashboardContext({ tenantSlug }: { tenantSlug: string }) {
  return (
    <div style={sectionPad}>
      <SectionHeader title="Quick Actions" />
      <p style={hintText}>Use the dashboard to monitor operational health.</p>
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", fontWeight: 600, margin: "0.75rem 0 0.4rem", paddingBottom: "0.25rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      {title}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "0.5rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e0e0f0" }}>{value}</div>
      <div style={{ fontSize: "0.6rem", color: "#555", marginTop: "0.1rem" }}>{label}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.8rem" }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ color: "#c0c0d0", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function EventTag({ name }: { name: string }) {
  return (
    <span style={{ display: "inline-block", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(99,132,255,0.1)", color: "#6384ff", fontSize: "0.65rem", fontFamily: "monospace", marginBottom: "0.2rem" }}>
      {name}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "#666",
    previewed: "#856404",
    approved: "#155724",
    executed: "#004085",
    rejected: "#721c24",
  };
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: colors[status] ?? "#666", textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  height: "100%",
  background: "#111122",
  overflow: "auto",
};

const collapsedStyle: React.CSSProperties = {
  height: "100%",
  background: "#111122",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "0.5rem",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.75rem",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

const expandBtn: React.CSSProperties = {
  border: "none",
  background: "rgba(255,255,255,0.04)",
  color: "#666",
  cursor: "pointer",
  borderRadius: "4px",
  padding: "0.15rem 0.4rem",
  fontSize: "0.8rem",
};

const sectionPad: React.CSSProperties = {
  padding: "0 0.75rem 0.75rem",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "0.4rem",
  marginBottom: "0.5rem",
};

const hintText: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#555",
  margin: "0.25rem 0",
};
