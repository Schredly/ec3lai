import type { TenantContext } from "../../shared/schema.js";
import { VALID_FIELD_TYPES } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

interface ExecutionResult {
  success: boolean;
  error?: string;
  appliedCount?: number;
}

interface FieldDefinition {
  name: string;
  type: string;
  required?: boolean;
}

interface RecordTypeSchema {
  fields: FieldDefinition[];
}

interface PatchOpPayload {
  recordType?: string;
  field?: string;
  oldName?: string;
  newName?: string;
  definition?: { type?: string; required?: boolean };
  filePath?: string;
  diff?: string;
}

/**
 * 3-Phase Patch Op Executor
 *
 * Phase 1 — Load: Resolve targets, validate project consistency, load base types
 * Phase 2 — Transform: Apply ops in memory (pure, zero DB writes)
 * Phase 3 — Persist: Write snapshots, update schemas, stamp ops
 *
 * Enforces: E1-E7, P1-P2, D5-D8
 */
export async function executePatchOps(
  ctx: TenantContext,
  changeId: string
): Promise<ExecutionResult> {
  const storage = getTenantStorage(ctx);

  // ─── Phase 1: Load ──────────────────────────────────────────────────

  const change = await storage.getChangeById(changeId);
  if (!change) {
    return { success: false, error: "Change not found" };
  }

  // E1: Reject Merged changes
  if (change.status === "Merged") {
    return { success: false, error: "Cannot execute a merged change" };
  }

  const ops = await storage.getChangePatchOps(changeId);
  if (ops.length === 0) {
    return { success: true, appliedCount: 0 };
  }

  // E2: Reject already-executed ops
  const alreadyExecuted = ops.some((op) => op.executedAt !== null);
  if (alreadyExecuted) {
    return { success: false, error: "Change contains already-executed ops" };
  }

  // Resolve targets and record types
  const targetMap = new Map<string, { type: string; selector: Record<string, unknown> }>();
  const rtMap = new Map<string, { id: string; key: string; projectId: string; schema: RecordTypeSchema; baseType: string | null }>();
  const originalSchemas = new Map<string, RecordTypeSchema>();

  for (const op of ops) {
    if (targetMap.has(op.targetId)) continue;

    const target = await storage.getChangeTargetById(op.targetId);
    if (!target) {
      return { success: false, error: `Target ${op.targetId} not found` };
    }
    targetMap.set(op.targetId, {
      type: target.type,
      selector: target.selector as Record<string, unknown>,
    });

    if (target.type === "record_type") {
      const selector = target.selector as { recordTypeKey?: string };
      if (selector.recordTypeKey && !rtMap.has(selector.recordTypeKey)) {
        const rt = await storage.getRecordTypeByKey(selector.recordTypeKey);
        if (!rt) {
          return {
            success: false,
            error: `Record type "${selector.recordTypeKey}" not found`,
          };
        }

        // P1: Validate project consistency
        if (rt.projectId !== change.projectId) {
          return {
            success: false,
            error: `Record type "${selector.recordTypeKey}" belongs to project ${rt.projectId}, but change belongs to project ${change.projectId}`,
          };
        }

        const schema = (rt.schema as RecordTypeSchema) || { fields: [] };
        rtMap.set(selector.recordTypeKey, {
          id: rt.id,
          key: rt.key,
          projectId: rt.projectId,
          schema,
          baseType: rt.baseType,
        });
        // Store original schema (copy-on-write reference)
        originalSchemas.set(selector.recordTypeKey, schema);
      }
    }
  }

  // Load base types for protected field resolution
  const baseTypeFields = new Map<string, Set<string>>();
  for (const [key, rt] of rtMap) {
    if (rt.baseType) {
      const baseRT = await storage.getRecordTypeByKey(rt.baseType);
      if (baseRT) {
        const baseSchema = (baseRT.schema as RecordTypeSchema) || {
          fields: [],
        };
        const protectedFieldNames = new Set(
          baseSchema.fields.map((f) => f.name)
        );
        baseTypeFields.set(key, protectedFieldNames);
      }
    }
  }

  // ─── Phase 2: Transform (pure, no DB writes) ───────────────────────

  // Build mutable copies of schemas (copy-on-write)
  const mutatedSchemas = new Map<string, RecordTypeSchema>();
  for (const [key, schema] of originalSchemas) {
    mutatedSchemas.set(key, {
      fields: schema.fields.map((f) => ({ ...f })),
    });
  }

  for (const op of ops) {
    const target = targetMap.get(op.targetId)!;
    const payload = op.payload as PatchOpPayload;

    // Skip file ops (no schema mutation)
    if (op.opType === "edit_file") continue;

    if (target.type !== "record_type") continue;

    const selector = target.selector as { recordTypeKey?: string };
    const rtKey = selector.recordTypeKey;
    if (!rtKey) continue;

    const schema = mutatedSchemas.get(rtKey);
    if (!schema) {
      return {
        success: false,
        error: `No schema found for record type "${rtKey}"`,
      };
    }

    const protectedFields = baseTypeFields.get(rtKey);

    switch (op.opType) {
      case "add_field": {
        if (!payload.field || !payload.definition) {
          return { success: false, error: "add_field requires field and definition" };
        }
        // Check field doesn't already exist
        if (schema.fields.some((f) => f.name === payload.field)) {
          return {
            success: false,
            error: `Field "${payload.field}" already exists on record type "${rtKey}"`,
          };
        }
        // D8: Validate field type
        if (
          payload.definition.type &&
          !VALID_FIELD_TYPES.includes(payload.definition.type as any)
        ) {
          return {
            success: false,
            error: `Invalid field type "${payload.definition.type}"`,
          };
        }
        schema.fields.push({
          name: payload.field,
          type: payload.definition.type || "string",
          required: payload.definition.required,
        });
        break;
      }

      case "set_field": {
        if (!payload.field || !payload.definition) {
          return { success: false, error: "set_field requires field and definition" };
        }
        // D8: Validate field type
        if (
          payload.definition.type &&
          !VALID_FIELD_TYPES.includes(payload.definition.type as any)
        ) {
          return {
            success: false,
            error: `Invalid field type "${payload.definition.type}"`,
          };
        }
        const existingIdx = schema.fields.findIndex(
          (f) => f.name === payload.field
        );
        if (existingIdx >= 0) {
          // E7: Check base-type protection — cannot weaken protected fields
          if (protectedFields?.has(payload.field!)) {
            const existing = schema.fields[existingIdx];
            if (existing.required && payload.definition.required === false) {
              return {
                success: false,
                error: `Field "${payload.field}" is protected by base type and cannot have required weakened`,
              };
            }
          }
          schema.fields[existingIdx] = {
            name: payload.field,
            type: payload.definition.type || schema.fields[existingIdx].type,
            required: payload.definition.required ?? schema.fields[existingIdx].required,
          };
        } else {
          // set_field on non-existing field: create it
          schema.fields.push({
            name: payload.field,
            type: payload.definition.type || "string",
            required: payload.definition.required,
          });
        }
        break;
      }

      case "remove_field": {
        if (!payload.field) {
          return { success: false, error: "remove_field requires field" };
        }
        // E7: Cannot remove base-type protected fields
        if (protectedFields?.has(payload.field)) {
          return {
            success: false,
            error: `Field "${payload.field}" is protected by base type "${rtMap.get(rtKey)?.baseType}" and cannot be removed`,
          };
        }
        const removeIdx = schema.fields.findIndex(
          (f) => f.name === payload.field
        );
        if (removeIdx < 0) {
          return {
            success: false,
            error: `Field "${payload.field}" not found on record type "${rtKey}"`,
          };
        }
        schema.fields.splice(removeIdx, 1);
        break;
      }

      case "rename_field": {
        if (!payload.oldName || !payload.newName) {
          return { success: false, error: "rename_field requires oldName and newName" };
        }
        // E7: Cannot rename base-type protected fields
        if (protectedFields?.has(payload.oldName)) {
          return {
            success: false,
            error: `Field "${payload.oldName}" is protected by base type "${rtMap.get(rtKey)?.baseType}" and cannot be renamed`,
          };
        }
        const renameIdx = schema.fields.findIndex(
          (f) => f.name === payload.oldName
        );
        if (renameIdx < 0) {
          return {
            success: false,
            error: `Field "${payload.oldName}" not found on record type "${rtKey}"`,
          };
        }
        // Check new name doesn't conflict
        if (schema.fields.some((f) => f.name === payload.newName)) {
          return {
            success: false,
            error: `Field "${payload.newName}" already exists on record type "${rtKey}"`,
          };
        }
        schema.fields[renameIdx] = {
          ...schema.fields[renameIdx],
          name: payload.newName,
        };
        break;
      }

      default:
        return { success: false, error: `Unknown op type: ${op.opType}` };
    }
  }

  // ─── Phase 3: Persist (only if ALL ops succeeded) ───────────────────

  const now = new Date();

  // E6: Snapshots captured before mutation
  for (const [rtKey, originalSchema] of originalSchemas) {
    const rtInfo = rtMap.get(rtKey)!;

    // D5: ensureSnapshot() — idempotent (check existing first)
    const existing = await storage.getSnapshot(changeId, rtKey);
    if (!existing) {
      // D6, P2: project_id from the change, not the record type
      await storage.createSnapshot({
        projectId: change.projectId,
        changeId,
        recordTypeKey: rtKey,
        schema: originalSchema,
      });
    }

    // Update record type schema
    const mutatedSchema = mutatedSchemas.get(rtKey)!;
    await storage.updateRecordTypeSchema(rtInfo.id, mutatedSchema);
  }

  // D7: Stamp ops atomically (previous_snapshot + executed_at)
  for (const op of ops) {
    if (op.opType === "edit_file") {
      // File ops get stamped but don't have schema snapshots
      await storage.stampPatchOp(op.id, null, now);
      continue;
    }

    const target = targetMap.get(op.targetId)!;
    if (target.type === "record_type") {
      const selector = target.selector as { recordTypeKey?: string };
      const rtKey = selector.recordTypeKey;
      if (rtKey) {
        const original = originalSchemas.get(rtKey);
        await storage.stampPatchOp(op.id, original, now);
      }
    }
  }

  return { success: true, appliedCount: ops.length };
}
