import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Link, useRoute } from "wouter";

interface Props {
  tenantSlug: string;
}

export default function Sidebar({ tenantSlug }: Props) {
  const [isApps] = useRoute("/t/:tenantSlug/apps/*?");
  const [isBuild] = useRoute("/t/:tenantSlug/build/*?");
  const [isManage] = useRoute("/t/:tenantSlug/manage/*?");
  const [isDashboard] = useRoute("/t/:tenantSlug/dashboard/*?");
  const [isAgents] = useRoute("/t/:tenantSlug/agents/*?");

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

  const navItems = [
    { label: "Apps", href: `/t/${tenantSlug}/apps`, active: isApps },
    { label: "Build", href: `/t/${tenantSlug}/build`, active: isBuild },
    { label: "Manage", href: `/t/${tenantSlug}/manage`, active: isManage },
    { label: "Agents", href: `/t/${tenantSlug}/agents`, active: isAgents },
    { label: "Dashboard", href: `/t/${tenantSlug}/dashboard`, active: isDashboard },
  ];

  return (
    <>
      {/* Branding */}
      <div style={{ padding: "0 1rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
          EC3L
        </div>
        <div style={{ fontSize: "0.7rem", color: "#8888aa", marginTop: "0.15rem" }}>
          Enterprise Builder
        </div>
      </div>

      {/* Tenant */}
      <div style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#8888aa" }}>
        TENANT
      </div>
      <div style={{ padding: "0 1rem 0.75rem", fontWeight: 600, color: "#fff", fontSize: "0.9rem" }}>
        {tenantSlug}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <div style={{ padding: "0.75rem 1rem 0.25rem", fontSize: "0.7rem", color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Navigation
        </div>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              style={{
                padding: "0.5rem 1rem",
                cursor: "pointer",
                background: item.active ? "rgba(99,132,255,0.15)" : "transparent",
                borderLeft: item.active ? "3px solid #6384ff" : "3px solid transparent",
                color: item.active ? "#fff" : "#c0c0d0",
                fontSize: "0.85rem",
                fontWeight: item.active ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      {/* Apps list */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.5rem" }}>
        <div style={{ padding: "0.5rem 1rem 0.25rem", fontSize: "0.7rem", color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Installed Apps ({(recordTypes ?? []).length})
        </div>
        {(recordTypes ?? []).slice(0, 8).map((rt: any) => (
          <Link key={rt.id} href={`/t/${tenantSlug}/apps/${rt.key}/records/${rt.key}`}>
            <div
              style={{
                padding: "0.35rem 1rem",
                fontSize: "0.8rem",
                color: "#b0b0c8",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {rt.name}
            </div>
          </Link>
        ))}

        {/* Drafts */}
        {(drafts ?? []).length > 0 && (
          <>
            <div style={{ padding: "0.5rem 1rem 0.25rem", fontSize: "0.7rem", color: "#8888aa", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.5rem" }}>
              Drafts ({(drafts ?? []).length})
            </div>
            {(drafts ?? []).slice(0, 5).map((d: any) => (
              <Link key={d.id} href={`/t/${tenantSlug}/build`}>
                <div
                  style={{
                    padding: "0.35rem 1rem",
                    fontSize: "0.8rem",
                    color: "#b0b0c8",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {d.name}
                </div>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}
