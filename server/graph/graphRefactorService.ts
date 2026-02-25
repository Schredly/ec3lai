/**
 * Sprint 6: Rule-based structural analysis for graph refactoring.
 * No LLM — pure structural pattern detection.
 */

export interface RefactorSuggestion {
  type: "warning" | "improvement" | "missing";
  category: string;
  message: string;
  nodeKey?: string;
  fix?: string;
}

interface PackageJson {
  appName?: string;
  entities?: Array<{
    key: string;
    name: string;
    fields?: Array<{ name: string; type: string; required?: boolean }>;
  }>;
  workflows?: Array<{
    name: string;
    triggerType?: string;
    steps?: Array<{ stepType: string }>;
  }>;
  events?: string[];
  roles?: string[];
}

export function analyzePackage(packageJson: unknown): RefactorSuggestion[] {
  const pkg = packageJson as PackageJson;
  if (!pkg) return [];

  const suggestions: RefactorSuggestion[] = [];
  const entities = pkg.entities ?? [];
  const workflows = pkg.workflows ?? [];
  const events = pkg.events ?? [];
  const roles = pkg.roles ?? [];

  // 1. Check for missing approval workflows
  const hasApproval = workflows.some(
    (w) =>
      w.name.toLowerCase().includes("approval") ||
      w.steps?.some((s) => s.stepType === "approval")
  );
  if (!hasApproval && entities.length > 0) {
    suggestions.push({
      type: "missing",
      category: "governance",
      message: "No approval workflow detected. Consider adding an approval step for record changes.",
      fix: "Add an approval workflow with manager approval step.",
    });
  }

  // 2. Check for redundant events
  const eventSet = new Set(events);
  const uniquePrefixes = new Set(events.map((e) => e.split(".")[0]));
  if (eventSet.size < events.length) {
    suggestions.push({
      type: "warning",
      category: "events",
      message: `Duplicate events detected (${events.length - eventSet.size} duplicates). Remove redundant event definitions.`,
    });
  }

  // 3. Check entities without status field
  for (const entity of entities) {
    const fields = entity.fields ?? [];
    const hasStatus = fields.some(
      (f) => f.name === "status" || f.name === "state"
    );
    if (!hasStatus) {
      suggestions.push({
        type: "improvement",
        category: "schema",
        message: `Entity "${entity.name}" has no status field. Consider adding one for lifecycle tracking.`,
        nodeKey: entity.key,
        fix: `Add a "status" field of type "choice" to ${entity.name}.`,
      });
    }

    // 4. Check entities without required fields
    const hasRequired = fields.some((f) => f.required);
    if (!hasRequired && fields.length > 0) {
      suggestions.push({
        type: "improvement",
        category: "schema",
        message: `Entity "${entity.name}" has no required fields. Consider marking key fields as required.`,
        nodeKey: entity.key,
      });
    }

    // 5. Check for missing name/title field
    const hasNameField = fields.some(
      (f) =>
        f.name === "name" ||
        f.name === "title" ||
        f.name === "subject" ||
        f.name === "label"
    );
    if (!hasNameField && fields.length > 0) {
      suggestions.push({
        type: "improvement",
        category: "schema",
        message: `Entity "${entity.name}" has no name/title field. Consider adding a display name field.`,
        nodeKey: entity.key,
      });
    }
  }

  // 6. Check for unused entities (no events reference them)
  for (const entity of entities) {
    const entityKey = entity.key.toLowerCase();
    const referencedInEvents = events.some((e) =>
      e.toLowerCase().includes(entityKey)
    );
    const referencedInWorkflows = workflows.some((w) =>
      w.name.toLowerCase().includes(entityKey)
    );
    if (!referencedInEvents && !referencedInWorkflows) {
      suggestions.push({
        type: "warning",
        category: "graph",
        message: `Entity "${entity.name}" is not referenced by any event or workflow. It may be an orphan node.`,
        nodeKey: entity.key,
      });
    }
  }

  // 7. Check for missing admin role
  const hasAdmin = roles.some(
    (r) => r.toLowerCase() === "admin" || r.toLowerCase() === "administrator"
  );
  if (!hasAdmin && roles.length > 0) {
    suggestions.push({
      type: "missing",
      category: "rbac",
      message: "No admin role detected. Consider adding an admin role for system management.",
      fix: 'Add "admin" to the roles list.',
    });
  }

  // 8. Check workflow steps sanity
  for (const workflow of workflows) {
    const steps = workflow.steps ?? [];
    if (steps.length === 0) {
      suggestions.push({
        type: "warning",
        category: "workflow",
        message: `Workflow "${workflow.name}" has no steps defined. It will not execute any actions.`,
      });
    }

    // Check for notification step
    const hasNotification = steps.some(
      (s) =>
        s.stepType === "notification" ||
        s.stepType === "email" ||
        s.stepType === "notify"
    );
    if (!hasNotification && steps.length > 0) {
      suggestions.push({
        type: "improvement",
        category: "workflow",
        message: `Workflow "${workflow.name}" has no notification step. Consider notifying stakeholders.`,
        fix: `Add a notification step to "${workflow.name}".`,
      });
    }
  }

  // 9. Check event-to-workflow coverage
  const entityEvents = events.filter((e) => e.includes(".created") || e.includes(".updated"));
  if (entityEvents.length > 0 && workflows.length === 0) {
    suggestions.push({
      type: "missing",
      category: "automation",
      message: `${entityEvents.length} entity lifecycle events defined but no workflows to process them.`,
      fix: "Add workflows that trigger on entity lifecycle events.",
    });
  }

  return suggestions;
}
