import type { TenantContext, ChangeRecord, ChangeStatus } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { ServiceError } from "./recordTypeService.js";

/** Allowed status transitions (from → to[]) */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Implementing"],
  Implementing: ["WorkspaceRunning"],
  WorkspaceRunning: ["Validating"],
  Validating: ["Ready", "ValidationFailed"],
  ValidationFailed: ["WorkspaceRunning"],
  Ready: ["Merged", "ValidationFailed"],
  // Merged is terminal — no transitions out
};

export async function getChanges(ctx: TenantContext): Promise<ChangeRecord[]> {
  const storage = getTenantStorage(ctx);
  return storage.getChanges();
}

export async function getChangeById(
  ctx: TenantContext,
  id: string
): Promise<ChangeRecord | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getChangeById(id);
}

export async function getChangesByProject(
  ctx: TenantContext,
  projectId: string
): Promise<ChangeRecord[]> {
  const storage = getTenantStorage(ctx);
  return storage.getChangesByProject(projectId);
}

export async function createChange(
  ctx: TenantContext,
  data: {
    title: string;
    description?: string | null;
    projectId: string;
    baseSha?: string | null;
    branchName?: string | null;
  }
): Promise<ChangeRecord> {
  const storage = getTenantStorage(ctx);

  // Validate project exists
  const project = await storage.getProjectById(data.projectId);
  if (!project) {
    throw new ServiceError("Project not found", 404);
  }

  return storage.createChange({
    title: data.title,
    description: data.description ?? null,
    projectId: data.projectId,
    baseSha: data.baseSha ?? null,
    branchName: data.branchName ?? null,
    createdBy: ctx.userId ?? ctx.agentId ?? null,
  });
}

/**
 * Update change status through the state machine.
 * Validates that the transition is allowed.
 */
export async function updateChangeStatus(
  ctx: TenantContext,
  id: string,
  newStatus: string
): Promise<ChangeRecord> {
  const storage = getTenantStorage(ctx);
  const change = await storage.getChangeById(id);

  if (!change) {
    throw new ServiceError("Change not found", 404);
  }

  // E1: Merged changes are immutable
  if (change.status === "Merged") {
    throw new ServiceError("Cannot modify a merged change", 400);
  }

  // Validate transition
  const allowed = ALLOWED_TRANSITIONS[change.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new ServiceError(
      `Invalid status transition from '${change.status}' to '${newStatus}'`,
      400
    );
  }

  const updated = await storage.updateChangeStatus(id, newStatus);
  if (!updated) {
    throw new ServiceError("Change not found", 404);
  }
  return updated;
}

/**
 * Merge a change: execute all patch ops then set status to Merged.
 * On execution failure, set status to ValidationFailed.
 *
 * Note: Actual execution logic is wired in routes.ts to avoid circular deps.
 * This function handles the status transitions.
 */
export async function mergeChange(
  ctx: TenantContext,
  id: string,
  executeFn: (ctx: TenantContext, changeId: string) => Promise<{ success: boolean; error?: string; appliedCount?: number }>
): Promise<ChangeRecord> {
  const storage = getTenantStorage(ctx);
  const change = await storage.getChangeById(id);

  if (!change) {
    throw new ServiceError("Change not found", 404);
  }

  // E1: Cannot merge an already-merged change
  if (change.status === "Merged") {
    throw new ServiceError("Change is already merged", 400);
  }

  // Execute all patch ops
  const result = await executeFn(ctx, id);

  if (!result.success) {
    // Set to ValidationFailed
    await storage.updateChangeStatus(id, "ValidationFailed");
    throw new ServiceError(`Execution failed: ${result.error}`, 422);
  }

  // Set to Merged
  const merged = await storage.updateChangeStatus(id, "Merged");
  if (!merged) {
    throw new ServiceError("Change not found", 404);
  }
  return merged;
}
