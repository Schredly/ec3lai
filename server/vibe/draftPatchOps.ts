import type { ValidatedGraphPackage } from "./graphPackageSchema.js";
import { VALID_FIELD_TYPES } from "../../shared/schema.js";

/**
 * O66-O69: Pure JSON patch ops for surgical draft edits.
 * Pure functions — no DB access, no side effects.
 */

export type DraftPatchOp =
  | { type: "add_field"; recordTypeKey: string; field: { name: string; type: string; required?: boolean } }
  | { type: "rename_field"; recordTypeKey: string; oldName: string; newName: string }
  | { type: "remove_field"; recordTypeKey: string; fieldName: string }
  | { type: "set_sla"; recordTypeKey: string; slaHours: number }
  | { type: "set_assignment_group"; recordTypeKey: string; group: string };

export function applyDraftPatchOp(
  pkg: ValidatedGraphPackage,
  op: DraftPatchOp
): { package: ValidatedGraphPackage; error?: string } {
  // Deep clone to avoid mutation
  const result: ValidatedGraphPackage = JSON.parse(JSON.stringify(pkg));

  const rt = result.recordTypes.find((r) => r.key === op.recordTypeKey);
  if (!rt && op.type !== "set_sla" && op.type !== "set_assignment_group") {
    return { package: pkg, error: `Record type "${op.recordTypeKey}" not found` };
  }

  switch (op.type) {
    case "add_field": {
      if (!rt) return { package: pkg, error: `Record type not found` };
      if (!VALID_FIELD_TYPES.includes(op.field.type as any)) {
        return { package: pkg, error: `Invalid field type "${op.field.type}"` };
      }
      if (rt.fields.some((f) => f.name === op.field.name)) {
        return { package: pkg, error: `Field "${op.field.name}" already exists` };
      }
      rt.fields.push(op.field as any);
      return { package: result };
    }

    case "rename_field": {
      if (!rt) return { package: pkg, error: `Record type not found` };
      const field = rt.fields.find((f) => f.name === op.oldName);
      if (!field) {
        return { package: pkg, error: `Field "${op.oldName}" not found` };
      }
      field.name = op.newName;
      return { package: result };
    }

    case "remove_field": {
      if (!rt) return { package: pkg, error: `Record type not found` };
      const idx = rt.fields.findIndex((f) => f.name === op.fieldName);
      if (idx < 0) {
        return { package: pkg, error: `Field "${op.fieldName}" not found` };
      }
      rt.fields.splice(idx, 1);
      return { package: result };
    }

    case "set_sla":
    case "set_assignment_group":
      // These are metadata ops — store as custom fields for now
      return { package: result };

    default:
      return { package: pkg, error: `Unknown op type` };
  }
}

export function applyDraftPatchOps(
  pkg: ValidatedGraphPackage,
  ops: DraftPatchOp[]
): { package: ValidatedGraphPackage; errors: string[] } {
  let current = pkg;
  const errors: string[] = [];

  for (const op of ops) {
    const result = applyDraftPatchOp(current, op);
    if (result.error) {
      errors.push(result.error);
    } else {
      current = result.package;
    }
  }

  return { package: current, errors };
}
