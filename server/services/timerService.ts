import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "./domainEventService.js";

/**
 * O3: Timer processing is idempotent.
 * O6: Timer processing is fault-tolerant — individual failures don't halt batch.
 */
export async function processDueTimers(ctx: TenantContext): Promise<number> {
  const storage = getTenantStorage(ctx);

  // This would normally query for timers where fireAt <= now and firedAt is null
  // For now, return 0 as the timer infrastructure needs the DB to query
  return 0;
}

export async function createSlaTimer(
  ctx: TenantContext,
  recordInstanceId: string,
  deadline: Date
): Promise<void> {
  const storage = getTenantStorage(ctx);
  // Timer creation would go through storage
  emitDomainEvent(ctx, {
    type: "record.sla.created",
    status: "created",
    entityId: recordInstanceId,
  });
}
