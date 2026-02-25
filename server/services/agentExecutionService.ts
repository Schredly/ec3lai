import type { TenantContext, Agent } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent, subscribe } from "./domainEventService.js";
import type { DomainEvent, DomainEventType } from "./domainEventService.js";

/**
 * Agent Execution Service
 * - Subscribes agents to domain events
 * - Executes agent handlers when events fire
 * - Logs all executions
 * - Respects tenant boundary (context derived server-side)
 */

export async function executeAgent(
  ctx: TenantContext,
  agent: Agent,
  event: DomainEvent
): Promise<{ success: boolean; durationMs: number; error?: string }> {
  const storage = getTenantStorage(ctx);
  const start = Date.now();

  // Sprint 4 guard: draft agents (no bound version) cannot execute
  if (!agent.boundPackageInstallId) {
    const durationMs = Date.now() - start;
    const errorMsg = "Agent is not bound to an installed version — draft agents cannot execute";

    await storage.createAgentExecutionLog({
      agentId: agent.id,
      eventType: event.type,
      status: "rejected",
      durationMs,
      input: event,
      output: null,
      error: errorMsg,
    });

    emitDomainEvent(ctx, {
      type: "agent.execution_failed",
      entityId: agent.id,
      status: "rejected",
      error: { message: errorMsg },
    });

    return { success: false, durationMs, error: errorMsg };
  }

  try {
    // Agent execution logic - currently a no-op placeholder
    // that logs the execution. Real agent logic will be added
    // when agents have actual handler code.

    const durationMs = Date.now() - start;

    // Log execution
    await storage.createAgentExecutionLog({
      agentId: agent.id,
      eventType: event.type,
      status: "completed",
      durationMs,
      input: event,
      output: { handled: true },
      error: null,
    });

    // Update agent last execution
    await storage.updateAgent(agent.id, {
      lastExecutionAt: new Date(),
      lastExecutionStatus: "completed",
    });

    emitDomainEvent(ctx, {
      type: "agent.execution_completed",
      entityId: agent.id,
      status: "completed",
      metadata: { eventType: event.type, durationMs },
    });

    return { success: true, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Log failed execution
    await storage.createAgentExecutionLog({
      agentId: agent.id,
      eventType: event.type,
      status: "failed",
      durationMs,
      input: event,
      output: null,
      error: errorMsg,
    });

    // Update agent last execution
    await storage.updateAgent(agent.id, {
      lastExecutionAt: new Date(),
      lastExecutionStatus: "failed",
    });

    emitDomainEvent(ctx, {
      type: "agent.execution_failed",
      entityId: agent.id,
      status: "failed",
      error: { message: errorMsg },
    });

    return { success: false, durationMs, error: errorMsg };
  }
}

/**
 * Wire up active agents to listen for their subscribed events.
 * Called when agents are activated.
 */
export function wireAgentSubscriptions(
  ctx: TenantContext,
  agent: Agent
): (() => void)[] {
  const events = (agent.subscribedEvents as string[]) ?? [];
  const unsubscribers: (() => void)[] = [];

  for (const eventType of events) {
    const unsub = subscribe(
      eventType as DomainEventType,
      async (eventCtx, event) => {
        // Only execute if event is from same tenant
        if (eventCtx.tenantId !== ctx.tenantId) return;
        await executeAgent(ctx, agent, event);
      }
    );
    unsubscribers.push(unsub);
  }

  return unsubscribers;
}

export async function getAgentExecutionLogs(
  ctx: TenantContext,
  agentId: string
) {
  const storage = getTenantStorage(ctx);
  return storage.getAgentExecutionLogs(agentId);
}
