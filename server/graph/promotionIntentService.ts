import type { TenantContext, PromotionIntent } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "../services/domainEventService.js";
import { ServiceError } from "../services/recordTypeService.js";
import { bindAgentToVersion } from "../services/agentRegistryService.js";

/**
 * O30-O34: Intent state machine: draft → previewed → approved → executed
 */

const INTENT_TRANSITIONS: Record<string, string[]> = {
  draft: ["previewed"],
  previewed: ["approved", "rejected"],
  approved: ["executed"],
};

export async function createPromotionIntent(
  ctx: TenantContext,
  data: {
    sourceEnvironmentId: string;
    targetEnvironmentId: string;
  }
): Promise<PromotionIntent> {
  const storage = getTenantStorage(ctx);

  const intent = await storage.createPromotionIntent({
    sourceEnvironmentId: data.sourceEnvironmentId,
    targetEnvironmentId: data.targetEnvironmentId,
    status: "draft",
    diff: {},
    approvedBy: null,
    createdBy: ctx.userId ?? null,
  });

  emitDomainEvent(ctx, {
    type: "graph.promotion_intent_created",
    status: "created",
    entityId: intent.id,
  });

  return intent;
}

export async function getPromotionIntents(ctx: TenantContext) {
  const storage = getTenantStorage(ctx);
  return storage.getPromotionIntents();
}

export async function getPromotionIntentById(
  ctx: TenantContext,
  id: string
) {
  const storage = getTenantStorage(ctx);
  return storage.getPromotionIntentById(id);
}

export async function transitionIntent(
  ctx: TenantContext,
  id: string,
  newStatus: string
): Promise<PromotionIntent> {
  const storage = getTenantStorage(ctx);
  const intent = await storage.getPromotionIntentById(id);
  if (!intent) {
    throw new ServiceError("Promotion intent not found", 404);
  }

  const allowed = INTENT_TRANSITIONS[intent.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new ServiceError(
      `Invalid intent transition from '${intent.status}' to '${newStatus}'`,
      400
    );
  }

  const updates: Partial<Pick<PromotionIntent, "status" | "approvedBy">> = {
    status: newStatus,
  };
  if (newStatus === "approved") {
    updates.approvedBy = ctx.userId ?? null;
  }

  const updated = await storage.updatePromotionIntent(id, updates);
  if (!updated) {
    throw new ServiceError("Promotion intent not found", 404);
  }

  // Sprint 4: When promotion is executed, bind agents to installed versions
  if (newStatus === "executed") {
    await bindAgentsOnPromotion(ctx, storage);
  }

  const eventTypeMap: Record<string, any> = {
    previewed: "graph.promotion_intent_previewed",
    approved: "graph.promotion_intent_approved",
    executed: "graph.promotion_intent_executed",
    rejected: "graph.promotion_intent_rejected",
  };

  emitDomainEvent(ctx, {
    type: eventTypeMap[newStatus] ?? "graph.promotion_intent_created",
    status: newStatus,
    entityId: id,
  });

  return updated;
}

/**
 * Sprint 4: On promotion execution, bind all agents linked to installed packages
 * to their latest package install version.
 */
async function bindAgentsOnPromotion(
  ctx: TenantContext,
  storage: ReturnType<typeof getTenantStorage>
) {
  const agents = await storage.getAgents();
  const packages = await storage.getGraphPackageInstalls();

  for (const agent of agents) {
    if (!agent.appId) continue;

    // Find the package install this agent is linked to
    const pkg = packages.find((p) => p.id === agent.appId);
    if (!pkg) continue;

    // Bind agent to the package install if not already bound
    if (agent.boundPackageInstallId !== pkg.id) {
      await bindAgentToVersion(ctx, agent.id, pkg.id);
    }
  }
}
