import { apiRequest } from "../queryClient";

export async function getEnvironments(tenantSlug: string) {
  const res = await apiRequest("/environments", { tenantSlug });
  return res.json();
}

export async function createEnvironment(
  tenantSlug: string,
  data: { name: string; slug: string }
) {
  const res = await apiRequest("/environments", {
    method: "POST",
    tenantSlug,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getPromotionIntents(tenantSlug: string) {
  const res = await apiRequest("/promotion-intents", { tenantSlug });
  return res.json();
}

export async function createPromotionIntent(
  tenantSlug: string,
  data: { sourceEnvironmentId: string; targetEnvironmentId: string }
) {
  const res = await apiRequest("/promotion-intents", {
    method: "POST",
    tenantSlug,
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function transitionIntent(
  tenantSlug: string,
  id: string,
  status: string
) {
  const res = await apiRequest(`/promotion-intents/${id}/transition`, {
    method: "POST",
    tenantSlug,
    body: JSON.stringify({ status }),
  });
  return res.json();
}
