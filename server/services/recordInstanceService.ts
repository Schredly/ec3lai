import type { TenantContext, RecordInstance } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "./domainEventService.js";
import { ServiceError } from "./recordTypeService.js";

export async function createRecordInstance(
  ctx: TenantContext,
  data: {
    recordTypeId: string;
    data?: Record<string, unknown>;
    status?: string;
    assignedTo?: string;
  }
): Promise<RecordInstance> {
  const storage = getTenantStorage(ctx);

  // Validate record type exists
  const rt = await storage.getRecordTypeById(data.recordTypeId);
  if (!rt) {
    throw new ServiceError("Record type not found", 404);
  }

  const instance = await storage.createRecordInstance({
    recordTypeId: data.recordTypeId,
    data: data.data ?? {},
    status: data.status ?? "open",
    assignedTo: data.assignedTo ?? null,
    slaDeadline: null,
    createdBy: ctx.userId ?? ctx.agentId ?? null,
  });

  emitDomainEvent(ctx, {
    type: "execution_completed",
    status: "created",
    entityId: instance.id,
  });

  if (instance.assignedTo) {
    emitDomainEvent(ctx, {
      type: "record.assigned",
      status: "assigned",
      entityId: instance.id,
    });
  }

  return instance;
}

export async function getRecordInstances(
  ctx: TenantContext,
  recordTypeId: string
): Promise<RecordInstance[]> {
  const storage = getTenantStorage(ctx);
  return storage.getRecordInstances(recordTypeId);
}

export async function getRecordInstanceById(
  ctx: TenantContext,
  id: string
): Promise<RecordInstance | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getRecordInstanceById(id);
}

export async function updateRecordInstance(
  ctx: TenantContext,
  id: string,
  data: Partial<Pick<RecordInstance, "data" | "status" | "assignedTo">>
): Promise<RecordInstance> {
  const storage = getTenantStorage(ctx);

  const existing = await storage.getRecordInstanceById(id);
  if (!existing) {
    throw new ServiceError("Record instance not found", 404);
  }

  const updated = await storage.updateRecordInstance(id, data);
  if (!updated) {
    throw new ServiceError("Record instance not found", 404);
  }

  emitDomainEvent(ctx, {
    type: "execution_completed",
    status: "updated",
    entityId: id,
  });

  return updated;
}
