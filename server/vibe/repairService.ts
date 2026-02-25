import type { TenantContext } from "../../shared/schema.js";
import { createLlmAdapter } from "./llmAdapter.js";
import { validateGraphPackage, type ValidatedGraphPackage } from "./graphPackageSchema.js";
import { buildGeneratePrompt, buildRepairPrompt } from "./promptBuilder.js";
import { emitDomainEvent } from "../services/domainEventService.js";

const MAX_REPAIR_ATTEMPTS = 3;

/**
 * O52-O53: Generate → validate → retry → preview.
 * O57: Never auto-install.
 */
export async function generateWithRepair(
  ctx: TenantContext,
  prompt: string
): Promise<{
  package: ValidatedGraphPackage | null;
  errors: string[];
  attempts: number;
}> {
  const adapter = createLlmAdapter();
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const currentPrompt =
      attempt === 1
        ? buildGeneratePrompt(prompt)
        : buildRepairPrompt(buildGeneratePrompt(prompt), lastErrors);

    let raw: unknown;
    if (attempt === 1) {
      raw = await adapter.generate(currentPrompt);
    } else {
      emitDomainEvent(ctx, {
        type: "vibe.llm_repair_attempted",
        status: "attempting",
        entityId: "repair",
      });
      raw = await adapter.repair(currentPrompt, lastErrors);
    }

    const validation = validateGraphPackage(raw);
    if (validation.success) {
      return { package: validation.data, errors: [], attempts: attempt };
    }

    lastErrors = validation.errors;
  }

  return { package: null, errors: lastErrors, attempts: MAX_REPAIR_ATTEMPTS };
}
