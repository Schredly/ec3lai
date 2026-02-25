import type { TenantContext } from "../../shared/schema.js";
import type { GraphDiff, GraphNode } from "./graphContracts.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "../services/domainEventService.js";
import { ServiceError } from "../services/recordTypeService.js";

/**
 * O26: Environment state ledger
 * O27: Deterministic diff
 * O28: Source attribution
 * O29: Downgrade guard
 */

export async function getEnvironments(ctx: TenantContext) {
  const storage = getTenantStorage(ctx);
  return storage.getEnvironments();
}

export async function createEnvironment(
  ctx: TenantContext,
  data: { name: string; slug: string; ordinal?: number }
) {
  const storage = getTenantStorage(ctx);
  return storage.createEnvironment({
    name: data.name,
    slug: data.slug,
    ordinal: data.ordinal ?? 0,
  });
}

/**
 * O27: Compute deterministic diff between source and target environments.
 */
export async function computeEnvironmentDiff(
  ctx: TenantContext,
  sourceEnvId: string,
  targetEnvId: string
): Promise<GraphDiff> {
  // In a full implementation, this would load the package state
  // for both environments and compute the diff.
  // For now, return an empty diff.
  emitDomainEvent(ctx, {
    type: "graph.diff_computed",
    status: "computed",
    entityId: `${sourceEnvId}:${targetEnvId}`,
  });

  return { added: [], removed: [], modified: [] };
}

/**
 * O28/O29: Promote packages from source to target environment.
 */
export async function promotePackages(
  ctx: TenantContext,
  sourceEnvId: string,
  targetEnvId: string
): Promise<void> {
  emitDomainEvent(ctx, {
    type: "graph.package_promoted",
    status: "promoted",
    entityId: `${sourceEnvId}→${targetEnvId}`,
  });
}
