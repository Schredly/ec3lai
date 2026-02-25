import { eq, and } from "drizzle-orm";
import { db } from "./db.js";
import * as s from "../shared/schema.js";
import type { IStorage } from "./storage.js";
import type { ITenantStorage } from "./tenantStorage.js";
import type { TenantContext } from "../shared/schema.js";

// ─── Global (non-tenant-scoped) storage ────────────────────────────────────

export class DrizzleStorage implements IStorage {
  async getTenants() {
    return db.select().from(s.tenants);
  }

  async getTenantBySlug(slug: string) {
    const [row] = await db
      .select()
      .from(s.tenants)
      .where(eq(s.tenants.slug, slug))
      .limit(1);
    return row;
  }

  async getTenantById(id: string) {
    const [row] = await db
      .select()
      .from(s.tenants)
      .where(eq(s.tenants.id, id))
      .limit(1);
    return row;
  }
}

// ─── Tenant-scoped storage ─────────────────────────────────────────────────

export class DrizzleTenantStorage implements ITenantStorage {
  private tenantId: string;

  constructor(ctx: TenantContext) {
    this.tenantId = ctx.tenantId;
  }

  // ─── Projects ──────────────────────────────────────────────────────────

  async getProjects() {
    return db
      .select()
      .from(s.projects)
      .where(eq(s.projects.tenantId, this.tenantId));
  }

  async getProjectById(id: string) {
    const [row] = await db
      .select()
      .from(s.projects)
      .where(and(eq(s.projects.id, id), eq(s.projects.tenantId, this.tenantId)))
      .limit(1);
    return row;
  }

  async createProject(data: Omit<s.Project, "id" | "tenantId" | "createdAt">) {
    const [row] = await db
      .insert(s.projects)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Record Types ──────────────────────────────────────────────────────

  async getRecordTypes() {
    return db
      .select()
      .from(s.recordTypes)
      .where(eq(s.recordTypes.tenantId, this.tenantId));
  }

  async getRecordTypeById(id: string) {
    const [row] = await db
      .select()
      .from(s.recordTypes)
      .where(
        and(eq(s.recordTypes.id, id), eq(s.recordTypes.tenantId, this.tenantId))
      )
      .limit(1);
    return row;
  }

  async getRecordTypeByKey(key: string) {
    const [row] = await db
      .select()
      .from(s.recordTypes)
      .where(
        and(
          eq(s.recordTypes.key, key),
          eq(s.recordTypes.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async getRecordTypeByKeyAndProject(key: string, projectId: string) {
    const [row] = await db
      .select()
      .from(s.recordTypes)
      .where(
        and(
          eq(s.recordTypes.key, key),
          eq(s.recordTypes.projectId, projectId),
          eq(s.recordTypes.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async getRecordTypeByName(name: string) {
    const [row] = await db
      .select()
      .from(s.recordTypes)
      .where(
        and(
          eq(s.recordTypes.name, name),
          eq(s.recordTypes.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createRecordType(
    data: Omit<
      s.RecordType,
      "id" | "tenantId" | "createdAt" | "updatedAt" | "version" | "status"
    >
  ) {
    const [row] = await db
      .insert(s.recordTypes)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateRecordTypeSchema(id: string, schema: unknown) {
    const [row] = await db
      .update(s.recordTypes)
      .set({ schema, updatedAt: new Date() })
      .where(
        and(eq(s.recordTypes.id, id), eq(s.recordTypes.tenantId, this.tenantId))
      )
      .returning();
    return row;
  }

  async updateRecordTypeStatus(id: string, status: string) {
    const [row] = await db
      .update(s.recordTypes)
      .set({ status, updatedAt: new Date() })
      .where(
        and(eq(s.recordTypes.id, id), eq(s.recordTypes.tenantId, this.tenantId))
      )
      .returning();
    return row;
  }

  // ─── Change Records ────────────────────────────────────────────────────

  async getChanges() {
    return db
      .select()
      .from(s.changeRecords)
      .where(eq(s.changeRecords.tenantId, this.tenantId));
  }

  async getChangeById(id: string) {
    const [row] = await db
      .select()
      .from(s.changeRecords)
      .where(
        and(
          eq(s.changeRecords.id, id),
          eq(s.changeRecords.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async getChangesByProject(projectId: string) {
    return db
      .select()
      .from(s.changeRecords)
      .where(
        and(
          eq(s.changeRecords.projectId, projectId),
          eq(s.changeRecords.tenantId, this.tenantId)
        )
      );
  }

  async createChange(
    data: Omit<
      s.ChangeRecord,
      "id" | "tenantId" | "createdAt" | "updatedAt" | "status"
    >
  ) {
    const [row] = await db
      .insert(s.changeRecords)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateChangeStatus(id: string, status: string) {
    const [row] = await db
      .update(s.changeRecords)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(s.changeRecords.id, id),
          eq(s.changeRecords.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Change Targets ────────────────────────────────────────────────────

  async getChangeTargets(changeId: string) {
    return db
      .select()
      .from(s.changeTargets)
      .where(
        and(
          eq(s.changeTargets.changeId, changeId),
          eq(s.changeTargets.tenantId, this.tenantId)
        )
      );
  }

  async getChangeTargetById(id: string) {
    const [row] = await db
      .select()
      .from(s.changeTargets)
      .where(
        and(
          eq(s.changeTargets.id, id),
          eq(s.changeTargets.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createChangeTarget(
    data: Omit<s.ChangeTarget, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.changeTargets)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Patch Ops ─────────────────────────────────────────────────────────

  async getChangePatchOps(changeId: string) {
    return db
      .select()
      .from(s.patchOps)
      .where(
        and(
          eq(s.patchOps.changeId, changeId),
          eq(s.patchOps.tenantId, this.tenantId)
        )
      );
  }

  async getPatchOpById(id: string) {
    const [row] = await db
      .select()
      .from(s.patchOps)
      .where(
        and(eq(s.patchOps.id, id), eq(s.patchOps.tenantId, this.tenantId))
      )
      .limit(1);
    return row;
  }

  async createPatchOp(
    data: Omit<
      s.PatchOp,
      "id" | "tenantId" | "createdAt" | "previousSnapshot" | "executedAt"
    >
  ) {
    const [row] = await db
      .insert(s.patchOps)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async deletePatchOp(id: string) {
    const result = await db
      .delete(s.patchOps)
      .where(
        and(eq(s.patchOps.id, id), eq(s.patchOps.tenantId, this.tenantId))
      )
      .returning();
    return result.length > 0;
  }

  async stampPatchOp(id: string, previousSnapshot: unknown, executedAt: Date) {
    const [row] = await db
      .update(s.patchOps)
      .set({ previousSnapshot, executedAt })
      .where(
        and(eq(s.patchOps.id, id), eq(s.patchOps.tenantId, this.tenantId))
      )
      .returning();
    return row;
  }

  // ─── Snapshots ─────────────────────────────────────────────────────────

  async getSnapshot(changeId: string, recordTypeKey: string) {
    const [row] = await db
      .select()
      .from(s.recordTypeSnapshots)
      .where(
        and(
          eq(s.recordTypeSnapshots.changeId, changeId),
          eq(s.recordTypeSnapshots.recordTypeKey, recordTypeKey),
          eq(s.recordTypeSnapshots.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createSnapshot(
    data: Omit<s.RecordTypeSnapshot, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.recordTypeSnapshots)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Record Instances ──────────────────────────────────────────────────

  async getRecordInstances(recordTypeId: string) {
    return db
      .select()
      .from(s.recordInstances)
      .where(
        and(
          eq(s.recordInstances.recordTypeId, recordTypeId),
          eq(s.recordInstances.tenantId, this.tenantId)
        )
      );
  }

  async getRecordInstanceById(id: string) {
    const [row] = await db
      .select()
      .from(s.recordInstances)
      .where(
        and(
          eq(s.recordInstances.id, id),
          eq(s.recordInstances.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createRecordInstance(
    data: Omit<
      s.RecordInstance,
      "id" | "tenantId" | "createdAt" | "updatedAt"
    >
  ) {
    const [row] = await db
      .insert(s.recordInstances)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateRecordInstance(
    id: string,
    data: Partial<
      Pick<s.RecordInstance, "data" | "status" | "assignedTo" | "slaDeadline">
    >
  ) {
    const [row] = await db
      .update(s.recordInstances)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(s.recordInstances.id, id),
          eq(s.recordInstances.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Workflow Definitions ──────────────────────────────────────────────

  async getWorkflowDefinitions() {
    return db
      .select()
      .from(s.workflowDefinitions)
      .where(eq(s.workflowDefinitions.tenantId, this.tenantId));
  }

  async getWorkflowDefinitionById(id: string) {
    const [row] = await db
      .select()
      .from(s.workflowDefinitions)
      .where(
        and(
          eq(s.workflowDefinitions.id, id),
          eq(s.workflowDefinitions.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createWorkflowDefinition(
    data: Omit<
      s.WorkflowDefinition,
      "id" | "tenantId" | "createdAt" | "updatedAt" | "status"
    >
  ) {
    const [row] = await db
      .insert(s.workflowDefinitions)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Workflow Steps ────────────────────────────────────────────────────

  async getWorkflowSteps(workflowDefinitionId: string) {
    return db
      .select()
      .from(s.workflowSteps)
      .where(
        and(
          eq(s.workflowSteps.workflowDefinitionId, workflowDefinitionId),
          eq(s.workflowSteps.tenantId, this.tenantId)
        )
      );
  }

  async createWorkflowStep(
    data: Omit<s.WorkflowStep, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.workflowSteps)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Workflow Executions ───────────────────────────────────────────────

  async getWorkflowExecutions(workflowDefinitionId: string) {
    return db
      .select()
      .from(s.workflowExecutions)
      .where(
        and(
          eq(
            s.workflowExecutions.workflowDefinitionId,
            workflowDefinitionId
          ),
          eq(s.workflowExecutions.tenantId, this.tenantId)
        )
      );
  }

  async getWorkflowExecutionById(id: string) {
    const [row] = await db
      .select()
      .from(s.workflowExecutions)
      .where(
        and(
          eq(s.workflowExecutions.id, id),
          eq(s.workflowExecutions.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createWorkflowExecution(
    data: Omit<
      s.WorkflowExecution,
      "id" | "tenantId" | "createdAt" | "updatedAt"
    >
  ) {
    const [row] = await db
      .insert(s.workflowExecutions)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateWorkflowExecution(
    id: string,
    data: Partial<Pick<s.WorkflowExecution, "status" | "currentStepIndex">>
  ) {
    const [row] = await db
      .update(s.workflowExecutions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(s.workflowExecutions.id, id),
          eq(s.workflowExecutions.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Workflow Execution Steps ──────────────────────────────────────────

  async getWorkflowExecutionSteps(executionId: string) {
    return db
      .select()
      .from(s.workflowExecutionSteps)
      .where(
        and(
          eq(s.workflowExecutionSteps.executionId, executionId),
          eq(s.workflowExecutionSteps.tenantId, this.tenantId)
        )
      );
  }

  async createWorkflowExecutionStep(
    data: Omit<s.WorkflowExecutionStep, "id" | "tenantId">
  ) {
    const [row] = await db
      .insert(s.workflowExecutionSteps)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateWorkflowExecutionStep(
    id: string,
    data: Partial<
      Pick<s.WorkflowExecutionStep, "status" | "result" | "completedAt">
    >
  ) {
    const [row] = await db
      .update(s.workflowExecutionSteps)
      .set(data)
      .where(
        and(
          eq(s.workflowExecutionSteps.id, id),
          eq(s.workflowExecutionSteps.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Workflow Execution Intents ────────────────────────────────────────

  async getWorkflowExecutionIntentByKey(idempotencyKey: string) {
    const [row] = await db
      .select()
      .from(s.workflowExecutionIntents)
      .where(
        and(
          eq(s.workflowExecutionIntents.idempotencyKey, idempotencyKey),
          eq(s.workflowExecutionIntents.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createWorkflowExecutionIntent(
    data: Omit<s.WorkflowExecutionIntent, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.workflowExecutionIntents)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateWorkflowExecutionIntent(
    id: string,
    data: Partial<
      Pick<s.WorkflowExecutionIntent, "status" | "executionId">
    >
  ) {
    const [row] = await db
      .update(s.workflowExecutionIntents)
      .set(data)
      .where(
        and(
          eq(s.workflowExecutionIntents.id, id),
          eq(s.workflowExecutionIntents.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Triggers ──────────────────────────────────────────────────────────

  async getTriggers() {
    return db
      .select()
      .from(s.triggers)
      .where(eq(s.triggers.tenantId, this.tenantId));
  }

  async getTriggerById(id: string) {
    const [row] = await db
      .select()
      .from(s.triggers)
      .where(
        and(eq(s.triggers.id, id), eq(s.triggers.tenantId, this.tenantId))
      )
      .limit(1);
    return row;
  }

  async createTrigger(
    data: Omit<s.Trigger, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.triggers)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── RBAC ──────────────────────────────────────────────────────────────

  async getRoles() {
    return db
      .select()
      .from(s.rbacRoles)
      .where(eq(s.rbacRoles.tenantId, this.tenantId));
  }

  async getRoleByName(name: string) {
    const [row] = await db
      .select()
      .from(s.rbacRoles)
      .where(
        and(
          eq(s.rbacRoles.name, name),
          eq(s.rbacRoles.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createRole(
    data: Omit<s.RbacRole, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.rbacRoles)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async getUserRoles(userId: string) {
    return db
      .select()
      .from(s.rbacUserRoles)
      .where(
        and(
          eq(s.rbacUserRoles.userId, userId),
          eq(s.rbacUserRoles.tenantId, this.tenantId)
        )
      );
  }

  async createUserRole(
    data: Omit<s.RbacUserRole, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.rbacUserRoles)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async createAuditLogEntry(data: {
    actor: string;
    action: string;
    permission?: string;
    granted: boolean;
    metadata?: unknown;
  }) {
    await db
      .insert(s.rbacAuditLog)
      .values({ ...data, tenantId: this.tenantId });
  }

  // ─── Graph Package Installs ────────────────────────────────────────────

  async getGraphPackageInstalls() {
    return db
      .select()
      .from(s.graphPackageInstalls)
      .where(eq(s.graphPackageInstalls.tenantId, this.tenantId));
  }

  async getGraphPackageInstallByKey(packageKey: string) {
    const [row] = await db
      .select()
      .from(s.graphPackageInstalls)
      .where(
        and(
          eq(s.graphPackageInstalls.packageKey, packageKey),
          eq(s.graphPackageInstalls.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createGraphPackageInstall(
    data: Omit<s.GraphPackageInstall, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.graphPackageInstalls)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Environments ──────────────────────────────────────────────────────

  async getEnvironments() {
    return db
      .select()
      .from(s.environments)
      .where(eq(s.environments.tenantId, this.tenantId));
  }

  async getEnvironmentBySlug(slug: string) {
    const [row] = await db
      .select()
      .from(s.environments)
      .where(
        and(
          eq(s.environments.slug, slug),
          eq(s.environments.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createEnvironment(
    data: Omit<s.Environment, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.environments)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Promotion Intents ─────────────────────────────────────────────────

  async getPromotionIntents() {
    return db
      .select()
      .from(s.promotionIntents)
      .where(eq(s.promotionIntents.tenantId, this.tenantId));
  }

  async getPromotionIntentById(id: string) {
    const [row] = await db
      .select()
      .from(s.promotionIntents)
      .where(
        and(
          eq(s.promotionIntents.id, id),
          eq(s.promotionIntents.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createPromotionIntent(
    data: Omit<
      s.PromotionIntent,
      "id" | "tenantId" | "createdAt" | "updatedAt"
    >
  ) {
    const [row] = await db
      .insert(s.promotionIntents)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updatePromotionIntent(
    id: string,
    data: Partial<
      Pick<s.PromotionIntent, "status" | "diff" | "approvedBy">
    >
  ) {
    const [row] = await db
      .update(s.promotionIntents)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(s.promotionIntents.id, id),
          eq(s.promotionIntents.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Vibe Drafts ──────────────────────────────────────────────────────

  async getVibeDrafts() {
    return db
      .select()
      .from(s.vibePackageDrafts)
      .where(eq(s.vibePackageDrafts.tenantId, this.tenantId));
  }

  async getVibeDraftById(id: string) {
    const [row] = await db
      .select()
      .from(s.vibePackageDrafts)
      .where(
        and(
          eq(s.vibePackageDrafts.id, id),
          eq(s.vibePackageDrafts.tenantId, this.tenantId)
        )
      )
      .limit(1);
    return row;
  }

  async createVibeDraft(
    data: Omit<
      s.VibePackageDraft,
      "id" | "tenantId" | "createdAt" | "updatedAt" | "status"
    >
  ) {
    const [row] = await db
      .insert(s.vibePackageDrafts)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  async updateVibeDraft(
    id: string,
    data: Partial<
      Pick<s.VibePackageDraft, "name" | "prompt" | "packageJson" | "status">
    >
  ) {
    const [row] = await db
      .update(s.vibePackageDrafts)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(s.vibePackageDrafts.id, id),
          eq(s.vibePackageDrafts.tenantId, this.tenantId)
        )
      )
      .returning();
    return row;
  }

  // ─── Vibe Draft Versions ───────────────────────────────────────────────

  async getVibeDraftVersions(draftId: string) {
    return db
      .select()
      .from(s.vibePackageDraftVersions)
      .where(
        and(
          eq(s.vibePackageDraftVersions.draftId, draftId),
          eq(s.vibePackageDraftVersions.tenantId, this.tenantId)
        )
      );
  }

  async createVibeDraftVersion(
    data: Omit<s.VibePackageDraftVersion, "id" | "tenantId" | "createdAt">
  ) {
    const [row] = await db
      .insert(s.vibePackageDraftVersions)
      .values({ ...data, tenantId: this.tenantId })
      .returning();
    return row;
  }

  // ─── Telemetry ─────────────────────────────────────────────────────────

  async createTelemetryEvent(data: {
    eventType: string;
    entityType?: string;
    entityId?: string;
    actor?: string;
    payload?: unknown;
  }) {
    await db
      .insert(s.executionTelemetryEvents)
      .values({ ...data, tenantId: this.tenantId });
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function createDrizzleTenantStorage(
  ctx: TenantContext
): ITenantStorage {
  return new DrizzleTenantStorage(ctx);
}
