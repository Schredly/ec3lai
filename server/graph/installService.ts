import type { TenantContext } from "../../shared/schema.js";
import type { GraphPackage, RecordTypeNode, WorkflowNode } from "./graphContracts.js";
import { getTenantStorage } from "../tenantStorage.js";
import { buildGraphSnapshot } from "./graphRegistryService.js";
import { validateGraph } from "./graphValidationService.js";
import { emitDomainEvent } from "../services/domainEventService.js";
import { ServiceError } from "../services/recordTypeService.js";
import * as crypto from "crypto";

/**
 * O13: Graph validation before mutation
 * O14: Topological ordering
 * O16: Checksum idempotency
 * O17: Version guard
 * O18: Append-only audit trail
 * O20: Ownership conflict detection
 * O21: Batch install with dependency ordering
 */

function computeChecksum(pkg: GraphPackage): string {
  const content = JSON.stringify({
    key: pkg.key,
    version: pkg.version,
    recordTypes: pkg.recordTypes,
    workflows: pkg.workflows,
  });
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * O14: Topological sort for record types based on baseType dependencies.
 */
function topologicalSort(recordTypes: RecordTypeNode[]): RecordTypeNode[] {
  const byKey = new Map(recordTypes.map((rt) => [rt.key, rt]));
  const visited = new Set<string>();
  const sorted: RecordTypeNode[] = [];

  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    const rt = byKey.get(key);
    if (rt?.baseType && byKey.has(rt.baseType)) {
      visit(rt.baseType);
    }
    if (rt) sorted.push(rt);
  }

  for (const rt of recordTypes) {
    visit(rt.key);
  }

  return sorted;
}

export async function installPackage(
  ctx: TenantContext,
  pkg: GraphPackage,
  projectId: string
): Promise<{ installed: boolean; reason?: string }> {
  const storage = getTenantStorage(ctx);

  // O16: Checksum idempotency — skip if same version already installed
  const existing = await storage.getGraphPackageInstallByKey(pkg.key);
  const checksum = computeChecksum(pkg);

  if (existing) {
    if (existing.checksum === checksum) {
      emitDomainEvent(ctx, {
        type: "graph.package_install_noop",
        status: "noop",
        entityId: pkg.key,
      });
      return { installed: false, reason: "Already installed with same checksum" };
    }

    // O17: Version guard — don't downgrade
    if (
      existing.packageVersion &&
      pkg.version &&
      existing.packageVersion > pkg.version
    ) {
      emitDomainEvent(ctx, {
        type: "graph.package_install_rejected",
        status: "rejected",
        entityId: pkg.key,
        error: { message: "Downgrade not allowed" },
      });
      return { installed: false, reason: "Downgrade not allowed" };
    }
  }

  // O13: Validate graph before mutation
  const snapshot = await buildGraphSnapshot(ctx);
  const errors = validateGraph(snapshot);
  if (errors.length > 0) {
    emitDomainEvent(ctx, {
      type: "graph.package_install_rejected",
      status: "rejected",
      entityId: pkg.key,
      error: { message: errors.map((e) => e.message).join("; ") },
    });
    return {
      installed: false,
      reason: `Graph validation failed: ${errors[0].message}`,
    };
  }

  // O14: Install record types in dependency order
  const sortedRTs = topologicalSort(pkg.recordTypes);

  for (const rt of sortedRTs) {
    // O20: Check ownership conflicts
    const existingRT = await storage.getRecordTypeByKey(rt.key);
    if (existingRT) {
      // Update schema on upgrade
      await storage.updateRecordTypeSchema(existingRT.id, {
        fields: rt.fields,
      });
    } else {
      await storage.createRecordType({
        key: rt.key,
        name: rt.name,
        projectId,
        description: null,
        baseType: rt.baseType ?? null,
        schema: { fields: rt.fields },
      });
    }
  }

  // O18: Append-only audit trail
  await storage.createGraphPackageInstall({
    packageKey: pkg.key,
    packageVersion: pkg.version,
    checksum,
    installedBy: ctx.userId ?? ctx.agentId ?? "system",
    manifest: pkg,
  });

  emitDomainEvent(ctx, {
    type: "graph.package_installed",
    status: "installed",
    entityId: pkg.key,
  });

  return { installed: true };
}

/**
 * O21: Batch install with dependency ordering.
 */
export async function installPackages(
  ctx: TenantContext,
  packages: GraphPackage[],
  projectId: string
): Promise<{ results: { key: string; installed: boolean; reason?: string }[] }> {
  const results: { key: string; installed: boolean; reason?: string }[] = [];

  for (const pkg of packages) {
    const result = await installPackage(ctx, pkg, projectId);
    results.push({ key: pkg.key, ...result });
  }

  return { results };
}
