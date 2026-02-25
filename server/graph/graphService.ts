import type { TenantContext } from "../../shared/schema.js";
import type { GraphSnapshot, GraphValidationError } from "./graphContracts.js";
import { buildGraphSnapshot } from "./graphRegistryService.js";
import { validateGraph } from "./graphValidationService.js";

/**
 * Admin introspection endpoints.
 * RBAC: admin.view
 */
export async function getGraphSnapshot(
  ctx: TenantContext
): Promise<GraphSnapshot> {
  return buildGraphSnapshot(ctx);
}

export async function getGraphSummary(
  ctx: TenantContext
): Promise<{
  nodeCount: number;
  edgeCount: number;
  packageCount: number;
  errors: GraphValidationError[];
}> {
  const snapshot = await buildGraphSnapshot(ctx);
  const errors = validateGraph(snapshot);

  return {
    nodeCount: snapshot.nodes.length,
    edgeCount: snapshot.edges.length,
    packageCount: snapshot.packages.length,
    errors,
  };
}

export async function validateCurrentGraph(
  ctx: TenantContext
): Promise<{ valid: boolean; errors: GraphValidationError[] }> {
  const snapshot = await buildGraphSnapshot(ctx);
  const errors = validateGraph(snapshot);
  return { valid: errors.length === 0, errors };
}
