import type {
  TenantContext,
  Project,
  RecordType,
  ChangeRecord,
  ChangeTarget,
  PatchOp,
  RecordTypeSnapshot,
  RecordInstance,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowExecution,
  WorkflowExecutionStep,
  WorkflowExecutionIntent,
  Trigger,
  RbacRole,
  RbacUserRole,
  GraphPackageInstall,
  Environment,
  PromotionIntent,
  VibePackageDraft,
  VibePackageDraftVersion,
  Agent,
  AgentExecutionLog,
  ExecutionTelemetryEvent,
} from "../shared/schema.js";

/**
 * Tenant-scoped storage interface.
 * T2: Every query is scoped by `WHERE tenant_id = ctx.tenantId`.
 * There is no method to query across tenants through this interface.
 */
export interface ITenantStorage {
  // ─── Projects ───────────────────────────────────────────────────────
  getProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  createProject(data: Omit<Project, "id" | "tenantId" | "createdAt">): Promise<Project>;

  // ─── Record Types ───────────────────────────────────────────────────
  getRecordTypes(): Promise<RecordType[]>;
  getRecordTypeById(id: string): Promise<RecordType | undefined>;
  getRecordTypeByKey(key: string): Promise<RecordType | undefined>;
  getRecordTypeByKeyAndProject(key: string, projectId: string): Promise<RecordType | undefined>;
  getRecordTypeByName(name: string): Promise<RecordType | undefined>;
  createRecordType(
    data: Omit<RecordType, "id" | "tenantId" | "createdAt" | "updatedAt" | "version" | "status">
  ): Promise<RecordType>;
  updateRecordTypeSchema(id: string, schema: unknown): Promise<RecordType | undefined>;
  updateRecordTypeStatus(id: string, status: string): Promise<RecordType | undefined>;

  // ─── Change Records ─────────────────────────────────────────────────
  getChanges(): Promise<ChangeRecord[]>;
  getChangeById(id: string): Promise<ChangeRecord | undefined>;
  getChangesByProject(projectId: string): Promise<ChangeRecord[]>;
  createChange(
    data: Omit<ChangeRecord, "id" | "tenantId" | "createdAt" | "updatedAt" | "status">
  ): Promise<ChangeRecord>;
  updateChangeStatus(id: string, status: string): Promise<ChangeRecord | undefined>;

  // ─── Change Targets ─────────────────────────────────────────────────
  getChangeTargets(changeId: string): Promise<ChangeTarget[]>;
  getChangeTargetById(id: string): Promise<ChangeTarget | undefined>;
  createChangeTarget(
    data: Omit<ChangeTarget, "id" | "tenantId" | "createdAt">
  ): Promise<ChangeTarget>;

  // ─── Patch Ops ──────────────────────────────────────────────────────
  getChangePatchOps(changeId: string): Promise<PatchOp[]>;
  getPatchOpById(id: string): Promise<PatchOp | undefined>;
  createPatchOp(
    data: Omit<PatchOp, "id" | "tenantId" | "createdAt" | "previousSnapshot" | "executedAt">
  ): Promise<PatchOp>;
  deletePatchOp(id: string): Promise<boolean>;
  stampPatchOp(
    id: string,
    previousSnapshot: unknown,
    executedAt: Date
  ): Promise<PatchOp | undefined>;

  // ─── Snapshots ──────────────────────────────────────────────────────
  getSnapshot(
    changeId: string,
    recordTypeKey: string
  ): Promise<RecordTypeSnapshot | undefined>;
  createSnapshot(
    data: Omit<RecordTypeSnapshot, "id" | "tenantId" | "createdAt">
  ): Promise<RecordTypeSnapshot>;

  // ─── Record Instances ───────────────────────────────────────────────
  getRecordInstances(recordTypeId: string): Promise<RecordInstance[]>;
  getRecordInstanceById(id: string): Promise<RecordInstance | undefined>;
  createRecordInstance(
    data: Omit<RecordInstance, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<RecordInstance>;
  updateRecordInstance(
    id: string,
    data: Partial<Pick<RecordInstance, "data" | "status" | "assignedTo" | "slaDeadline">>
  ): Promise<RecordInstance | undefined>;

  // ─── Workflow Definitions ───────────────────────────────────────────
  getWorkflowDefinitions(): Promise<WorkflowDefinition[]>;
  getWorkflowDefinitionById(id: string): Promise<WorkflowDefinition | undefined>;
  createWorkflowDefinition(
    data: Omit<WorkflowDefinition, "id" | "tenantId" | "createdAt" | "updatedAt" | "status">
  ): Promise<WorkflowDefinition>;

  // ─── Workflow Steps ─────────────────────────────────────────────────
  getWorkflowSteps(workflowDefinitionId: string): Promise<WorkflowStep[]>;
  createWorkflowStep(
    data: Omit<WorkflowStep, "id" | "tenantId" | "createdAt">
  ): Promise<WorkflowStep>;

  // ─── Workflow Executions ────────────────────────────────────────────
  getWorkflowExecutions(workflowDefinitionId: string): Promise<WorkflowExecution[]>;
  getWorkflowExecutionById(id: string): Promise<WorkflowExecution | undefined>;
  createWorkflowExecution(
    data: Omit<WorkflowExecution, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<WorkflowExecution>;
  updateWorkflowExecution(
    id: string,
    data: Partial<Pick<WorkflowExecution, "status" | "currentStepIndex">>
  ): Promise<WorkflowExecution | undefined>;

  // ─── Workflow Execution Steps ───────────────────────────────────────
  getWorkflowExecutionSteps(executionId: string): Promise<WorkflowExecutionStep[]>;
  createWorkflowExecutionStep(
    data: Omit<WorkflowExecutionStep, "id" | "tenantId">
  ): Promise<WorkflowExecutionStep>;
  updateWorkflowExecutionStep(
    id: string,
    data: Partial<Pick<WorkflowExecutionStep, "status" | "result" | "completedAt">>
  ): Promise<WorkflowExecutionStep | undefined>;

  // ─── Workflow Execution Intents ─────────────────────────────────────
  getWorkflowExecutionIntentByKey(
    idempotencyKey: string
  ): Promise<WorkflowExecutionIntent | undefined>;
  createWorkflowExecutionIntent(
    data: Omit<WorkflowExecutionIntent, "id" | "tenantId" | "createdAt">
  ): Promise<WorkflowExecutionIntent>;
  updateWorkflowExecutionIntent(
    id: string,
    data: Partial<Pick<WorkflowExecutionIntent, "status" | "executionId">>
  ): Promise<WorkflowExecutionIntent | undefined>;

  // ─── Triggers ───────────────────────────────────────────────────────
  getTriggers(): Promise<Trigger[]>;
  getTriggerById(id: string): Promise<Trigger | undefined>;
  createTrigger(data: Omit<Trigger, "id" | "tenantId" | "createdAt">): Promise<Trigger>;

  // ─── RBAC ───────────────────────────────────────────────────────────
  getRoles(): Promise<RbacRole[]>;
  getRoleByName(name: string): Promise<RbacRole | undefined>;
  createRole(data: Omit<RbacRole, "id" | "tenantId" | "createdAt">): Promise<RbacRole>;
  getUserRoles(userId: string): Promise<RbacUserRole[]>;
  createUserRole(
    data: Omit<RbacUserRole, "id" | "tenantId" | "createdAt">
  ): Promise<RbacUserRole>;
  createAuditLogEntry(data: {
    actor: string;
    action: string;
    permission?: string;
    granted: boolean;
    metadata?: unknown;
  }): Promise<void>;

  // ─── Graph Package Installs ─────────────────────────────────────────
  getGraphPackageInstalls(): Promise<GraphPackageInstall[]>;
  getGraphPackageInstallByKey(
    packageKey: string
  ): Promise<GraphPackageInstall | undefined>;
  createGraphPackageInstall(
    data: Omit<GraphPackageInstall, "id" | "tenantId" | "createdAt">
  ): Promise<GraphPackageInstall>;

  // ─── Environments ───────────────────────────────────────────────────
  getEnvironments(): Promise<Environment[]>;
  getEnvironmentBySlug(slug: string): Promise<Environment | undefined>;
  createEnvironment(
    data: Omit<Environment, "id" | "tenantId" | "createdAt">
  ): Promise<Environment>;

  // ─── Promotion Intents ──────────────────────────────────────────────
  getPromotionIntents(): Promise<PromotionIntent[]>;
  getPromotionIntentById(id: string): Promise<PromotionIntent | undefined>;
  createPromotionIntent(
    data: Omit<PromotionIntent, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<PromotionIntent>;
  updatePromotionIntent(
    id: string,
    data: Partial<Pick<PromotionIntent, "status" | "diff" | "approvedBy">>
  ): Promise<PromotionIntent | undefined>;

  // ─── Vibe Drafts ───────────────────────────────────────────────────
  getVibeDrafts(): Promise<VibePackageDraft[]>;
  getVibeDraftById(id: string): Promise<VibePackageDraft | undefined>;
  createVibeDraft(
    data: Omit<VibePackageDraft, "id" | "tenantId" | "createdAt" | "updatedAt" | "status">
  ): Promise<VibePackageDraft>;
  updateVibeDraft(
    id: string,
    data: Partial<Pick<VibePackageDraft, "name" | "prompt" | "packageJson" | "status">>
  ): Promise<VibePackageDraft | undefined>;

  // ─── Vibe Draft Versions ────────────────────────────────────────────
  getVibeDraftVersions(draftId: string): Promise<VibePackageDraftVersion[]>;
  createVibeDraftVersion(
    data: Omit<VibePackageDraftVersion, "id" | "tenantId" | "createdAt">
  ): Promise<VibePackageDraftVersion>;

  // ─── Agents ─────────────────────────────────────────────────────────
  getAgents(): Promise<Agent[]>;
  getAgentById(id: string): Promise<Agent | undefined>;
  createAgent(
    data: Omit<Agent, "id" | "tenantId" | "createdAt" | "updatedAt" | "status" | "version" | "lastExecutionAt" | "lastExecutionStatus" | "boundPackageInstallId">
  ): Promise<Agent>;
  updateAgent(
    id: string,
    data: Partial<Pick<Agent, "name" | "description" | "status" | "subscribedEvents" | "executionPolicy" | "version" | "lastExecutionAt" | "lastExecutionStatus" | "boundPackageInstallId">>
  ): Promise<Agent | undefined>;

  // ─── Agent Execution Logs ──────────────────────────────────────────
  getAgentExecutionLogs(agentId: string): Promise<AgentExecutionLog[]>;
  createAgentExecutionLog(
    data: Omit<AgentExecutionLog, "id" | "tenantId" | "createdAt">
  ): Promise<AgentExecutionLog>;

  // ─── Telemetry ──────────────────────────────────────────────────────
  getTelemetryEvents(since?: Date): Promise<ExecutionTelemetryEvent[]>;
  createTelemetryEvent(data: {
    eventType: string;
    entityType?: string;
    entityId?: string;
    actor?: string;
    payload?: unknown;
  }): Promise<void>;
}

/**
 * Factory: returns a tenant-scoped storage instance.
 * Implementations must ensure all queries include `WHERE tenant_id = ctx.tenantId`.
 */
export type TenantStorageFactory = (ctx: TenantContext) => ITenantStorage;

let _factory: TenantStorageFactory | null = null;

export function setTenantStorageFactory(factory: TenantStorageFactory): void {
  _factory = factory;
}

export function getTenantStorage(ctx: TenantContext): ITenantStorage {
  if (!_factory) {
    throw new Error(
      "Tenant storage factory not initialized. Call setTenantStorageFactory() first."
    );
  }
  return _factory(ctx);
}
