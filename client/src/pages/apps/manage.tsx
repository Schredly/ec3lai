import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  getEnvironments,
  createEnvironment,
  getPromotionIntents,
  createPromotionIntent,
  transitionIntent,
} from "../../lib/api/promotion";
import { Link } from "wouter";
import { useState } from "react";

interface Props {
  tenantSlug: string;
}

export default function ManageApps({ tenantSlug }: Props) {
  const qc = useQueryClient();
  const [showInstall, setShowInstall] = useState(false);
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [showPromoteForm, setShowPromoteForm] = useState(false);

  // Installed packages
  const { data: recordTypes, isLoading: rtLoading } = useQuery({
    queryKey: ["recordTypes", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/record-types", { tenantSlug });
      return res.json();
    },
  });

  // Available packages (templates)
  const { data: available } = useQuery({
    queryKey: ["packages", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/packages/available");
      return res.json();
    },
  });

  // Environments
  const { data: environments } = useQuery({
    queryKey: ["environments", tenantSlug],
    queryFn: () => getEnvironments(tenantSlug),
  });

  // Promotion intents
  const { data: intents } = useQuery({
    queryKey: ["promotionIntents", tenantSlug],
    queryFn: () => getPromotionIntents(tenantSlug),
  });

  // Install a built-in package
  const installMutation = useMutation({
    mutationFn: async (packageKey: string) => {
      const res = await apiRequest("/packages/install", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ packageKey }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recordTypes"] });
      setShowInstall(false);
    },
  });

  // Create environment
  const envMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string }) =>
      createEnvironment(tenantSlug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["environments"] });
      setShowEnvForm(false);
    },
  });

  // Create promotion intent
  const promoteMutation = useMutation({
    mutationFn: async (data: {
      sourceEnvironmentId: string;
      targetEnvironmentId: string;
    }) => createPromotionIntent(tenantSlug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotionIntents"] });
      setShowPromoteForm(false);
    },
  });

  // Transition intent
  const transitionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      transitionIntent(tenantSlug, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["promotionIntents"] });
    },
  });

  if (rtLoading) return <div style={{ padding: "2rem" }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <nav style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <Link href={`/t/${tenantSlug}/apps`}>Apps</Link>
        <Link href={`/t/${tenantSlug}/vibe`}>Build</Link>
        <Link href={`/t/${tenantSlug}/manage`}>
          <strong>Manage</strong>
        </Link>
      </nav>

      {/* Installed Apps */}
      <h1>Manage Apps</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Installed Record Types</h2>
        {(recordTypes ?? []).length === 0 ? (
          <p style={{ color: "#666" }}>No record types installed yet.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                    padding: "0.5rem",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                    padding: "0.5rem",
                  }}
                >
                  Key
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                    padding: "0.5rem",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #ddd",
                    padding: "0.5rem",
                  }}
                >
                  Fields
                </th>
              </tr>
            </thead>
            <tbody>
              {(recordTypes ?? []).map((rt: any) => (
                <tr key={rt.id}>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {rt.name}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <code>{rt.key}</code>
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {rt.status}
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {((rt.schema as any)?.fields ?? []).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Install Packages */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Install Packages</h2>
        <button onClick={() => setShowInstall(!showInstall)}>
          {showInstall ? "Cancel" : "Show Available Packages"}
        </button>

        {showInstall && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            {(available ?? []).map((pkg: any) => (
              <div
                key={pkg.key}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <h3 style={{ margin: "0 0 0.25rem" }}>{pkg.name}</h3>
                <p
                  style={{ margin: "0 0 0.5rem", color: "#666", fontSize: "0.875rem" }}
                >
                  {pkg.description}
                </p>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#999" }}>
                  v{pkg.version} &middot; {pkg.recordTypes?.length ?? 0} record types
                </p>
                <button
                  onClick={() => installMutation.mutate(pkg.key)}
                  disabled={installMutation.isPending}
                >
                  {installMutation.isPending ? "Installing..." : "Install"}
                </button>
              </div>
            ))}
            {(available ?? []).length === 0 && (
              <p style={{ color: "#666" }}>No packages available.</p>
            )}
          </div>
        )}
      </section>

      {/* Environments */}
      <section style={{ marginBottom: "2rem" }}>
        <h2>Environments</h2>
        <button onClick={() => setShowEnvForm(!showEnvForm)}>
          {showEnvForm ? "Cancel" : "New Environment"}
        </button>

        {showEnvForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              envMutation.mutate({
                name: fd.get("name") as string,
                slug: fd.get("slug") as string,
              });
            }}
            style={{
              margin: "1rem 0",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontWeight: "bold" }}>Name</label>
              <input name="name" required style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontWeight: "bold" }}>Slug</label>
              <input name="slug" required style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={envMutation.isPending}>
              {envMutation.isPending ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {(environments ?? []).length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                  Name
                </th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                  Slug
                </th>
              </tr>
            </thead>
            <tbody>
              {(environments ?? []).map((env: any) => (
                <tr key={env.id}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {env.name}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    <code>{env.slug}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Promotion Intents */}
      <section>
        <h2>Promotion Intents</h2>
        <button onClick={() => setShowPromoteForm(!showPromoteForm)}>
          {showPromoteForm ? "Cancel" : "New Promotion"}
        </button>

        {showPromoteForm && (environments ?? []).length >= 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              promoteMutation.mutate({
                sourceEnvironmentId: fd.get("source") as string,
                targetEnvironmentId: fd.get("target") as string,
              });
            }}
            style={{
              margin: "1rem 0",
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontWeight: "bold" }}>Source Environment</label>
              <select name="source" required style={{ width: "100%", padding: "0.5rem" }}>
                {(environments ?? []).map((env: any) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontWeight: "bold" }}>Target Environment</label>
              <select name="target" required style={{ width: "100%", padding: "0.5rem" }}>
                {(environments ?? []).map((env: any) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={promoteMutation.isPending}>
              {promoteMutation.isPending ? "Creating..." : "Create Intent"}
            </button>
          </form>
        )}

        {showPromoteForm && (environments ?? []).length < 2 && (
          <p style={{ color: "#666", marginTop: "0.5rem" }}>
            Create at least 2 environments to set up promotions.
          </p>
        )}

        {(intents ?? []).length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                  ID
                </th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                  Status
                </th>
                <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {(intents ?? []).map((intent: any) => (
                <tr key={intent.id}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {intent.id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {intent.status}
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    {intent.status === "draft" && (
                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            id: intent.id,
                            status: "previewed",
                          })
                        }
                      >
                        Preview
                      </button>
                    )}
                    {intent.status === "previewed" && (
                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            id: intent.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                    )}
                    {intent.status === "approved" && (
                      <button
                        onClick={() =>
                          transitionMutation.mutate({
                            id: intent.id,
                            status: "executed",
                          })
                        }
                      >
                        Execute
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
