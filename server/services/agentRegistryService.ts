import type { TenantContext, Agent } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "./domainEventService.js";

export async function getAgents(ctx: TenantContext) {
  const storage = getTenantStorage(ctx);
  return storage.getAgents();
}

export async function getAgentById(ctx: TenantContext, id: string) {
  const storage = getTenantStorage(ctx);
  return storage.getAgentById(id);
}

export async function createAgent(
  ctx: TenantContext,
  data: {
    name: string;
    description?: string | null;
    appId?: string | null;
    subscribedEvents?: unknown;
    executionPolicy?: unknown;
  }
) {
  const storage = getTenantStorage(ctx);
  const agent = await storage.createAgent({
    name: data.name,
    description: data.description ?? null,
    appId: data.appId ?? null,
    subscribedEvents: data.subscribedEvents ?? [],
    executionPolicy: data.executionPolicy ?? {},
    createdBy: ctx.userId ?? ctx.agentId ?? "system",
  });

  emitDomainEvent(ctx, {
    type: "agent.registered",
    entityId: agent.id,
    status: "registered",
  });

  return agent;
}

export async function updateAgentStatus(
  ctx: TenantContext,
  id: string,
  status: "active" | "paused" | "inactive"
) {
  const storage = getTenantStorage(ctx);
  const agent = await storage.getAgentById(id);
  if (!agent) throw new Error("Agent not found");

  // Sprint 4: draft agents (no bound version) cannot be activated
  if (status === "active" && !agent.boundPackageInstallId) {
    throw new Error("Cannot activate a draft agent — must be bound to an installed version via promotion");
  }

  const updated = await storage.updateAgent(id, { status });

  emitDomainEvent(ctx, {
    type: "agent.status_changed",
    entityId: id,
    status,
  });

  return updated;
}

/**
 * Sprint 4: Bind agent to an installed package version.
 * Called during promotion execution to make agents executable.
 */
export async function bindAgentToVersion(
  ctx: TenantContext,
  agentId: string,
  packageInstallId: string
) {
  const storage = getTenantStorage(ctx);
  const agent = await storage.getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");

  const updated = await storage.updateAgent(agentId, {
    boundPackageInstallId: packageInstallId,
    version: agent.version + 1,
  });

  emitDomainEvent(ctx, {
    type: "agent.version_installed",
    entityId: agentId,
    status: "installed",
    metadata: { packageInstallId, newVersion: agent.version + 1 },
  });

  return updated;
}

export async function updateAgentSubscriptions(
  ctx: TenantContext,
  id: string,
  subscribedEvents: string[]
) {
  const storage = getTenantStorage(ctx);
  return storage.updateAgent(id, { subscribedEvents });
}
