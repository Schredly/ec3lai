import type { TenantContext } from "../../shared/schema.js";
import { createLlmAdapter } from "./llmAdapter.js";
import { validateGraphPackage, type ValidatedGraphPackage } from "./graphPackageSchema.js";
import { buildGeneratePrompt } from "./promptBuilder.js";
import { emitDomainEvent } from "../services/domainEventService.js";
import * as crypto from "crypto";

/**
 * O74-O78: Multi-variant AI generation.
 * N parallel LLM calls, bounded 1-5.
 * Exploration-only — never creates drafts or mutates graph.
 */

export interface Variant {
  index: number;
  package: ValidatedGraphPackage | null;
  errors: string[];
  checksum: string | null;
}

export async function generateVariants(
  ctx: TenantContext,
  prompt: string,
  count: number = 3
): Promise<Variant[]> {
  // O76: Bounded 1-5
  const n = Math.max(1, Math.min(5, count));

  emitDomainEvent(ctx, {
    type: "vibe.variant_generation_requested",
    status: "requested",
    entityId: "variants",
  });

  const adapter = createLlmAdapter();
  const fullPrompt = buildGeneratePrompt(prompt);

  // O75: N parallel LLM calls
  const promises = Array.from({ length: n }, async (_, i) => {
    try {
      const raw = await adapter.generate(fullPrompt);
      const validation = validateGraphPackage(raw);

      if (validation.success) {
        const checksum = crypto
          .createHash("sha256")
          .update(JSON.stringify(validation.data))
          .digest("hex")
          .slice(0, 16);

        return {
          index: i,
          package: validation.data,
          errors: [],
          checksum,
        };
      }

      return { index: i, package: null, errors: validation.errors, checksum: null };
    } catch (err) {
      return {
        index: i,
        package: null,
        errors: [err instanceof Error ? err.message : "Unknown error"],
        checksum: null,
      };
    }
  });

  const variants = await Promise.all(promises);

  emitDomainEvent(ctx, {
    type: "vibe.variant_generation_completed",
    status: "completed",
    entityId: "variants",
  });

  return variants;
}
