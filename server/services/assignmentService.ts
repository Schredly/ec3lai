/**
 * O4: Pure assignment resolver — no side effects, no DB writes.
 * Resolves assignment based on strategy.
 */

export type AssignmentStrategy =
  | { type: "static_user"; userId: string }
  | { type: "static_group"; groupId: string }
  | { type: "field_match"; field: string; value: string };

export interface AssignmentResult {
  assignedTo: string | null;
  strategy: string;
}

export function resolveAssignment(
  strategy: AssignmentStrategy | undefined,
  _recordData?: Record<string, unknown>
): AssignmentResult {
  if (!strategy) {
    return { assignedTo: null, strategy: "none" };
  }

  switch (strategy.type) {
    case "static_user":
      return { assignedTo: strategy.userId, strategy: "static_user" };
    case "static_group":
      return { assignedTo: strategy.groupId, strategy: "static_group" };
    case "field_match":
      return {
        assignedTo: _recordData?.[strategy.field] as string ?? null,
        strategy: "field_match",
      };
    default:
      return { assignedTo: null, strategy: "unknown" };
  }
}
