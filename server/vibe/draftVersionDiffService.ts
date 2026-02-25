import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "../services/domainEventService.js";
import { ServiceError } from "../services/recordTypeService.js";

/**
 * O89-O91: Draft version-to-version diff.
 * Read-only — works on any draft status.
 */

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: {
    path: string;
    type: "added" | "removed" | "changed";
    oldValue?: unknown;
    newValue?: unknown;
  }[];
}

export async function diffVersions(
  ctx: TenantContext,
  draftId: string,
  fromVersion: number,
  toVersion: number
): Promise<VersionDiff> {
  const storage = getTenantStorage(ctx);
  const versions = await storage.getVibeDraftVersions(draftId);

  const from = versions.find((v) => v.versionNumber === fromVersion);
  const to = versions.find((v) => v.versionNumber === toVersion);

  if (!from) {
    throw new ServiceError(`Version ${fromVersion} not found`, 404);
  }
  if (!to) {
    throw new ServiceError(`Version ${toVersion} not found`, 404);
  }

  const fromJson = from.packageJson as Record<string, unknown>;
  const toJson = to.packageJson as Record<string, unknown>;

  // Simple top-level diff
  const changes: VersionDiff["changes"] = [];
  const allKeys = new Set([...Object.keys(fromJson), ...Object.keys(toJson)]);

  for (const key of allKeys) {
    const oldVal = fromJson[key];
    const newVal = toJson[key];

    if (oldVal === undefined && newVal !== undefined) {
      changes.push({ path: key, type: "added", newValue: newVal });
    } else if (oldVal !== undefined && newVal === undefined) {
      changes.push({ path: key, type: "removed", oldValue: oldVal });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        path: key,
        type: "changed",
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  emitDomainEvent(ctx, {
    type: "vibe.draft_version_diff_computed",
    status: "computed",
    entityId: draftId,
  });

  return { fromVersion, toVersion, changes };
}
