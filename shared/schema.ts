import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Tenants ────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTenantSchema = createInsertSchema(tenants).pick({
  name: true,
  slug: true,
  plan: true,
});

// ─── Projects ───────────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    description: text("description"),
    githubRepo: text("github_repo"),
    defaultBranch: varchar("default_branch", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("projects_tenant_name_idx").on(table.tenantId, table.name),
  ]
);

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  githubRepo: true,
  defaultBranch: true,
});

// ─── Record Types ───────────────────────────────────────────────────────────

export const recordTypes = pgTable(
  "record_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    projectId: uuid("project_id")
      .notNull() // D1: Record types must have a non-null project_id
      .references(() => projects.id),
    key: varchar("key", { length: 255 }).notNull(), // D2: unique per tenant+project
    name: text("name").notNull(), // D3: unique per tenant
    description: text("description"),
    baseType: varchar("base_type", { length: 255 }),
    schema: jsonb("schema").notNull().default({}),
    version: integer("version").notNull().default(1),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // D2: Record type keys are unique per tenant + project
    uniqueIndex("record_types_tenant_project_key_idx").on(
      table.tenantId,
      table.projectId,
      table.key
    ),
    // D3: Record type names are unique per tenant
    uniqueIndex("record_types_tenant_name_idx").on(table.tenantId, table.name),
  ]
);

export const insertRecordTypeSchema = createInsertSchema(recordTypes).pick({
  key: true,
  name: true,
  description: true,
  projectId: true,
  baseType: true,
  schema: true,
});

// ─── Change Records ─────────────────────────────────────────────────────────

export const changeRecords = pgTable(
  "change_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    projectId: uuid("project_id")
      .notNull() // D4: Change records must have a non-null project_id
      .references(() => projects.id),
    title: text("title").notNull(),
    description: text("description"),
    status: varchar("status", { length: 50 }).notNull().default("Draft"),
    baseSha: varchar("base_sha", { length: 255 }),
    branchName: varchar("branch_name", { length: 255 }),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("change_records_tenant_project_idx").on(
      table.tenantId,
      table.projectId
    ),
    index("change_records_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
  ]
);

export const insertChangeSchema = createInsertSchema(changeRecords).pick({
  title: true,
  description: true,
  projectId: true,
  baseSha: true,
  branchName: true,
});

// ─── Change Targets ─────────────────────────────────────────────────────────

export const changeTargets = pgTable(
  "change_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    changeId: uuid("change_id")
      .notNull()
      .references(() => changeRecords.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    type: varchar("type", { length: 50 }).notNull(), // D9: record_type, form, workflow, rule, script, file
    selector: jsonb("selector").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("change_targets_change_idx").on(table.changeId),
  ]
);

export const insertChangeTargetSchema = createInsertSchema(changeTargets).pick({
  type: true,
  selector: true,
});

// ─── Patch Ops ──────────────────────────────────────────────────────────────

export const patchOps = pgTable(
  "patch_ops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    changeId: uuid("change_id")
      .notNull()
      .references(() => changeRecords.id),
    targetId: uuid("target_id")
      .notNull()
      .references(() => changeTargets.id),
    opType: varchar("op_type", { length: 50 }).notNull(),
    payload: jsonb("payload").notNull(),
    previousSnapshot: jsonb("previous_snapshot"), // D7: set atomically with executedAt
    executedAt: timestamp("executed_at"), // D7: set atomically with previousSnapshot
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("patch_ops_change_idx").on(table.changeId),
    index("patch_ops_target_idx").on(table.targetId),
  ]
);

export const insertPatchOpSchema = createInsertSchema(patchOps).pick({
  targetId: true,
  opType: true,
  payload: true,
});

// ─── Record Type Snapshots ──────────────────────────────────────────────────

export const recordTypeSnapshots = pgTable(
  "record_type_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    projectId: uuid("project_id")
      .notNull() // D6: project_id from the change, not the record type
      .references(() => projects.id),
    changeId: uuid("change_id")
      .notNull()
      .references(() => changeRecords.id),
    recordTypeKey: varchar("record_type_key", { length: 255 }).notNull(),
    schema: jsonb("schema").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // D5: Snapshots are unique per change + record type key
    uniqueIndex("snapshots_change_rt_key_idx").on(
      table.changeId,
      table.recordTypeKey
    ),
  ]
);

// ─── Record Instances ───────────────────────────────────────────────────────

export const recordInstances = pgTable(
  "record_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    recordTypeId: uuid("record_type_id")
      .notNull()
      .references(() => recordTypes.id),
    data: jsonb("data").notNull().default({}),
    status: varchar("status", { length: 50 }).notNull().default("open"),
    assignedTo: varchar("assigned_to", { length: 255 }),
    slaDeadline: timestamp("sla_deadline"),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("record_instances_tenant_rt_idx").on(
      table.tenantId,
      table.recordTypeId
    ),
  ]
);

export const insertRecordInstanceSchema = createInsertSchema(
  recordInstances
).pick({
  recordTypeId: true,
  data: true,
  status: true,
  assignedTo: true,
});

// ─── Record Timers ──────────────────────────────────────────────────────────

export const recordTimers = pgTable(
  "record_timers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    recordInstanceId: uuid("record_instance_id")
      .notNull()
      .references(() => recordInstances.id),
    timerType: varchar("timer_type", { length: 50 }).notNull(),
    fireAt: timestamp("fire_at").notNull(),
    firedAt: timestamp("fired_at"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("record_timers_fire_at_idx").on(table.fireAt),
  ]
);

// ─── Workflow Definitions ───────────────────────────────────────────────────

export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: varchar("trigger_type", { length: 50 }),
    triggerConfig: jsonb("trigger_config").default({}),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const insertWorkflowDefinitionSchema = createInsertSchema(
  workflowDefinitions
).pick({
  name: true,
  description: true,
  projectId: true,
  triggerType: true,
  triggerConfig: true,
});

// ─── Workflow Steps ─────────────────────────────────────────────────────────

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    workflowDefinitionId: uuid("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id),
    stepType: varchar("step_type", { length: 50 }).notNull(),
    config: jsonb("config").notNull().default({}),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workflow_steps_definition_idx").on(table.workflowDefinitionId),
  ]
);

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).pick({
  stepType: true,
  config: true,
  orderIndex: true,
});

// ─── Workflow Executions ────────────────────────────────────────────────────

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    workflowDefinitionId: uuid("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id),
    status: varchar("status", { length: 50 }).notNull().default("running"),
    triggeredBy: varchar("triggered_by", { length: 255 }),
    context: jsonb("context").notNull().default({}),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Workflow Execution Steps ───────────────────────────────────────────────

export const workflowExecutionSteps = pgTable(
  "workflow_execution_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => workflowExecutions.id),
    stepId: uuid("step_id")
      .notNull()
      .references(() => workflowSteps.id),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    result: jsonb("result"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  }
);

// ─── Workflow Execution Intents ─────────────────────────────────────────────

export const workflowExecutionIntents = pgTable(
  "workflow_execution_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    workflowDefinitionId: uuid("workflow_definition_id")
      .notNull()
      .references(() => workflowDefinitions.id),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    payload: jsonb("payload").notNull().default({}),
    executionId: uuid("execution_id").references(() => workflowExecutions.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("intents_idempotency_key_idx").on(
      table.tenantId,
      table.idempotencyKey
    ),
  ]
);

// ─── Triggers ───────────────────────────────────────────────────────────────

export const triggers = pgTable(
  "triggers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    condition: jsonb("condition").default({}),
    actionType: varchar("action_type", { length: 50 }).notNull(),
    actionConfig: jsonb("action_config").notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Execution Telemetry Events ─────────────────────────────────────────────

export const executionTelemetryEvents = pgTable(
  "execution_telemetry_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: uuid("entity_id"),
    actor: varchar("actor", { length: 255 }),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("telemetry_tenant_entity_idx").on(
      table.tenantId,
      table.entityType,
      table.entityId
    ),
  ]
);

// ─── RBAC Roles ─────────────────────────────────────────────────────────────

export const rbacRoles = pgTable(
  "rbac_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    permissions: jsonb("permissions").notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rbac_roles_tenant_name_idx").on(table.tenantId, table.name),
  ]
);

// ─── RBAC User Roles ────────────────────────────────────────────────────────

export const rbacUserRoles = pgTable(
  "rbac_user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: varchar("user_id", { length: 255 }).notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => rbacRoles.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rbac_user_roles_tenant_user_role_idx").on(
      table.tenantId,
      table.userId,
      table.roleId
    ),
  ]
);

// ─── RBAC Audit Log ─────────────────────────────────────────────────────────

export const rbacAuditLog = pgTable(
  "rbac_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    actor: varchar("actor", { length: 255 }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    permission: varchar("permission", { length: 100 }),
    granted: boolean("granted").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Graph Package Installs ─────────────────────────────────────────────────

export const graphPackageInstalls = pgTable(
  "graph_package_installs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    packageKey: varchar("package_key", { length: 255 }).notNull(),
    packageVersion: varchar("package_version", { length: 50 }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    installedBy: varchar("installed_by", { length: 255 }),
    manifest: jsonb("manifest").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("graph_installs_tenant_pkg_idx").on(
      table.tenantId,
      table.packageKey
    ),
  ]
);

// ─── Environments ───────────────────────────────────────────────────────────

export const environments = pgTable(
  "environments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    ordinal: integer("ordinal").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("environments_tenant_slug_idx").on(table.tenantId, table.slug),
  ]
);

// ─── Environment Package Installs ───────────────────────────────────────────

export const environmentPackageInstalls = pgTable(
  "environment_package_installs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environments.id),
    packageInstallId: uuid("package_install_id")
      .notNull()
      .references(() => graphPackageInstalls.id),
    installedAt: timestamp("installed_at").defaultNow().notNull(),
  },
  (table) => [
    index("env_pkg_installs_env_idx").on(table.environmentId),
  ]
);

// ─── Promotion Intents ──────────────────────────────────────────────────────

export const promotionIntents = pgTable(
  "promotion_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    sourceEnvironmentId: uuid("source_environment_id")
      .notNull()
      .references(() => environments.id),
    targetEnvironmentId: uuid("target_environment_id")
      .notNull()
      .references(() => environments.id),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    diff: jsonb("diff").default({}),
    approvedBy: varchar("approved_by", { length: 255 }),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Vibe Package Drafts ────────────────────────────────────────────────────

export const vibePackageDrafts = pgTable(
  "vibe_package_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    prompt: text("prompt"),
    packageJson: jsonb("package_json").default({}),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    templateKey: varchar("template_key", { length: 255 }),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const insertVibeDraftSchema = createInsertSchema(vibePackageDrafts).pick({
  name: true,
  prompt: true,
  templateKey: true,
});

// ─── Vibe Package Draft Versions ────────────────────────────────────────────

export const vibePackageDraftVersions = pgTable(
  "vibe_package_draft_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => vibePackageDrafts.id),
    versionNumber: integer("version_number").notNull(),
    packageJson: jsonb("package_json").notNull().default({}),
    prompt: text("prompt"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vibe_draft_versions_idx").on(
      table.draftId,
      table.versionNumber
    ),
  ]
);

// ─── Forms ──────────────────────────────────────────────────────────────────

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    recordTypeId: uuid("record_type_id")
      .notNull()
      .references(() => recordTypes.id),
    name: text("name").notNull(),
    layout: jsonb("layout").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ─── Modules ────────────────────────────────────────────────────────────────

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    entryPoint: text("entry_point"),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Overrides ──────────────────────────────────────────────────────────────

export const overrides = pgTable(
  "overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: uuid("target_id").notNull(),
    field: varchar("field", { length: 255 }).notNull(),
    value: jsonb("value"),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Templates ──────────────────────────────────────────────────────────────

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    packageJson: jsonb("package_json").notNull().default({}),
    category: varchar("category", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Scheduled Jobs ─────────────────────────────────────────────────────────

export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    jobType: varchar("job_type", { length: 100 }).notNull(),
    schedule: varchar("schedule", { length: 100 }).notNull(),
    config: jsonb("config").notNull().default({}),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ─── Shared Types ───────────────────────────────────────────────────────────

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type RecordType = typeof recordTypes.$inferSelect;
export type InsertRecordType = typeof recordTypes.$inferInsert;

export type ChangeRecord = typeof changeRecords.$inferSelect;
export type InsertChangeRecord = typeof changeRecords.$inferInsert;

export type ChangeTarget = typeof changeTargets.$inferSelect;
export type InsertChangeTarget = typeof changeTargets.$inferInsert;

export type PatchOp = typeof patchOps.$inferSelect;
export type InsertPatchOp = typeof patchOps.$inferInsert;

export type RecordTypeSnapshot = typeof recordTypeSnapshots.$inferSelect;

export type RecordInstance = typeof recordInstances.$inferSelect;
export type InsertRecordInstance = typeof recordInstances.$inferInsert;

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type InsertWorkflowDefinition = typeof workflowDefinitions.$inferInsert;

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = typeof workflowSteps.$inferInsert;

export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type WorkflowExecutionStep = typeof workflowExecutionSteps.$inferSelect;
export type WorkflowExecutionIntent = typeof workflowExecutionIntents.$inferSelect;

export type Trigger = typeof triggers.$inferSelect;
export type RbacRole = typeof rbacRoles.$inferSelect;
export type RbacUserRole = typeof rbacUserRoles.$inferSelect;

export type GraphPackageInstall = typeof graphPackageInstalls.$inferSelect;
export type Environment = typeof environments.$inferSelect;
export type PromotionIntent = typeof promotionIntents.$inferSelect;

export type VibePackageDraft = typeof vibePackageDrafts.$inferSelect;
export type VibePackageDraftVersion = typeof vibePackageDraftVersions.$inferSelect;

// ─── Enums / Constants ──────────────────────────────────────────────────────

/** D8: Valid field types */
export const VALID_FIELD_TYPES = [
  "string",
  "number",
  "boolean",
  "reference",
  "choice",
  "text",
  "date",
  "datetime",
] as const;

export type FieldType = (typeof VALID_FIELD_TYPES)[number];

/** D9: Valid change target types */
export const VALID_TARGET_TYPES = [
  "record_type",
  "form",
  "workflow",
  "rule",
  "script",
  "file",
] as const;

export type TargetType = (typeof VALID_TARGET_TYPES)[number];

/** Valid change statuses */
export const CHANGE_STATUSES = [
  "Draft",
  "Implementing",
  "WorkspaceRunning",
  "Validating",
  "ValidationFailed",
  "Ready",
  "Merged",
] as const;

export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

/** Valid patch op types */
export const PATCH_OP_TYPES = [
  "set_field",
  "add_field",
  "remove_field",
  "rename_field",
  "edit_file",
] as const;

export type PatchOpType = (typeof PATCH_OP_TYPES)[number];

// ─── Tenant Context ─────────────────────────────────────────────────────────

export interface TenantContext {
  tenantId: string;
  userId?: string;
  agentId?: string;
  actorType: "user" | "agent" | "system";
  source: "header";
}
