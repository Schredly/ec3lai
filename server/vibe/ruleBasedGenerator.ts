import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";
import { emitDomainEvent } from "../services/domainEventService.js";

/**
 * Rule-based natural language app generator.
 * Parses a prompt into structured entities, workflows, events, and roles
 * without external LLM calls.
 */

interface ParsedIntent {
  appName: string;
  entities: ParsedEntity[];
  workflows: ParsedWorkflow[];
  events: string[];
  roles: string[];
}

interface ParsedEntity {
  key: string;
  name: string;
  fields: { name: string; type: string; required?: boolean }[];
}

interface ParsedWorkflow {
  name: string;
  triggerType: string;
  steps: { stepType: string; config: Record<string, unknown> }[];
}

interface GeneratedApp {
  draftId: string;
  appName: string;
  entities: number;
  workflows: number;
  events: number;
  roles: number;
  packageJson: unknown;
}

// ─── Keyword patterns for entity detection ──────────────────────────────────

const ENTITY_PATTERNS: {
  pattern: RegExp;
  entity: (match: RegExpMatchArray) => ParsedEntity;
}[] = [
  {
    pattern: /\b(employee|staff|worker|personnel)\b/i,
    entity: () => ({
      key: "employee",
      name: "Employee",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true },
        { name: "department", type: "reference" },
        { name: "role", type: "string" },
        { name: "start_date", type: "date" },
        { name: "status", type: "choice" },
      ],
    }),
  },
  {
    pattern: /\b(department|team|group|division)\b/i,
    entity: () => ({
      key: "department",
      name: "Department",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "code", type: "string", required: true },
        { name: "manager", type: "reference" },
      ],
    }),
  },
  {
    pattern: /\b(onboarding|onboard)\b/i,
    entity: () => ({
      key: "onboarding_task",
      name: "Onboarding Task",
      fields: [
        { name: "employee", type: "reference", required: true },
        { name: "task_name", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "assigned_to", type: "reference" },
        { name: "due_date", type: "date" },
        { name: "status", type: "choice" },
      ],
    }),
  },
  {
    pattern: /\b(ticket|issue|bug|support)\b/i,
    entity: () => ({
      key: "ticket",
      name: "Ticket",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "priority", type: "choice" },
        { name: "status", type: "choice" },
        { name: "assigned_to", type: "reference" },
        { name: "category", type: "choice" },
      ],
    }),
  },
  {
    pattern: /\b(request|requisition)\b/i,
    entity: () => ({
      key: "request",
      name: "Request",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "requested_by", type: "reference", required: true },
        { name: "priority", type: "choice" },
        { name: "status", type: "choice" },
      ],
    }),
  },
  {
    pattern: /\b(laptop|equipment|asset|device|hardware)\b/i,
    entity: () => ({
      key: "asset",
      name: "Asset",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "type", type: "choice" },
        { name: "serial_number", type: "string" },
        { name: "assigned_to", type: "reference" },
        { name: "status", type: "choice" },
      ],
    }),
  },
  {
    pattern: /\b(approval|approve)\b/i,
    entity: () => ({
      key: "approval",
      name: "Approval",
      fields: [
        { name: "subject", type: "string", required: true },
        { name: "requested_by", type: "reference", required: true },
        { name: "approver", type: "reference", required: true },
        { name: "status", type: "choice" },
        { name: "notes", type: "text" },
        { name: "decided_at", type: "datetime" },
      ],
    }),
  },
  {
    pattern: /\b(project)\b/i,
    entity: () => ({
      key: "project_task",
      name: "Project Task",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "assigned_to", type: "reference" },
        { name: "due_date", type: "date" },
        { name: "priority", type: "choice" },
        { name: "status", type: "choice" },
      ],
    }),
  },
  {
    pattern: /\b(vendor|supplier)\b/i,
    entity: () => ({
      key: "vendor",
      name: "Vendor",
      fields: [
        { name: "name", type: "string", required: true },
        { name: "contact_email", type: "string" },
        { name: "category", type: "choice" },
        { name: "status", type: "choice" },
        { name: "contract_end", type: "date" },
      ],
    }),
  },
  {
    pattern: /\b(invoice|billing|payment)\b/i,
    entity: () => ({
      key: "invoice",
      name: "Invoice",
      fields: [
        { name: "vendor", type: "reference", required: true },
        { name: "amount", type: "number", required: true },
        { name: "due_date", type: "date", required: true },
        { name: "status", type: "choice" },
        { name: "notes", type: "text" },
      ],
    }),
  },
  {
    pattern: /\b(pto|time.?off|leave|vacation)\b/i,
    entity: () => ({
      key: "pto_request",
      name: "PTO Request",
      fields: [
        { name: "employee", type: "reference", required: true },
        { name: "start_date", type: "date", required: true },
        { name: "end_date", type: "date", required: true },
        { name: "type", type: "choice" },
        { name: "status", type: "choice" },
        { name: "notes", type: "text" },
      ],
    }),
  },
  {
    pattern: /\b(incident|outage)\b/i,
    entity: () => ({
      key: "incident",
      name: "Incident",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "severity", type: "choice", required: true },
        { name: "description", type: "text" },
        { name: "assigned_to", type: "reference" },
        { name: "status", type: "choice" },
        { name: "resolution", type: "text" },
      ],
    }),
  },
];

// ─── Workflow pattern detection ─────────────────────────────────────────────

const WORKFLOW_PATTERNS: {
  pattern: RegExp;
  workflow: () => ParsedWorkflow;
}[] = [
  {
    pattern: /\bapproval\b/i,
    workflow: () => ({
      name: "Approval Workflow",
      triggerType: "record_created",
      steps: [
        { stepType: "notification", config: { message: "New approval requested" } },
        { stepType: "approval", config: { approverField: "approver" } },
        { stepType: "update_field", config: { field: "status", value: "approved" } },
      ],
    }),
  },
  {
    pattern: /\bonboarding\b/i,
    workflow: () => ({
      name: "Onboarding Workflow",
      triggerType: "record_created",
      steps: [
        { stepType: "notification", config: { message: "New employee onboarding started" } },
        { stepType: "create_tasks", config: { template: "onboarding_checklist" } },
        { stepType: "assign", config: { rule: "manager" } },
      ],
    }),
  },
  {
    pattern: /\b(provision|setup|deploy)\b/i,
    workflow: () => ({
      name: "Provisioning Workflow",
      triggerType: "record_created",
      steps: [
        { stepType: "notification", config: { message: "Provisioning request created" } },
        { stepType: "approval", config: { approverField: "manager" } },
        { stepType: "action", config: { type: "provision" } },
      ],
    }),
  },
  {
    pattern: /\b(escalat|sla|breach)\b/i,
    workflow: () => ({
      name: "Escalation Workflow",
      triggerType: "timer_expired",
      steps: [
        { stepType: "notification", config: { message: "SLA breach - escalating" } },
        { stepType: "reassign", config: { rule: "escalation_group" } },
      ],
    }),
  },
  {
    pattern: /\b(notify|notification|alert)\b/i,
    workflow: () => ({
      name: "Notification Workflow",
      triggerType: "record_updated",
      steps: [
        { stepType: "notification", config: { message: "Record updated" } },
      ],
    }),
  },
];

// ─── Role detection ─────────────────────────────────────────────────────────

const ROLE_PATTERNS = [
  { pattern: /\b(admin|administrator)\b/i, role: "admin" },
  { pattern: /\b(manager|supervisor)\b/i, role: "manager" },
  { pattern: /\b(approver)\b/i, role: "approver" },
  { pattern: /\b(viewer|reader)\b/i, role: "viewer" },
  { pattern: /\b(editor|contributor)\b/i, role: "editor" },
  { pattern: /\b(agent|bot)\b/i, role: "agent" },
];

// ─── Parse prompt into structured intent ────────────────────────────────────

function extractAppName(prompt: string): string {
  // Try to extract a name from "build a/an X" or "create a/an X"
  const match = prompt.match(
    /(?:build|create|make|design|set up)\s+(?:a|an|the)?\s*(.+?)(?:\s+(?:with|that|for|using|and)\b|$)/i
  );
  if (match) {
    let name = match[1].trim();
    // Capitalize words
    name = name.replace(/\b\w/g, (c) => c.toUpperCase());
    // Limit length
    if (name.length > 50) name = name.slice(0, 50);
    return name;
  }
  // Fallback: use first few meaningful words
  const words = prompt
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 4);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "New App";
}

export function parsePrompt(prompt: string): ParsedIntent {
  const appName = extractAppName(prompt);
  const lower = prompt.toLowerCase();

  // Detect entities
  const entities: ParsedEntity[] = [];
  const seenKeys = new Set<string>();
  for (const ep of ENTITY_PATTERNS) {
    const match = lower.match(ep.pattern);
    if (match) {
      const entity = ep.entity(match as RegExpMatchArray);
      if (!seenKeys.has(entity.key)) {
        seenKeys.add(entity.key);
        entities.push(entity);
      }
    }
  }

  // If no entities matched, create a generic one from the app name
  if (entities.length === 0) {
    const key = appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    entities.push({
      key,
      name: appName,
      fields: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "text" },
        { name: "status", type: "choice" },
        { name: "assigned_to", type: "reference" },
        { name: "created_date", type: "datetime" },
      ],
    });
  }

  // Detect workflows
  const workflows: ParsedWorkflow[] = [];
  const seenWorkflows = new Set<string>();
  for (const wp of WORKFLOW_PATTERNS) {
    if (wp.pattern.test(lower)) {
      const wf = wp.workflow();
      if (!seenWorkflows.has(wf.name)) {
        seenWorkflows.add(wf.name);
        workflows.push(wf);
      }
    }
  }

  // Detect events from entities + workflows
  const events: string[] = [];
  for (const e of entities) {
    events.push(`${e.key}.created`);
    events.push(`${e.key}.updated`);
  }
  for (const w of workflows) {
    events.push(`workflow.${w.name.toLowerCase().replace(/\s+/g, "_")}.completed`);
  }

  // Detect roles
  const roles: string[] = [];
  const seenRoles = new Set<string>();
  for (const rp of ROLE_PATTERNS) {
    if (rp.pattern.test(lower) && !seenRoles.has(rp.role)) {
      seenRoles.add(rp.role);
      roles.push(rp.role);
    }
  }
  // Always include admin
  if (!seenRoles.has("admin")) roles.unshift("admin");

  return { appName, entities, workflows, events, roles };
}

// ─── Generate app from parsed intent ────────────────────────────────────────

export async function generateApp(
  ctx: TenantContext,
  prompt: string
): Promise<GeneratedApp> {
  const intent = parsePrompt(prompt);
  const storage = getTenantStorage(ctx);

  // Build package JSON matching GraphPackage schema
  const packageJson = {
    key: intent.appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
    name: intent.appName,
    version: "1.0.0",
    description: `Generated from: "${prompt}"`,
    recordTypes: intent.entities.map((e) => ({
      key: e.key,
      name: e.name,
      fields: e.fields,
    })),
    workflows: intent.workflows.map((w) => ({
      key: w.name.toLowerCase().replace(/\s+/g, "_"),
      name: w.name,
      triggerType: w.triggerType,
      steps: w.steps,
    })),
    events: intent.events,
    roles: intent.roles,
  };

  // Create draft with the generated package
  const draft = await storage.createVibeDraft({
    name: intent.appName,
    prompt,
    packageJson,
    templateKey: null,
    createdBy: ctx.userId ?? ctx.agentId ?? "system",
  });

  // Create initial version
  await storage.createVibeDraftVersion({
    draftId: draft.id,
    versionNumber: 1,
    packageJson,
    prompt,
  });

  // Emit domain event
  emitDomainEvent(ctx, {
    type: "vibe.app_generated",
    entityId: draft.id,
    status: "generated",
    metadata: {
      prompt,
      appName: intent.appName,
      entityCount: intent.entities.length,
      workflowCount: intent.workflows.length,
    },
  });

  return {
    draftId: draft.id,
    appName: intent.appName,
    entities: intent.entities.length,
    workflows: intent.workflows.length,
    events: intent.events.length,
    roles: intent.roles.length,
    packageJson,
  };
}
