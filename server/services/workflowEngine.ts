import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent, subscribe } from "./domainEventService.js";
import { ServiceError } from "./recordTypeService.js";

// Subscribe to SLA breach events
subscribe("record.sla.breached", (_ctx, event) => {
  console.log(`[workflow-engine] SLA breached for ${event.entityId}`);
});

/**
 * Execute a workflow: runs steps in order with approval gating.
 */
export async function executeWorkflow(
  ctx: TenantContext,
  workflowDefinitionId: string,
  triggerContext: Record<string, unknown> = {}
): Promise<{ executionId: string; status: string }> {
  const storage = getTenantStorage(ctx);

  const wf = await storage.getWorkflowDefinitionById(workflowDefinitionId);
  if (!wf) {
    throw new ServiceError("Workflow definition not found", 404);
  }

  const steps = await storage.getWorkflowSteps(workflowDefinitionId);

  // Create execution
  const execution = await storage.createWorkflowExecution({
    workflowDefinitionId,
    status: "running",
    triggeredBy: ctx.userId ?? ctx.agentId ?? "system",
    context: triggerContext,
    currentStepIndex: 0,
  });

  emitDomainEvent(ctx, {
    type: "workflow.intent.started",
    status: "running",
    entityId: execution.id,
    workflowId: workflowDefinitionId,
  });

  // Execute steps sequentially
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    const execStep = await storage.createWorkflowExecutionStep({
      executionId: execution.id,
      stepId: step.id,
      status: "pending",
      result: null,
      startedAt: null,
      completedAt: null,
    });

    // Check if step requires approval
    if (step.stepType === "approval") {
      await storage.updateWorkflowExecution(execution.id, {
        status: "paused",
        currentStepIndex: i,
      });
      await storage.updateWorkflowExecutionStep(execStep.id, {
        status: "awaiting_approval",
      });

      return { executionId: execution.id, status: "paused" };
    }

    // Execute the step
    await storage.updateWorkflowExecutionStep(execStep.id, {
      status: "completed",
      completedAt: new Date(),
    });
  }

  // All steps completed
  await storage.updateWorkflowExecution(execution.id, {
    status: "completed",
  });

  emitDomainEvent(ctx, {
    type: "workflow.intent.completed",
    status: "completed",
    entityId: execution.id,
    workflowId: workflowDefinitionId,
  });

  return { executionId: execution.id, status: "completed" };
}

/**
 * Resume a paused workflow execution (after approval).
 */
export async function resumeWorkflow(
  ctx: TenantContext,
  executionId: string
): Promise<{ executionId: string; status: string }> {
  const storage = getTenantStorage(ctx);

  const execution = await storage.getWorkflowExecutionById(executionId);
  if (!execution) {
    throw new ServiceError("Workflow execution not found", 404);
  }
  if (execution.status !== "paused") {
    throw new ServiceError("Workflow execution is not paused", 400);
  }

  const steps = await storage.getWorkflowSteps(execution.workflowDefinitionId);
  const execSteps = await storage.getWorkflowExecutionSteps(executionId);

  // Find the awaiting approval step and complete it
  const awaitingStep = execSteps.find(
    (s) => s.status === "awaiting_approval"
  );
  if (awaitingStep) {
    await storage.updateWorkflowExecutionStep(awaitingStep.id, {
      status: "completed",
      completedAt: new Date(),
    });
  }

  // Resume from the next step
  const nextIndex = (execution.currentStepIndex ?? 0) + 1;
  await storage.updateWorkflowExecution(executionId, {
    status: "running",
    currentStepIndex: nextIndex,
  });

  // Continue executing remaining steps
  for (let i = nextIndex; i < steps.length; i++) {
    const step = steps[i];

    const execStep = await storage.createWorkflowExecutionStep({
      executionId,
      stepId: step.id,
      status: "pending",
      result: null,
      startedAt: null,
      completedAt: null,
    });

    if (step.stepType === "approval") {
      await storage.updateWorkflowExecution(executionId, {
        status: "paused",
        currentStepIndex: i,
      });
      await storage.updateWorkflowExecutionStep(execStep.id, {
        status: "awaiting_approval",
      });
      return { executionId, status: "paused" };
    }

    await storage.updateWorkflowExecutionStep(execStep.id, {
      status: "completed",
      completedAt: new Date(),
    });
  }

  await storage.updateWorkflowExecution(executionId, {
    status: "completed",
  });

  emitDomainEvent(ctx, {
    type: "workflow.intent.completed",
    status: "completed",
    entityId: executionId,
    workflowId: execution.workflowDefinitionId,
  });

  return { executionId, status: "completed" };
}
