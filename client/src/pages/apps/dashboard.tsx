import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Link } from "wouter";

interface Props {
  tenantSlug: string;
}

/**
 * App Dashboard — simplified view for builders.
 * Shows all apps with status, last modified, and agent status.
 */
export default function AppDashboard({ tenantSlug }: Props) {
  const { data: recordTypes, isLoading } = useQuery({
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

  if (isLoading) {
    return <p style={{ color: "#888" }}>Loading apps...</p>;
  }

  const rts = recordTypes ?? [];
  const draftList = drafts ?? [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Apps</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#888", fontSize: "0.85rem" }}>
            {rts.length} installed &middot; {draftList.length} drafts
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href={`/t/${tenantSlug}/build`}>
            <button style={btnStyle("#6384ff", "#fff")}>New App (AI)</button>
          </Link>
          <Link href={`/t/${tenantSlug}/manage`}>
            <button style={btnStyle("#e5e7eb", "#333")}>Install Package</button>
          </Link>
        </div>
      </div>

      {rts.length === 0 && draftList.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No apps yet</p>
          <p style={{ fontSize: "0.85rem" }}>
            <Link href={`/t/${tenantSlug}/manage`}>Install a package</Link> or{" "}
            <Link href={`/t/${tenantSlug}/build`}>build one with AI</Link>.
          </p>
        </div>
      )}

      {/* Installed Apps */}
      {rts.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Key", "Status", "Fields", "Last Modified", "Agents"].map(
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
              {rts.map((rt: any) => (
                <tr
                  key={rt.id}
                  style={{ cursor: "pointer" }}
                >
                  <td style={cellStyle}>
                    <Link
                      href={`/t/${tenantSlug}/apps/${rt.key}/records/${rt.key}`}
                      style={{ color: "#6384ff", fontWeight: 600, textDecoration: "none" }}
                    >
                      {rt.name}
                    </Link>
                  </td>
                  <td style={cellStyle}>
                    <code style={{ fontSize: "0.8rem", color: "#666" }}>{rt.key}</code>
                  </td>
                  <td style={cellStyle}>
                    <AppStatusBadge status={rt.status} />
                  </td>
                  <td style={cellStyle}>
                    {((rt.schema as any)?.fields ?? []).length}
                  </td>
                  <td style={{ ...cellStyle, color: "#888", fontSize: "0.8rem" }}>
                    {new Date(rt.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...cellStyle, color: "#999", fontSize: "0.8rem" }}>
                    —
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drafts */}
      {draftList.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Drafts
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {draftList.map((d: any) => (
              <Link key={d.id} href={`/t/${tenantSlug}/build`}>
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "1rem",
                    background: "#fff",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#888" }}>
                    <AppStatusBadge status={d.status} />
                    <span style={{ marginLeft: "0.5rem" }}>
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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

function btnStyle(bg: string, fg: string): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "6px",
    background: bg,
    color: fg,
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
  };
}

function AppStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    draft: { bg: "#fff3cd", fg: "#856404" },
    active: { bg: "#d4edda", fg: "#155724" },
    installed: { bg: "#cce5ff", fg: "#004085" },
    promoted: { bg: "#d1ecf1", fg: "#0c5460" },
    retired: { bg: "#f0f0f0", fg: "#666" },
  };
  const c = colors[status] ?? colors.draft;
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
