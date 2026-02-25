import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import type { GraphSnapshot, GraphNode, EdgeDefinition } from "./graphContracts.js";

/**
 * Builds a GraphSnapshot from existing database tables.
 */
export async function buildGraphSnapshot(
  ctx: TenantContext
): Promise<GraphSnapshot> {
  const storage = getTenantStorage(ctx);

  const recordTypes = await storage.getRecordTypes();
  const packages = await storage.getGraphPackageInstalls();

  const nodes: GraphNode[] = [];
  const edges: EdgeDefinition[] = [];

  for (const rt of recordTypes) {
    const schema = (rt.schema as { fields?: { name: string; type: string; required?: boolean }[] }) || { fields: [] };
    nodes.push({
      type: "record_type",
      key: rt.key,
      projectId: rt.projectId,
      data: {
        key: rt.key,
        name: rt.name,
        projectId: rt.projectId,
        baseType: rt.baseType,
        fields: schema.fields ?? [],
      },
    });

    if (rt.baseType) {
      edges.push({
        from: rt.key,
        to: rt.baseType,
        type: "inherits",
      });
    }
  }

  return {
    nodes,
    edges,
    packages: packages.map((p) => ({
      key: p.packageKey,
      version: p.packageVersion,
    })),
  };
}
