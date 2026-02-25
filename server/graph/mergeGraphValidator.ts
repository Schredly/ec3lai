import type { TenantContext } from "../../shared/schema.js";
import type { GraphSnapshot, GraphValidationError } from "./graphContracts.js";
import { buildGraphSnapshot } from "./graphRegistryService.js";
import { validateGraph } from "./graphValidationService.js";
import { emitDomainEvent } from "../services/domainEventService.js";

/**
 * O7: Bridge between executor cache and graph validation.
 * O10-O12: Runs at merge boundary.
 *
 * Called between Load and Transform in the executor to validate
 * that the proposed changes don't violate graph constraints.
 */
export async function validateMergeGraph(
  ctx: TenantContext,
  changeId: string
): Promise<{ valid: boolean; errors: GraphValidationError[] }> {
  const snapshot = await buildGraphSnapshot(ctx);
  const errors = validateGraph(snapshot);

  if (errors.length > 0) {
    emitDomainEvent(ctx, {
      type: "graph.validation_failed",
      status: "failed",
      entityId: changeId,
      error: { message: errors.map((e) => e.message).join("; ") },
    });
    return { valid: false, errors };
  }

  emitDomainEvent(ctx, {
    type: "graph.validation_succeeded",
    status: "succeeded",
    entityId: changeId,
  });

  return { valid: true, errors: [] };
}
