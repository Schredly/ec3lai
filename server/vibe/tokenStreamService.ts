import type { TenantContext } from "../../shared/schema.js";
import { emitDomainEvent } from "../services/domainEventService.js";

/**
 * O84-O88: Token-level LLM streaming via SSE.
 * Preview-only — never creates drafts or installs.
 */

export interface StreamEvent {
  type: "token" | "stage" | "complete" | "error";
  data: string;
}

/**
 * Creates an SSE-compatible async generator that yields stream events.
 * In a real implementation, this would stream tokens from the LLM.
 */
export async function* streamGeneration(
  ctx: TenantContext,
  prompt: string
): AsyncGenerator<StreamEvent> {
  emitDomainEvent(ctx, {
    type: "vibe.llm_token_stream_started",
    status: "started",
    entityId: "stream",
  });

  try {
    yield { type: "stage", data: "Generating package..." };

    // In a real implementation, this would stream tokens from the LLM.
    // For now, yield the complete result immediately.
    const { createLlmAdapter } = await import("./llmAdapter.js");
    const adapter = createLlmAdapter();
    const { buildGeneratePrompt } = await import("./promptBuilder.js");
    const raw = await adapter.generate(buildGeneratePrompt(prompt));

    yield { type: "stage", data: "Validating..." };

    const { validateGraphPackage } = await import("./graphPackageSchema.js");
    const validation = validateGraphPackage(raw);

    if (validation.success) {
      yield { type: "complete", data: JSON.stringify(validation.data) };
    } else {
      yield {
        type: "error",
        data: JSON.stringify({ errors: validation.errors }),
      };
    }

    emitDomainEvent(ctx, {
      type: "vibe.llm_token_stream_completed",
      status: "completed",
      entityId: "stream",
    });
  } catch (err) {
    emitDomainEvent(ctx, {
      type: "vibe.llm_token_stream_failed",
      status: "failed",
      entityId: "stream",
      error: { message: err instanceof Error ? err.message : "Unknown error" },
    });

    yield {
      type: "error",
      data: JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
    };
  }
}
