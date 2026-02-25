import type { TenantContext } from "../../../shared/schema.js";
import type { ITenantStorage } from "../../tenantStorage.js";
import { vi } from "vitest";

export function createMockCtx(overrides?: Partial<TenantContext>): TenantContext {
  return {
    tenantId: "tenant-uuid-1",
    userId: "user-1",
    actorType: "user",
    source: "header",
    ...overrides,
  };
}

export function createAgentCtx(): TenantContext {
  return {
    tenantId: "tenant-uuid-1",
    agentId: "agent-1",
    actorType: "agent",
    source: "header",
  };
}

export function createSystemCtx(): TenantContext {
  return {
    tenantId: "tenant-uuid-1",
    actorType: "system",
    source: "header",
  };
}

export function createMockStorage(overrides?: Partial<ITenantStorage>): ITenantStorage {
  return {
    getProjects: vi.fn().mockResolvedValue([]),
    getProjectById: vi.fn().mockResolvedValue(undefined),
    createProject: vi.fn().mockImplementation(async (data) => ({
      id: "project-1",
      tenantId: "tenant-uuid-1",
      createdAt: new Date(),
      ...data,
    })),

    getRecordTypes: vi.fn().mockResolvedValue([]),
    getRecordTypeById: vi.fn().mockResolvedValue(undefined),
    getRecordTypeByKey: vi.fn().mockResolvedValue(undefined),
    getRecordTypeByKeyAndProject: vi.fn().mockResolvedValue(undefined),
    getRecordTypeByName: vi.fn().mockResolvedValue(undefined),
    createRecordType: vi.fn().mockImplementation(async (data) => ({
      id: "rt-1",
      tenantId: "tenant-uuid-1",
      version: 1,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    updateRecordTypeSchema: vi.fn().mockImplementation(async (id, schema) => ({
      id,
      tenantId: "tenant-uuid-1",
      schema,
      updatedAt: new Date(),
    })),
    updateRecordTypeStatus: vi.fn().mockImplementation(async (id, status) => ({
      id,
      tenantId: "tenant-uuid-1",
      status,
    })),

    getChanges: vi.fn().mockResolvedValue([]),
    getChangeById: vi.fn().mockResolvedValue(undefined),
    getChangesByProject: vi.fn().mockResolvedValue([]),
    createChange: vi.fn().mockImplementation(async (data) => ({
      id: "change-1",
      tenantId: "tenant-uuid-1",
      status: "Draft",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    updateChangeStatus: vi.fn().mockImplementation(async (id, status) => ({
      id,
      tenantId: "tenant-uuid-1",
      status,
      updatedAt: new Date(),
    })),

    getChangeTargets: vi.fn().mockResolvedValue([]),
    getChangeTargetById: vi.fn().mockResolvedValue(undefined),
    createChangeTarget: vi.fn().mockImplementation(async (data) => ({
      id: "target-1",
      tenantId: "tenant-uuid-1",
      createdAt: new Date(),
      ...data,
    })),

    getChangePatchOps: vi.fn().mockResolvedValue([]),
    getPatchOpById: vi.fn().mockResolvedValue(undefined),
    createPatchOp: vi.fn().mockImplementation(async (data) => ({
      id: "op-1",
      tenantId: "tenant-uuid-1",
      previousSnapshot: null,
      executedAt: null,
      createdAt: new Date(),
      ...data,
    })),
    deletePatchOp: vi.fn().mockResolvedValue(true),
    stampPatchOp: vi.fn().mockImplementation(async (id, snapshot, at) => ({
      id,
      previousSnapshot: snapshot,
      executedAt: at,
    })),

    getSnapshot: vi.fn().mockResolvedValue(undefined),
    createSnapshot: vi.fn().mockImplementation(async (data) => ({
      id: "snapshot-1",
      tenantId: "tenant-uuid-1",
      createdAt: new Date(),
      ...data,
    })),

    getRecordInstances: vi.fn().mockResolvedValue([]),
    getRecordInstanceById: vi.fn().mockResolvedValue(undefined),
    createRecordInstance: vi.fn().mockResolvedValue({} as any),
    updateRecordInstance: vi.fn().mockResolvedValue(undefined),

    getWorkflowDefinitions: vi.fn().mockResolvedValue([]),
    getWorkflowDefinitionById: vi.fn().mockResolvedValue(undefined),
    createWorkflowDefinition: vi.fn().mockResolvedValue({} as any),

    getWorkflowSteps: vi.fn().mockResolvedValue([]),
    createWorkflowStep: vi.fn().mockResolvedValue({} as any),

    getWorkflowExecutions: vi.fn().mockResolvedValue([]),
    getWorkflowExecutionById: vi.fn().mockResolvedValue(undefined),
    createWorkflowExecution: vi.fn().mockResolvedValue({} as any),
    updateWorkflowExecution: vi.fn().mockResolvedValue(undefined),

    getWorkflowExecutionSteps: vi.fn().mockResolvedValue([]),
    createWorkflowExecutionStep: vi.fn().mockResolvedValue({} as any),
    updateWorkflowExecutionStep: vi.fn().mockResolvedValue(undefined),

    getWorkflowExecutionIntentByKey: vi.fn().mockResolvedValue(undefined),
    createWorkflowExecutionIntent: vi.fn().mockResolvedValue({} as any),
    updateWorkflowExecutionIntent: vi.fn().mockResolvedValue(undefined),

    getTriggers: vi.fn().mockResolvedValue([]),
    getTriggerById: vi.fn().mockResolvedValue(undefined),
    createTrigger: vi.fn().mockResolvedValue({} as any),

    getRoles: vi.fn().mockResolvedValue([]),
    getRoleByName: vi.fn().mockResolvedValue(undefined),
    createRole: vi.fn().mockResolvedValue({} as any),
    getUserRoles: vi.fn().mockResolvedValue([]),
    createUserRole: vi.fn().mockResolvedValue({} as any),
    createAuditLogEntry: vi.fn().mockResolvedValue(undefined),

    getGraphPackageInstalls: vi.fn().mockResolvedValue([]),
    getGraphPackageInstallByKey: vi.fn().mockResolvedValue(undefined),
    createGraphPackageInstall: vi.fn().mockResolvedValue({} as any),

    getEnvironments: vi.fn().mockResolvedValue([]),
    getEnvironmentBySlug: vi.fn().mockResolvedValue(undefined),
    createEnvironment: vi.fn().mockResolvedValue({} as any),

    getPromotionIntents: vi.fn().mockResolvedValue([]),
    getPromotionIntentById: vi.fn().mockResolvedValue(undefined),
    createPromotionIntent: vi.fn().mockResolvedValue({} as any),
    updatePromotionIntent: vi.fn().mockResolvedValue(undefined),

    getVibeDrafts: vi.fn().mockResolvedValue([]),
    getVibeDraftById: vi.fn().mockResolvedValue(undefined),
    createVibeDraft: vi.fn().mockResolvedValue({} as any),
    updateVibeDraft: vi.fn().mockResolvedValue(undefined),

    getVibeDraftVersions: vi.fn().mockResolvedValue([]),
    createVibeDraftVersion: vi.fn().mockResolvedValue({} as any),

    getTelemetryEvents: vi.fn().mockResolvedValue([]),
    createTelemetryEvent: vi.fn().mockResolvedValue(undefined),

    getAgents: vi.fn().mockResolvedValue([]),
    getAgentById: vi.fn().mockResolvedValue(undefined),
    createAgent: vi.fn().mockImplementation(async (data) => ({
      id: "agent-1",
      tenantId: "tenant-uuid-1",
      status: "inactive",
      boundPackageInstallId: null,
      version: 1,
      lastExecutionAt: null,
      lastExecutionStatus: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    updateAgent: vi.fn().mockResolvedValue(undefined),

    getAgentExecutionLogs: vi.fn().mockResolvedValue([]),
    createAgentExecutionLog: vi.fn().mockResolvedValue({} as any),

    ...overrides,
  };
}
