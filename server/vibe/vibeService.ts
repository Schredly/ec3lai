import type { TenantContext } from "../../shared/schema.js";
import { createLlmAdapter } from "./llmAdapter.js";
import { validateGraphPackage, type ValidatedGraphPackage } from "./graphPackageSchema.js";
import { buildGeneratePrompt, buildRefinePrompt } from "./promptBuilder.js";
import { installPackage } from "../graph/installService.js";
import { emitDomainEvent } from "../services/domainEventService.js";

/**
 * O37: Generate package from prompt
 * O38: Install delegation
 * O48-O51: Zod validation, namespace guard
 * O58-O60: Refine with fallback
 */

export async function generatePackage(
  ctx: TenantContext,
  prompt: string
): Promise<{ package: ValidatedGraphPackage; errors?: string[] }> {
  const adapter = createLlmAdapter();

  emitDomainEvent(ctx, {
    type: "vibe.llm_generation_requested",
    status: "requested",
    entityId: "generation",
  });

  const raw = await adapter.generate(buildGeneratePrompt(prompt));

  const validation = validateGraphPackage(raw);
  if (!validation.success) {
    emitDomainEvent(ctx, {
      type: "vibe.llm_generation_failed",
      status: "failed",
      entityId: "generation",
      error: { message: validation.errors.join("; ") },
    });
    return { package: raw as any, errors: validation.errors };
  }

  emitDomainEvent(ctx, {
    type: "vibe.llm_generation_succeeded",
    status: "succeeded",
    entityId: validation.data.key,
  });

  return { package: validation.data };
}

export async function installGeneratedPackage(
  ctx: TenantContext,
  pkg: ValidatedGraphPackage,
  projectId: string
): Promise<{ installed: boolean; reason?: string }> {
  // O38: Delegate to install engine
  return installPackage(ctx, {
    ...pkg as any,
    recordTypes: pkg.recordTypes.map((rt) => ({
      ...rt,
      projectId,
      baseType: rt.baseType ?? null,
    })),
    workflows: pkg.workflows.map((wf) => ({
      ...wf,
      projectId,
    })),
  }, projectId);
}

/**
 * O58-O60: Refine with deterministic fallback.
 */
export async function refinePackage(
  ctx: TenantContext,
  existingPackage: ValidatedGraphPackage,
  refinement: string
): Promise<{ package: ValidatedGraphPackage; errors?: string[] }> {
  const adapter = createLlmAdapter();

  emitDomainEvent(ctx, {
    type: "vibe.llm_refinement_requested",
    status: "requested",
    entityId: existingPackage.key,
  });

  try {
    const raw = await adapter.refine(
      buildRefinePrompt(existingPackage, refinement),
      existingPackage,
      refinement
    );

    const validation = validateGraphPackage(raw);
    if (!validation.success) {
      // Fallback: return existing package with errors
      emitDomainEvent(ctx, {
        type: "vibe.llm_refinement_failed",
        status: "failed",
        entityId: existingPackage.key,
        error: { message: validation.errors.join("; ") },
      });
      return { package: existingPackage, errors: validation.errors };
    }

    emitDomainEvent(ctx, {
      type: "vibe.llm_refinement_succeeded",
      status: "succeeded",
      entityId: validation.data.key,
    });

    return { package: validation.data };
  } catch {
    // O60: Deterministic fallback — return existing package unchanged
    return { package: existingPackage };
  }
}
