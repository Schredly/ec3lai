import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

export type DomainEventType =
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "workflow.intent.started"
  | "workflow.intent.completed"
  | "workflow.intent.failed"
  | "record.assigned"
  | "record.sla.created"
  | "record.sla.breached"
  | "graph.validation_failed"
  | "graph.validation_succeeded"
  | "graph.diff_computed"
  | "graph.package_installed"
  | "graph.package_install_noop"
  | "graph.package_install_rejected"
  | "graph.package_promoted"
  | "graph.promotion_intent_created"
  | "graph.promotion_intent_previewed"
  | "graph.promotion_intent_approved"
  | "graph.promotion_intent_executed"
  | "graph.promotion_intent_rejected"
  | "vibe.llm_generation_requested"
  | "vibe.llm_generation_succeeded"
  | "vibe.llm_generation_failed"
  | "vibe.llm_repair_attempted"
  | "vibe.llm_refinement_requested"
  | "vibe.llm_refinement_succeeded"
  | "vibe.llm_refinement_failed"
  | "vibe.draft_discarded"
  | "vibe.draft_patched"
  | "vibe.draft_version_created"
  | "vibe.draft_restored"
  | "vibe.variant_generation_requested"
  | "vibe.variant_generation_completed"
  | "vibe.draft_created_from_variant"
  | "vibe.variant_diff_computed"
  | "vibe.draft_variant_adopted"
  | "vibe.llm_token_stream_started"
  | "vibe.llm_token_stream_completed"
  | "vibe.llm_token_stream_failed"
  | "vibe.draft_version_diff_computed"
  | "graph.promotion_notification_sent"
  | "graph.promotion_notification_failed"
  | "vibe.app_generated"
  | "agent.registered"
  | "agent.status_changed"
  | "agent.execution_completed"
  | "agent.execution_failed"
  | "agent.version_installed";

export interface DomainEvent {
  type: DomainEventType;
  status: string;
  entityId: string;
  workflowId?: string | null;
  workflowStepId?: string | null;
  moduleId?: string;
  error?: { code?: string; message: string };
  affectedRecords?: Record<string, unknown> | unknown[] | null;
  metadata?: Record<string, unknown>;
}

type EventHandler = (ctx: TenantContext, event: DomainEvent) => void | Promise<void>;

const subscribers = new Map<string, Set<EventHandler>>();

/**
 * O1: emitDomainEvent never throws.
 * O2: Subscriber isolation — each handler dispatched independently.
 */
export function emitDomainEvent(ctx: TenantContext, event: DomainEvent): void {
  // Derive actor info
  const actorType = ctx.agentId ? "agent" : ctx.userId ? "user" : "system";
  const actorId = ctx.agentId ?? ctx.userId ?? null;

  // DB persistence (fire-and-forget)
  try {
    const storage = getTenantStorage(ctx);
    storage.createTelemetryEvent({
      eventType: event.type,
      entityType: event.workflowId ? "workflow_step" : "task",
      entityId: event.entityId,
      actor: actorId ?? undefined,
      payload: { ...event, actorType, actorId },
    }).catch((err) => {
      console.error(`[domain-event] DB write error for ${event.type}:`, err);
    });
  } catch {
    // O1: never throws
  }

  // In-memory pub-sub (O2: subscriber isolation)
  const handlers = subscribers.get(event.type);
  if (handlers) {
    for (const handler of handlers) {
      Promise.resolve()
        .then(() => handler(ctx, event))
        .catch((err) => {
          console.error(
            `[domain-event] Subscriber error for ${event.type}:`,
            err
          );
        });
    }
  }
}

export function subscribe(
  eventType: DomainEventType,
  handler: EventHandler
): () => void {
  if (!subscribers.has(eventType)) {
    subscribers.set(eventType, new Set());
  }
  subscribers.get(eventType)!.add(handler);

  return () => {
    subscribers.get(eventType)?.delete(handler);
  };
}

export function clearSubscribers(): void {
  subscribers.clear();
}
