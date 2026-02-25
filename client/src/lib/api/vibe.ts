import { apiRequest } from "../queryClient";

export async function generatePackage(
  tenantSlug: string,
  prompt: string,
  templateKey?: string
) {
  const res = await apiRequest("/vibe/generate", {
    method: "POST",
    tenantSlug,
    body: JSON.stringify({ prompt, templateKey }),
  });
  return res.json();
}

export async function getDrafts(tenantSlug: string) {
  const res = await apiRequest("/vibe/drafts", { tenantSlug });
  return res.json();
}

export async function getDraft(tenantSlug: string, id: string) {
  const res = await apiRequest(`/vibe/drafts/${id}`, { tenantSlug });
  return res.json();
}

export async function createDraft(
  tenantSlug: string,
  data: { name: string; prompt?: string; packageJson?: unknown }
) {
  const res = await apiRequest("/vibe/drafts", {
    method: "POST",
    tenantSlug,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateDraft(
  tenantSlug: string,
  id: string,
  data: Record<string, unknown>
) {
  const res = await apiRequest(`/vibe/drafts/${id}`, {
    method: "PATCH",
    tenantSlug,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function discardDraft(tenantSlug: string, id: string) {
  await apiRequest(`/vibe/drafts/${id}`, { method: "DELETE", tenantSlug });
}

export async function getDraftVersions(tenantSlug: string, draftId: string) {
  const res = await apiRequest(`/vibe/drafts/${draftId}/versions`, {
    tenantSlug,
  });
  return res.json();
}

export async function restoreVersion(
  tenantSlug: string,
  draftId: string,
  versionNumber: number
) {
  const res = await apiRequest(`/vibe/drafts/${draftId}/restore`, {
    method: "POST",
    tenantSlug,
    body: JSON.stringify({ versionNumber }),
  });
  return res.json();
}

export async function getTemplates() {
  const res = await fetch("/api/vibe/templates");
  return res.json();
}

export async function generateVariants(
  tenantSlug: string,
  prompt: string,
  count: number = 3
) {
  const res = await apiRequest("/vibe/variants", {
    method: "POST",
    tenantSlug,
    body: JSON.stringify({ prompt, count }),
  });
  return res.json();
}
