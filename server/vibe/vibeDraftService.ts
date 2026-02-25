import type { TenantContext, VibePackageDraft, VibePackageDraftVersion } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "../services/domainEventService.js";
import { ServiceError } from "../services/recordTypeService.js";

/**
 * O41-O44: Draft CRUD + versioning
 * O56: Discard lifecycle
 * O66-O73: Version management
 */

export async function getVibeDrafts(ctx: TenantContext): Promise<VibePackageDraft[]> {
  const storage = getTenantStorage(ctx);
  return storage.getVibeDrafts();
}

export async function getVibeDraftById(
  ctx: TenantContext,
  id: string
): Promise<VibePackageDraft | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getVibeDraftById(id);
}

export async function createVibeDraft(
  ctx: TenantContext,
  data: {
    name: string;
    prompt?: string;
    packageJson?: unknown;
    templateKey?: string;
  }
): Promise<VibePackageDraft> {
  const storage = getTenantStorage(ctx);

  const draft = await storage.createVibeDraft({
    name: data.name,
    prompt: data.prompt ?? null,
    packageJson: data.packageJson ?? {},
    templateKey: data.templateKey ?? null,
    createdBy: ctx.userId ?? ctx.agentId ?? null,
  });

  // Auto-snapshot version 1
  await storage.createVibeDraftVersion({
    draftId: draft.id,
    versionNumber: 1,
    packageJson: data.packageJson ?? {},
    prompt: data.prompt ?? null,
  });

  emitDomainEvent(ctx, {
    type: "vibe.draft_version_created",
    status: "created",
    entityId: draft.id,
  });

  return draft;
}

export async function updateVibeDraft(
  ctx: TenantContext,
  id: string,
  data: Partial<Pick<VibePackageDraft, "name" | "prompt" | "packageJson" | "status">>
): Promise<VibePackageDraft> {
  const storage = getTenantStorage(ctx);

  const existing = await storage.getVibeDraftById(id);
  if (!existing) {
    throw new ServiceError("Vibe draft not found", 404);
  }

  const updated = await storage.updateVibeDraft(id, data);
  if (!updated) {
    throw new ServiceError("Vibe draft not found", 404);
  }

  // Auto-snapshot new version if package changed
  if (data.packageJson) {
    const versions = await storage.getVibeDraftVersions(id);
    const nextVersion = versions.length + 1;
    await storage.createVibeDraftVersion({
      draftId: id,
      versionNumber: nextVersion,
      packageJson: data.packageJson,
      prompt: data.prompt ?? existing.prompt,
    });

    emitDomainEvent(ctx, {
      type: "vibe.draft_version_created",
      status: "versioned",
      entityId: id,
    });
  }

  return updated;
}

export async function discardVibeDraft(
  ctx: TenantContext,
  id: string
): Promise<void> {
  const storage = getTenantStorage(ctx);
  await storage.updateVibeDraft(id, { status: "discarded" });

  emitDomainEvent(ctx, {
    type: "vibe.draft_discarded",
    status: "discarded",
    entityId: id,
  });
}

export async function getVibeDraftVersions(
  ctx: TenantContext,
  draftId: string
): Promise<VibePackageDraftVersion[]> {
  const storage = getTenantStorage(ctx);
  return storage.getVibeDraftVersions(draftId);
}

export async function restoreVersion(
  ctx: TenantContext,
  draftId: string,
  versionNumber: number
): Promise<VibePackageDraft> {
  const storage = getTenantStorage(ctx);
  const versions = await storage.getVibeDraftVersions(draftId);
  const targetVersion = versions.find((v) => v.versionNumber === versionNumber);

  if (!targetVersion) {
    throw new ServiceError(`Version ${versionNumber} not found`, 404);
  }

  const updated = await storage.updateVibeDraft(draftId, {
    packageJson: targetVersion.packageJson,
    prompt: targetVersion.prompt,
  });

  if (!updated) {
    throw new ServiceError("Vibe draft not found", 404);
  }

  emitDomainEvent(ctx, {
    type: "vibe.draft_restored",
    status: "restored",
    entityId: draftId,
  });

  return updated;
}
