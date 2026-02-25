import type { TenantContext, PatchOp } from "../../shared/schema.js";
import { VALID_FIELD_TYPES, PATCH_OP_TYPES } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { ServiceError } from "./recordTypeService.js";

/** States that allow creating patch ops */
const CREATABLE_STATUSES = [
  "Draft",
  "Implementing",
  "WorkspaceRunning",
  "ValidationFailed",
];

interface PatchOpPayload {
  recordType?: string;
  field?: string;
  oldName?: string;
  newName?: string;
  definition?: { type?: string; required?: boolean };
  filePath?: string;
  diff?: string;
}

/**
 * Create a patch op with all guards:
 * - Change status guard (can only add ops in certain states)
 * - Duplicate field detection (409)
 * - D8: Field type validation
 * - P7: Cross-project consistency check
 */
export async function createPatchOp(
  ctx: TenantContext,
  changeId: string,
  data: {
    targetId: string;
    opType: string;
    payload: PatchOpPayload;
  }
): Promise<PatchOp> {
  const storage = getTenantStorage(ctx);

  // Validate change exists
  const change = await storage.getChangeById(changeId);
  if (!change) {
    throw new ServiceError("Change not found", 404);
  }

  // E1: Cannot add ops to merged changes
  if (change.status === "Merged") {
    throw new ServiceError(
      "Cannot add patch ops to a merged change",
      400
    );
  }

  // Status guard for op creation
  if (!CREATABLE_STATUSES.includes(change.status)) {
    throw new ServiceError(
      `Cannot add patch ops when change is in '${change.status}' status`,
      400
    );
  }

  // Validate op type
  if (!PATCH_OP_TYPES.includes(data.opType as any)) {
    throw new ServiceError(
      `Invalid op type "${data.opType}". Allowed types: ${PATCH_OP_TYPES.join(", ")}`,
      400
    );
  }

  // Validate target exists
  const target = await storage.getChangeTargetById(data.targetId);
  if (!target) {
    throw new ServiceError("Target not found", 404);
  }

  // Validate target belongs to this change
  if (target.changeId !== changeId) {
    throw new ServiceError("Target does not belong to this change", 400);
  }

  // D8: Validate field type for field ops
  const fieldOps = ["set_field", "add_field"];
  if (
    fieldOps.includes(data.opType) &&
    data.payload.definition?.type
  ) {
    if (
      !VALID_FIELD_TYPES.includes(data.payload.definition.type as any)
    ) {
      throw new ServiceError(
        `Invalid field type "${data.payload.definition.type}". Allowed types: ${VALID_FIELD_TYPES.join(", ")}`,
        400
      );
    }
  }

  // P7: Cross-project consistency (fail-fast at creation)
  if (target.type === "record_type") {
    const selector = target.selector as { recordTypeKey?: string };
    if (selector.recordTypeKey) {
      const rt = await storage.getRecordTypeByKey(selector.recordTypeKey);
      if (rt && rt.projectId !== change.projectId) {
        throw new ServiceError(
          `Record type "${selector.recordTypeKey}" belongs to a different project than the change`,
          400
        );
      }
    }
  }

  // Duplicate field guard (409) — prevent same field op in same change
  if (data.payload.recordType && data.payload.field) {
    const existingOps = await storage.getChangePatchOps(changeId);
    const fieldKey = `${data.payload.recordType}::${data.payload.field}`;
    const duplicate = existingOps.find((op) => {
      const p = op.payload as PatchOpPayload;
      if (p.recordType && p.field) {
        return `${p.recordType}::${p.field}` === fieldKey;
      }
      return false;
    });
    if (duplicate) {
      throw new ServiceError(
        `A pending patch op for field "${data.payload.field}" on record type "${data.payload.recordType}" already exists in this change`,
        409
      );
    }
  }

  return storage.createPatchOp({
    changeId,
    targetId: data.targetId,
    opType: data.opType,
    payload: data.payload,
  });
}

export async function getChangePatchOps(
  ctx: TenantContext,
  changeId: string
): Promise<PatchOp[]> {
  const storage = getTenantStorage(ctx);
  return storage.getChangePatchOps(changeId);
}

/**
 * Delete a patch op with full guard chain:
 * 1. Change not found → 404
 * 2. Change is Merged → 400 (E1)
 * 3. Op not found or wrong tenant → 404 (T5)
 * 4. Op belongs to different change → 400
 * 5. Op already executed → 409 (E3)
 */
export async function deletePatchOp(
  ctx: TenantContext,
  changeId: string,
  opId: string
): Promise<void> {
  const storage = getTenantStorage(ctx);

  // 1. Validate change exists
  const change = await storage.getChangeById(changeId);
  if (!change) {
    throw new ServiceError("Change not found", 404);
  }

  // 2. E1: Cannot delete ops from merged changes
  if (change.status === "Merged") {
    throw new ServiceError(
      "Cannot delete patch ops from a merged change",
      400
    );
  }

  // 3. T5: Op not found (returns 404 to hide tenant info)
  const op = await storage.getPatchOpById(opId);
  if (!op) {
    throw new ServiceError("Patch op not found", 404);
  }

  // 4. Op must belong to this change
  if (op.changeId !== changeId) {
    throw new ServiceError("Patch op does not belong to this change", 400);
  }

  // 5. E3: Cannot delete executed ops
  if (op.executedAt) {
    throw new ServiceError("Cannot delete an executed patch op", 409);
  }

  await storage.deletePatchOp(opId);
}
