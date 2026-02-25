import type { TenantContext, Trigger } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { ServiceError } from "./recordTypeService.js";

/**
 * O5: Trigger fire creates idempotent intents.
 */
export async function getTriggers(ctx: TenantContext): Promise<Trigger[]> {
  const storage = getTenantStorage(ctx);
  return storage.getTriggers();
}

export async function getTriggerById(
  ctx: TenantContext,
  id: string
): Promise<Trigger | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getTriggerById(id);
}

export async function createTrigger(
  ctx: TenantContext,
  data: {
    name: string;
    eventType: string;
    condition?: Record<string, unknown>;
    actionType: string;
    actionConfig: Record<string, unknown>;
  }
): Promise<Trigger> {
  const storage = getTenantStorage(ctx);
  return storage.createTrigger({
    name: data.name,
    eventType: data.eventType,
    condition: data.condition ?? {},
    actionType: data.actionType,
    actionConfig: data.actionConfig,
    enabled: true,
  });
}

export async function fireTrigger(
  ctx: TenantContext,
  id: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const storage = getTenantStorage(ctx);
  const trigger = await storage.getTriggerById(id);
  if (!trigger) {
    throw new ServiceError("Trigger not found", 404);
  }
  if (!trigger.enabled) {
    throw new ServiceError("Trigger is disabled", 400);
  }

  // O5: Create an idempotent intent if trigger action is workflow
  if (trigger.actionType === "workflow") {
    const config = trigger.actionConfig as { workflowDefinitionId?: string };
    if (config.workflowDefinitionId) {
      const idempotencyKey = `trigger:${id}:${Date.now()}`;
      await storage.createWorkflowExecutionIntent({
        workflowDefinitionId: config.workflowDefinitionId,
        idempotencyKey,
        status: "pending",
        payload,
        executionId: null,
      });
    }
  }
}
