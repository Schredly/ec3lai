import type {
  TenantContext,
  WorkflowDefinition,
  WorkflowStep,
} from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { ServiceError } from "./recordTypeService.js";

export async function getWorkflowDefinitions(
  ctx: TenantContext
): Promise<WorkflowDefinition[]> {
  const storage = getTenantStorage(ctx);
  return storage.getWorkflowDefinitions();
}

export async function getWorkflowDefinitionById(
  ctx: TenantContext,
  id: string
): Promise<WorkflowDefinition | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getWorkflowDefinitionById(id);
}

export async function createWorkflowDefinition(
  ctx: TenantContext,
  data: {
    name: string;
    description?: string;
    projectId: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
  }
): Promise<WorkflowDefinition> {
  const storage = getTenantStorage(ctx);

  // Validate project exists
  const project = await storage.getProjectById(data.projectId);
  if (!project) {
    throw new ServiceError("Project not found", 404);
  }

  return storage.createWorkflowDefinition({
    name: data.name,
    description: data.description ?? null,
    projectId: data.projectId,
    triggerType: data.triggerType ?? null,
    triggerConfig: data.triggerConfig ?? {},
  });
}

export async function createWorkflowStep(
  ctx: TenantContext,
  workflowDefinitionId: string,
  data: {
    stepType: string;
    config?: Record<string, unknown>;
    orderIndex?: number;
  }
): Promise<WorkflowStep> {
  const storage = getTenantStorage(ctx);

  const wf = await storage.getWorkflowDefinitionById(workflowDefinitionId);
  if (!wf) {
    throw new ServiceError("Workflow definition not found", 404);
  }

  return storage.createWorkflowStep({
    workflowDefinitionId,
    stepType: data.stepType,
    config: data.config ?? {},
    orderIndex: data.orderIndex ?? 0,
  });
}

export async function getWorkflowSteps(
  ctx: TenantContext,
  workflowDefinitionId: string
): Promise<WorkflowStep[]> {
  const storage = getTenantStorage(ctx);
  return storage.getWorkflowSteps(workflowDefinitionId);
}
