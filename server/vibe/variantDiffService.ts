import type { TenantContext } from "../../shared/schema.js";
import type { ValidatedGraphPackage } from "./graphPackageSchema.js";
import { emitDomainEvent } from "../services/domainEventService.js";

/**
 * O79, O82: Variant-to-variant diff.
 * Pure comparison — never mutates.
 */

export interface VariantDiff {
  addedRecordTypes: string[];
  removedRecordTypes: string[];
  modifiedRecordTypes: { key: string; addedFields: string[]; removedFields: string[] }[];
  addedWorkflows: string[];
  removedWorkflows: string[];
}

export function diffVariants(
  ctx: TenantContext,
  a: ValidatedGraphPackage,
  b: ValidatedGraphPackage
): VariantDiff {
  const aRTKeys = new Set(a.recordTypes.map((rt) => rt.key));
  const bRTKeys = new Set(b.recordTypes.map((rt) => rt.key));

  const addedRecordTypes = [...bRTKeys].filter((k) => !aRTKeys.has(k));
  const removedRecordTypes = [...aRTKeys].filter((k) => !bRTKeys.has(k));

  const modifiedRecordTypes: VariantDiff["modifiedRecordTypes"] = [];
  for (const key of aRTKeys) {
    if (!bRTKeys.has(key)) continue;
    const aRT = a.recordTypes.find((rt) => rt.key === key)!;
    const bRT = b.recordTypes.find((rt) => rt.key === key)!;

    const aFields = new Set(aRT.fields.map((f) => f.name));
    const bFields = new Set(bRT.fields.map((f) => f.name));

    const addedFields = [...bFields].filter((f) => !aFields.has(f));
    const removedFields = [...aFields].filter((f) => !bFields.has(f));

    if (addedFields.length > 0 || removedFields.length > 0) {
      modifiedRecordTypes.push({ key, addedFields, removedFields });
    }
  }

  const aWFKeys = new Set(a.workflows.map((w) => w.key));
  const bWFKeys = new Set(b.workflows.map((w) => w.key));

  emitDomainEvent(ctx, {
    type: "vibe.variant_diff_computed",
    status: "computed",
    entityId: `${a.key}:${b.key}`,
  });

  return {
    addedRecordTypes,
    removedRecordTypes,
    modifiedRecordTypes,
    addedWorkflows: [...bWFKeys].filter((k) => !aWFKeys.has(k)),
    removedWorkflows: [...aWFKeys].filter((k) => !bWFKeys.has(k)),
  };
}
