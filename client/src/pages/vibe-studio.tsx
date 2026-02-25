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
import GraphEditor from "../components/GraphEditor";

interface Props {
  tenantSlug: string;
}

type View = "home" | "new-app" | "generate" | "draft" | "variants";

export default function VibeStudio({ tenantSlug }: Props) {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("home");
  const [prompt, setPrompt] = useState("");
  const [parsedPreview, setParsedPreview] = useState<any | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [variantPrompt, setVariantPrompt] = useState("");
  const [variantResults, setVariantResults] = useState<any[] | null>(null);
  const [streamOutput, setStreamOutput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [draftViewMode, setDraftViewMode] = useState<"visual" | "json">("visual");
  const [refactorSuggestions, setRefactorSuggestions] = useState<any[] | null>(null);

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

  // Generate app (rule-based, Sprint 2)
  const generateAppMutation = useMutation({
    mutationFn: async (appPrompt: string) => {
      const res = await apiRequest("/vibe/generate-app", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ prompt: appPrompt }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["vibeDrafts"] });
      setSelectedDraftId(result.draftId);
      setView("draft");
      setPrompt("");
      setParsedPreview(null);
    },
  });

  // Refactor analysis (Sprint 6)
  const analyzeMutation = useMutation({
    mutationFn: async (pkgJson: unknown) => {
      const res = await apiRequest("/graph/analyze", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ packageJson: pkgJson }),
      });
      return res.json();
    },
    onSuccess: (result) => {
      setRefactorSuggestions(result.suggestions ?? []);
    },
  });

  // Preview parsed intent
  async function previewPrompt(text: string) {
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }
    try {
      const res = await apiRequest("/vibe/parse-prompt", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      setParsedPreview(data);
    } catch {
      setParsedPreview(null);
    }
  }

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
    <div>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>Build</h1>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => { setView("home"); setSelectedDraftId(null); }}
          style={tabStyle(view === "home")}
        >
          Drafts
        </button>
        <button
          onClick={() => { setView("new-app"); setParsedPreview(null); }}
          style={tabStyle(view === "new-app")}
        >
          New App (AI)
        </button>
        <button
          onClick={() => setView("generate")}
          style={tabStyle(view === "generate")}
        >
          LLM Generate
        </button>
        <button
          onClick={() => setView("variants")}
          style={tabStyle(view === "variants")}
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

      {/* New App (AI) — Rule-based generation */}
      {view === "new-app" && (
        <section>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Create App from Description
          </h2>
          <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Describe what you want to build. The system will detect entities, workflows, events, and roles automatically.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
              }}
              onBlur={() => previewPrompt(prompt)}
              rows={4}
              placeholder='e.g. "Build an employee onboarding workflow with approval and laptop provisioning"'
              style={{ width: "100%", padding: "0.75rem", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #ddd", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <button
              onClick={() => previewPrompt(prompt)}
              disabled={!prompt.trim()}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Preview
            </button>
            <button
              onClick={() => generateAppMutation.mutate(prompt)}
              disabled={generateAppMutation.isPending || !prompt.trim()}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "#6384ff", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
            >
              {generateAppMutation.isPending ? "Creating..." : "Create App"}
            </button>
          </div>

          {generateAppMutation.isError && (
            <p style={{ color: "red", fontSize: "0.85rem" }}>
              Error: {(generateAppMutation.error as Error).message}
            </p>
          )}

          {/* Parsed intent preview */}
          {parsedPreview && (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem", background: "#fff" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>
                {parsedPreview.appName}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", color: "#888", textTransform: "uppercase" }}>
                    Entities ({parsedPreview.entities?.length ?? 0})
                  </h4>
                  {(parsedPreview.entities ?? []).map((e: any) => (
                    <div key={e.key} style={{ padding: "0.3rem 0", fontSize: "0.85rem" }}>
                      <strong>{e.name}</strong>
                      <span style={{ color: "#888", marginLeft: "0.4rem" }}>
                        ({e.fields?.length ?? 0} fields)
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", color: "#888", textTransform: "uppercase" }}>
                    Workflows ({parsedPreview.workflows?.length ?? 0})
                  </h4>
                  {(parsedPreview.workflows ?? []).map((w: any, i: number) => (
                    <div key={i} style={{ padding: "0.3rem 0", fontSize: "0.85rem" }}>
                      <strong>{w.name}</strong>
                      <span style={{ color: "#888", marginLeft: "0.4rem" }}>
                        ({w.steps?.length ?? 0} steps)
                      </span>
                    </div>
                  ))}
                  {(parsedPreview.workflows ?? []).length === 0 && (
                    <p style={{ fontSize: "0.8rem", color: "#999" }}>None detected</p>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", color: "#888", textTransform: "uppercase" }}>
                    Events ({parsedPreview.events?.length ?? 0})
                  </h4>
                  {(parsedPreview.events ?? []).slice(0, 6).map((ev: string, i: number) => (
                    <div key={i} style={{ fontSize: "0.8rem", color: "#555", padding: "0.15rem 0" }}>
                      <code>{ev}</code>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 style={{ margin: "0 0 0.4rem", fontSize: "0.8rem", color: "#888", textTransform: "uppercase" }}>
                    Roles ({parsedPreview.roles?.length ?? 0})
                  </h4>
                  {(parsedPreview.roles ?? []).map((r: string, i: number) => (
                    <div key={i} style={{ fontSize: "0.8rem", color: "#555", padding: "0.15rem 0" }}>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Generate (LLM) */}
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
                onClick={() => analyzeMutation.mutate(draftDetail.packageJson)}
                disabled={analyzeMutation.isPending || !draftDetail.packageJson}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid #17a2b8", background: "#fff", color: "#17a2b8", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Refactor with AI"}
              </button>
              <button
                onClick={() => installMutation.mutate()}
                disabled={installMutation.isPending || !draftDetail.packageJson}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "none", background: "#28a745", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}
              >
                {installMutation.isPending ? "Installing..." : "Install"}
              </button>
              <button
                onClick={() => {
                  if (confirm("Discard this draft?")) discardMutation.mutate();
                }}
                style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid #dc3545", background: "#fff", color: "#dc3545", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Discard
              </button>
            </div>
          </div>

          <p style={{ color: "#666", marginBottom: "0.75rem" }}>
            Status: {draftDetail.status} &middot; Version: {draftDetail.version ?? 1}
          </p>

          {/* Refactor suggestions */}
          {refactorSuggestions && refactorSuggestions.length > 0 && (
            <div style={{ marginBottom: "1rem", border: "1px solid #bee5eb", borderRadius: "8px", padding: "0.75rem", background: "#d1ecf1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#0c5460" }}>
                  Refactor Suggestions ({refactorSuggestions.length})
                </h3>
                <button onClick={() => setRefactorSuggestions(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#0c5460", fontSize: "0.8rem" }}>Dismiss</button>
              </div>
              {refactorSuggestions.map((s: any, i: number) => (
                <div key={i} style={{ padding: "0.35rem 0", borderBottom: i < refactorSuggestions.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", fontSize: "0.8rem" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "0.1rem 0.3rem",
                    borderRadius: "3px",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    marginRight: "0.4rem",
                    background: s.type === "warning" ? "#fff3cd" : s.type === "missing" ? "#f8d7da" : "#d4edda",
                    color: s.type === "warning" ? "#856404" : s.type === "missing" ? "#721c24" : "#155724",
                    textTransform: "uppercase",
                  }}>
                    {s.type}
                  </span>
                  <span style={{ color: "#0c5460" }}>{s.message}</span>
                  {s.fix && <div style={{ fontSize: "0.75rem", color: "#0c5460", opacity: 0.8, marginTop: "0.15rem", paddingLeft: "1rem" }}>Fix: {s.fix}</div>}
                </div>
              ))}
            </div>
          )}

          {/* View mode toggle */}
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
            <button onClick={() => setDraftViewMode("visual")} style={tabStyle(draftViewMode === "visual")}>Visual Editor</button>
            <button onClick={() => setDraftViewMode("json")} style={tabStyle(draftViewMode === "json")}>JSON</button>
          </div>

          {/* Visual graph editor */}
          {draftViewMode === "visual" && draftDetail.packageJson && (
            <GraphEditor
              packageJson={draftDetail.packageJson}
              onSave={(updated) => updateDraftMutation.mutate({ packageJson: updated })}
              saving={updateDraftMutation.isPending}
            />
          )}

          {/* JSON view */}
          {draftViewMode === "json" && draftDetail.packageJson && (
            <div style={{ marginBottom: "1.5rem" }}>
              <pre style={{ padding: "1rem", background: "#f5f5f5", borderRadius: "8px", overflow: "auto", maxHeight: "400px", fontSize: "0.8rem" }}>
                {JSON.stringify(draftDetail.packageJson, null, 2)}
              </pre>
            </div>
          )}

          {/* Refine */}
          <div style={{ marginBottom: "1.5rem", marginTop: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Refine with AI</h3>
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
                style={{ padding: "0.5rem", flex: 1, borderRadius: "4px", border: "1px solid #ddd" }}
              />
              <button type="submit" disabled={refineMutation.isPending} style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", border: "none", background: "#6384ff", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                {refineMutation.isPending ? "Refining..." : "Refine"}
              </button>
            </form>
          </div>

          {/* Version history */}
          {(versions ?? []).length > 0 && (
            <div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Version History</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb", padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>Version</th>
                    <th style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb", padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>Created</th>
                    <th style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb", padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(versions ?? []).map((v: any) => (
                    <tr key={v.versionNumber}>
                      <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid #f0f0f0", fontSize: "0.85rem" }}>v{v.versionNumber}</td>
                      <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid #f0f0f0", fontSize: "0.85rem", color: "#888" }}>{new Date(v.createdAt).toLocaleString()}</td>
                      <td style={{ padding: "0.4rem 0.5rem", borderBottom: "1px solid #f0f0f0" }}>
                        <button
                          onClick={() => restoreMutation.mutate(v.versionNumber)}
                          disabled={restoreMutation.isPending}
                          style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "0.75rem" }}
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

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.75rem",
    borderRadius: "6px",
    border: "1px solid",
    borderColor: active ? "#6384ff" : "#e5e7eb",
    background: active ? "#6384ff" : "#fff",
    color: active ? "#fff" : "#555",
    fontWeight: active ? 600 : 400,
    fontSize: "0.85rem",
    cursor: "pointer",
  };
}
