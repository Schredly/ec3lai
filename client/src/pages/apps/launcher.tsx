import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Link } from "wouter";

interface Props {
  tenantSlug: string;
}

export default function AppLauncher({ tenantSlug }: Props) {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/packages/available");
      return res.json();
    },
  });

  const { data: recordTypes } = useQuery({
    queryKey: ["recordTypes", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/record-types", { tenantSlug });
      return res.json();
    },
  });

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <nav style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <Link href={`/t/${tenantSlug}/apps`}><strong>Apps</strong></Link>
        <Link href={`/t/${tenantSlug}/vibe`}>Build</Link>
        <Link href={`/t/${tenantSlug}/manage`}>Manage</Link>
      </nav>

      <h1>Apps</h1>

      {recordTypes?.length === 0 && (
        <p>
          No apps installed yet.{" "}
          <Link href={`/t/${tenantSlug}/manage`}>Install an app</Link> or{" "}
          <Link href={`/t/${tenantSlug}/vibe`}>build one with AI</Link>.
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
        {(recordTypes ?? []).map((rt: any) => (
          <div
            key={rt.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem" }}>{rt.name}</h3>
            <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>
              {rt.description || rt.key}
            </p>
            <Link
              href={`/t/${tenantSlug}/apps/${rt.key}/records/${rt.key}`}
              style={{ display: "inline-block", marginTop: "0.5rem" }}
            >
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
