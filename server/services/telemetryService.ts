import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

export async function writeTelemetryEvent(
  ctx: TenantContext,
  data: {
    eventType: string;
    entityType?: string;
    entityId?: string;
    actor?: string;
    payload?: unknown;
  }
): Promise<void> {
  const storage = getTenantStorage(ctx);
  await storage.createTelemetryEvent(data);
}
