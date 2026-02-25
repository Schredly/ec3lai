import type {
  GraphSnapshot,
  GraphValidationError,
  GraphNode,
  EdgeDefinition,
} from "./graphContracts.js";

/**
 * O8: Pure validators — no DB access, no side effects.
 * All validators take a snapshot and return errors.
 */

/** Detect orphan nodes (nodes with no edges and not in any package) */
export function detectOrphans(
  snapshot: GraphSnapshot
): GraphValidationError[] {
  const errors: GraphValidationError[] = [];
  const connectedKeys = new Set<string>();

  for (const edge of snapshot.edges) {
    connectedKeys.add(edge.from);
    connectedKeys.add(edge.to);
  }

  for (const node of snapshot.nodes) {
    if (!connectedKeys.has(node.key) && node.type === "record_type") {
      // Only flag if not a base type referenced by others
      const isBaseType = snapshot.edges.some(
        (e) => e.to === node.key && e.type === "inherits"
      );
      if (!isBaseType && snapshot.nodes.length > 1) {
        errors.push({
          code: "ORPHAN_NODE",
          message: `Node "${node.key}" has no connections`,
          nodeKey: node.key,
        });
      }
    }
  }

  return errors;
}

/** Detect cycles in the inheritance graph */
export function detectCycles(
  snapshot: GraphSnapshot
): GraphValidationError[] {
  const errors: GraphValidationError[] = [];
  const inheritEdges = snapshot.edges.filter((e) => e.type === "inherits");

  const adj = new Map<string, string[]>();
  for (const edge of inheritEdges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from)!.push(edge.to);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        errors.push({
          code: "CYCLE_DETECTED",
          message: `Inheritance cycle detected involving "${node}" → "${neighbor}"`,
          nodeKey: node,
        });
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of snapshot.nodes) {
    if (!visited.has(node.key)) {
      dfs(node.key);
    }
  }

  return errors;
}

/** Detect cross-project baseType references */
export function detectCrossProjectBaseType(
  snapshot: GraphSnapshot
): GraphValidationError[] {
  const errors: GraphValidationError[] = [];
  const nodeMap = new Map<string, GraphNode>();

  for (const node of snapshot.nodes) {
    nodeMap.set(node.key, node);
  }

  for (const edge of snapshot.edges) {
    if (edge.type === "inherits") {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (from && to && from.projectId !== to.projectId) {
        errors.push({
          code: "CROSS_PROJECT_BASE_TYPE",
          message: `"${edge.from}" (project ${from.projectId}) inherits from "${edge.to}" (project ${to.projectId})`,
          nodeKey: edge.from,
        });
      }
    }
  }

  return errors;
}

/** Detect field uniqueness violations within a record type */
export function detectFieldUniqueness(
  snapshot: GraphSnapshot
): GraphValidationError[] {
  const errors: GraphValidationError[] = [];

  for (const node of snapshot.nodes) {
    if (node.type === "record_type") {
      const rtData = node.data as { fields?: { name: string }[] };
      if (rtData.fields) {
        const seen = new Set<string>();
        for (const field of rtData.fields) {
          if (seen.has(field.name)) {
            errors.push({
              code: "DUPLICATE_FIELD",
              message: `Duplicate field "${field.name}" on record type "${node.key}"`,
              nodeKey: node.key,
            });
          }
          seen.add(field.name);
        }
      }
    }
  }

  return errors;
}

/** Validate binding targets exist */
export function validateBindings(
  snapshot: GraphSnapshot
): GraphValidationError[] {
  const errors: GraphValidationError[] = [];
  const nodeKeys = new Set(snapshot.nodes.map((n) => n.key));

  for (const edge of snapshot.edges) {
    if (edge.type === "binds_to") {
      if (!nodeKeys.has(edge.to)) {
        errors.push({
          code: "INVALID_BINDING_TARGET",
          message: `Binding target "${edge.to}" does not exist`,
          nodeKey: edge.from,
        });
      }
    }
  }

  return errors;
}

/** Run all validators */
export function validateGraph(
  snapshot: GraphSnapshot
): GraphValidationError[] {
  return [
    ...detectOrphans(snapshot),
    ...detectCycles(snapshot),
    ...detectCrossProjectBaseType(snapshot),
    ...detectFieldUniqueness(snapshot),
    ...validateBindings(snapshot),
  ];
}
