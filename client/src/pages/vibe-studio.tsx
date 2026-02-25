import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generatePackage,
  getDrafts,
  getDraft,
  createDraft,
  updateDraft,
  discardDraft,
  getDraftVersions,
  restoreVersion,
  getTemplates,
  generateVariants,
} from "../lib/api/vibe";
import { apiRequest } from "../lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";

interface Props {
  tenantSlug: string;
}

type View = "home" | "generate" | "draft" | "variants";

export default function VibeStudio({ tenantSlug }: Props) {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("home");
  const [prompt, setPrompt] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [variantPrompt, setVariantPrompt] = useState("");
  const [variantResults, setVariantResults] = useState<any[] | null>(null);
  const [streamOutput, setStreamOutput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Drafts
  const { data: drafts } = useQuery({
    queryKey: ["vibeDrafts", tenantSlug],
    queryFn: () => getDrafts(tenantSlug),
  });

  // Templates
  const { data: templates } = useQuery({
    queryKey: ["vibeTemplates"],
    queryFn: () => getTemplates(),
  });

  // Selected draft detail
  const { data: draftDetail } = useQuery({
    queryKey: ["vibeDraft", tenantSlug, selectedDraftId],
    queryFn: () => getDraft(tenantSlug, selectedDraftId!),
    enabled: !!selectedDraftId,
  });

  // Draft versions
  const { data: versions } = useQuery({
    queryKey: ["vibeDraftVersions", tenantSlug, selectedDraftId],
    queryFn: () => getDraftVersions(tenantSlug, selectedDraftId!),
    enabled: !!selectedDraftId,
  });

  // Generate
  const generateMutation = useMutation({
    mutationFn: () => generatePackage(tenantSlug, prompt, selectedTemplate || undefined),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["vibeDrafts"] });
      setPrompt("");
      setView("home");
    },
  });

  // Create draft
  const createDraftMutation = useMutation({
    mutationFn: (data: { name: string; prompt?: string }) =>
      createDraft(tenantSlug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibeDrafts"] });
    },
  });

  // Update draft
  const updateDraftMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      updateDraft(tenantSlug, selectedDraftId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibeDraft", tenantSlug, selectedDraftId] });
      qc.invalidateQueries({ queryKey: ["vibeDraftVersions", tenantSlug, selectedDraftId] });
    },
  });

  // Discard draft
  const discardMutation = useMutation({
    mutationFn: () => discardDraft(tenantSlug, selectedDraftId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibeDrafts"] });
      setSelectedDraftId(null);
      setView("home");
    },
  });

  // Restore version
  const restoreMutation = useMutation({
    mutationFn: (versionNumber: number) =>
      restoreVersion(tenantSlug, selectedDraftId!, versionNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibeDraft", tenantSlug, selectedDraftId] });
      qc.invalidateQueries({ queryKey: ["vibeDraftVersions", tenantSlug, selectedDraftId] });
    },
  });

  // Install draft
  const installMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/vibe/install", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ packageJson: draftDetail?.packageJson }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recordTypes"] });
      setView("home");
    },
  });

  // Refine
  const refineMutation = useMutation({
    mutationFn: async (refinePrompt: string) => {
      const res = await apiRequest("/vibe/refine", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({
          existingPackage: draftDetail?.packageJson,
          prompt: refinePrompt,
        }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (selectedDraftId) {
        updateDraftMutation.mutate({ packageJson: result.packageJson });
      }
    },
  });

  // Variants
  const variantMutation = useMutation({
    mutationFn: () => generateVariants(tenantSlug, variantPrompt, 3),
    onSuccess: (result) => {
      setVariantResults(result.variants ?? result);
    },
  });

  // Stream generation
  async function startStream() {
    setIsStreaming(true);
    setStreamOutput("");
    try {
      const res = await fetch(`/api/vibe/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": tenantSlug,
        },
        body: JSON.stringify({ prompt }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        setStreamOutput(buffer);
      }
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <nav style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
        <Link href={`/t/${tenantSlug}/apps`}>Apps</Link>
        <Link href={`/t/${tenantSlug}/vibe`}>
          <strong>Build</strong>
        </Link>
        <Link href={`/t/${tenantSlug}/manage`}>Manage</Link>
      </nav>

      <h1>Vibe Studio</h1>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => { setView("home"); setSelectedDraftId(null); }}
          style={{ fontWeight: view === "home" ? "bold" : "normal" }}
        >
          Drafts
        </button>
        <button
          onClick={() => setView("generate")}
          style={{ fontWeight: view === "generate" ? "bold" : "normal" }}
        >
          Generate
        </button>
        <button
          onClick={() => setView("variants")}
          style={{ fontWeight: view === "variants" ? "bold" : "normal" }}
        >
          Variants
        </button>
      </div>

      {/* Home: Drafts list */}
      {view === "home" && (
        <section>
          <h2>Your Drafts</h2>
          {(drafts ?? []).length === 0 ? (
            <p style={{ color: "#666" }}>
              No drafts yet. Use <strong>Generate</strong> to create an app with AI.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: "1rem",
              }}
            >
              {(drafts ?? []).map((d: any) => (
                <div
                  key={d.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "1rem",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedDraftId(d.id);
                    setView("draft");
                  }}
                >
                  <h3 style={{ margin: "0 0 0.25rem" }}>{d.name}</h3>
                  <p style={{ margin: 0, color: "#666", fontSize: "0.875rem" }}>
                    {d.status} &middot; v{d.version ?? 1}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick create draft */}
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Create Empty Draft</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                createDraftMutation.mutate({ name: fd.get("name") as string });
                e.currentTarget.reset();
              }}
              style={{ display: "flex", gap: "0.5rem" }}
            >
              <input
                name="name"
                placeholder="Draft name"
                required
                style={{ padding: "0.5rem", flex: 1 }}
              />
              <button type="submit" disabled={createDraftMutation.isPending}>
                Create
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Generate */}
      {view === "generate" && (
        <section>
          <h2>Generate App with AI</h2>

          {/* Template selector */}
          {(templates ?? []).length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.25rem" }}>
                Start from template (optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{ width: "100%", padding: "0.5rem" }}
              >
                <option value="">No template — generate from scratch</option>
                {(templates ?? []).map((t: any) => (
                  <option key={t.key} value={t.key}>
                    {t.name} — {t.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.25rem" }}>
              Describe your app
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="e.g. A PTO request tracker with employee name, start date, end date, and manager approval workflow"
              style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !prompt.trim()}
            >
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </button>
            <button
              onClick={startStream}
              disabled={isStreaming || !prompt.trim()}
            >
              {isStreaming ? "Streaming..." : "Stream Generate"}
            </button>
          </div>

          {generateMutation.isError && (
            <p style={{ color: "red", marginTop: "0.5rem" }}>
              Error: {(generateMutation.error as Error).message}
            </p>
          )}

          {streamOutput && (
            <pre
              style={{
                marginTop: "1rem",
                padding: "1rem",
                background: "#f5f5f5",
                borderRadius: "8px",
                overflow: "auto",
                maxHeight: "400px",
                fontSize: "0.8rem",
              }}
            >
              {streamOutput}
            </pre>
          )}
        </section>
      )}

      {/* Draft detail */}
      {view === "draft" && draftDetail && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{draftDetail.name}</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => installMutation.mutate()}
                disabled={installMutation.isPending || !draftDetail.packageJson}
              >
                {installMutation.isPending ? "Installing..." : "Install"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Discard this draft?")) discardMutation.mutate();
                }}
                style={{ color: "red" }}
              >
                Discard
              </button>
            </div>
          </div>

          <p style={{ color: "#666" }}>
            Status: {draftDetail.status} &middot; Version: {draftDetail.version ?? 1}
          </p>

          {/* Refine */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3>Refine with AI</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                refineMutation.mutate(fd.get("refinePrompt") as string);
                e.currentTarget.reset();
              }}
              style={{ display: "flex", gap: "0.5rem" }}
            >
              <input
                name="refinePrompt"
                placeholder="e.g. Add a priority field to tickets"
                required
                style={{ padding: "0.5rem", flex: 1 }}
              />
              <button type="submit" disabled={refineMutation.isPending}>
                {refineMutation.isPending ? "Refining..." : "Refine"}
              </button>
            </form>
          </div>

          {/* Package preview */}
          {draftDetail.packageJson && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3>Package Preview</h3>
              <pre
                style={{
                  padding: "1rem",
                  background: "#f5f5f5",
                  borderRadius: "8px",
                  overflow: "auto",
                  maxHeight: "400px",
                  fontSize: "0.8rem",
                }}
              >
                {JSON.stringify(draftDetail.packageJson, null, 2)}
              </pre>
            </div>
          )}

          {/* Version history */}
          {(versions ?? []).length > 0 && (
            <div>
              <h3>Version History</h3>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                      Version
                    </th>
                    <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                      Created
                    </th>
                    <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(versions ?? []).map((v: any) => (
                    <tr key={v.versionNumber}>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                        v{v.versionNumber}
                      </td>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                        {v.createdAt}
                      </td>
                      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                        <button
                          onClick={() => restoreMutation.mutate(v.versionNumber)}
                          disabled={restoreMutation.isPending}
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Variants */}
      {view === "variants" && (
        <section>
          <h2>Generate Variants</h2>
          <p style={{ color: "#666" }}>
            Generate multiple app variations from a single prompt and compare them side-by-side.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <textarea
              value={variantPrompt}
              onChange={(e) => setVariantPrompt(e.target.value)}
              rows={4}
              placeholder="Describe your app..."
              style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={() => variantMutation.mutate()}
            disabled={variantMutation.isPending || !variantPrompt.trim()}
          >
            {variantMutation.isPending ? "Generating variants..." : "Generate 3 Variants"}
          </button>

          {variantResults && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              {variantResults.map((variant: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "1rem",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.5rem" }}>
                    Variant {idx + 1}: {variant.name ?? `Option ${idx + 1}`}
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "#999", margin: "0 0 0.5rem" }}>
                    {variant.recordTypes?.length ?? 0} record types &middot;{" "}
                    {variant.workflows?.length ?? 0} workflows
                  </p>
                  <pre
                    style={{
                      padding: "0.5rem",
                      background: "#f5f5f5",
                      borderRadius: "4px",
                      overflow: "auto",
                      maxHeight: "200px",
                      fontSize: "0.7rem",
                    }}
                  >
                    {JSON.stringify(variant, null, 2)}
                  </pre>
                  <button
                    style={{ marginTop: "0.5rem" }}
                    onClick={() => {
                      createDraftMutation.mutate({
                        name: variant.name ?? `Variant ${idx + 1}`,
                        prompt: variantPrompt,
                      });
                    }}
                  >
                    Save as Draft
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
