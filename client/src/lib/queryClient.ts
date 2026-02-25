import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

/**
 * Make an API request with tenant/user headers injected.
 */
export async function apiRequest(
  path: string,
  options: RequestInit & {
    tenantSlug?: string;
    userId?: string;
  } = {}
): Promise<Response> {
  const { tenantSlug, userId, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  if (tenantSlug) {
    headers["x-tenant-id"] = tenantSlug;
  }
  if (userId) {
    headers["x-user-id"] = userId;
  }

  const res = await fetch(`/api${path}`, { headers, ...rest });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res;
}
