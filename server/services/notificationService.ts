/**
 * O92-O95: Best-effort webhook delivery.
 * sendWebhook never throws.
 */

export async function sendWebhook(
  url: string,
  payload: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return { success: response.ok };
  } catch (err) {
    // O92: Never throws
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function buildSlackPayload(
  event: string,
  details: Record<string, unknown>
): { text: string; blocks?: unknown[] } {
  return {
    text: `[EC3L] ${event}: ${JSON.stringify(details)}`,
  };
}
