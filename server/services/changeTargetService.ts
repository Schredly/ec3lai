import type { TenantContext, ChangeTarget } from "../../shared/schema.js";
import { VALID_TARGET_TYPES } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { ServiceError } from "./recordTypeService.js";

/**
 * D9: Change targets have typed selectors.
 * P5: Target inherits project_id from change.
 */
export async function createChangeTarget(
  ctx: TenantContext,
  changeId: string,
  data: {
    type: string;
    selector: Record<string, unknown>;
  }
): Promise<ChangeTarget> {
  const storage = getTenantStorage(ctx);

  // Validate change exists and is in Draft status
  const change = await storage.getChangeById(changeId);
  if (!change) {
    throw new ServiceError("Change not found", 404);
  }

  // Targets can only be added in Draft
  if (change.status !== "Draft") {
    throw new ServiceError(
      "Change must be in Draft status to add targets",
      400
    );
  }

  // D9: Validate target type
  if (!VALID_TARGET_TYPES.includes(data.type as any)) {
    throw new ServiceError(
      `Invalid target type "${data.type}". Allowed types: ${VALID_TARGET_TYPES.join(", ")}`,
      400
    );
  }

  // D9: Validate selector based on type
  if (data.type === "record_type" && !data.selector.recordTypeKey) {
    throw new ServiceError(
      "record_type targets require a 'recordTypeKey' in selector",
      400
    );
  }
  if (data.type === "file" && !data.selector.filePath) {
    throw new ServiceError(
      "file targets require a 'filePath' in selector",
      400
    );
  }

  // P5: Inherit project_id from the change, not from the request body
  return storage.createChangeTarget({
    changeId,
    projectId: change.projectId,
    type: data.type,
    selector: data.selector,
  });
}

export async function getChangeTargets(
  ctx: TenantContext,
  changeId: string
): Promise<ChangeTarget[]> {
  const storage = getTenantStorage(ctx);
  return storage.getChangeTargets(changeId);
}
