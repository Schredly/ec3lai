import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, createMockStorage } from "../../services/__tests__/testHelpers.js";
import type { ITenantStorage } from "../../tenantStorage.js";

let mockStorage: ITenantStorage;

vi.mock("../../tenantStorage.js", () => ({
  getTenantStorage: () => mockStorage,
}));

const { executePatchOps } = await import("../patchOpExecutor.js");

describe("patchOpExecutor", () => {
  const ctx = createMockCtx();

  const makeChange = (overrides = {}) => ({
    id: "change-1",
    tenantId: "tenant-uuid-1",
    projectId: "project-1",
    status: "Draft",
    ...overrides,
  });

  const makeTarget = (overrides = {}) => ({
    id: "target-1",
    tenantId: "tenant-uuid-1",
    changeId: "change-1",
    projectId: "project-1",
    type: "record_type",
    selector: { recordTypeKey: "incident" },
    ...overrides,
  });

  const makeOp = (overrides = {}) => ({
    id: "op-1",
    tenantId: "tenant-uuid-1",
    changeId: "change-1",
    targetId: "target-1",
    opType: "add_field",
    payload: {
      recordType: "incident",
      field: "priority",
      definition: { type: "choice", required: true },
    },
    previousSnapshot: null,
    executedAt: null,
    ...overrides,
  });

  const makeRecordType = (overrides = {}) => ({
    id: "rt-1",
    tenantId: "tenant-uuid-1",
    projectId: "project-1",
    key: "incident",
    name: "Incident",
    baseType: null,
    schema: { fields: [{ name: "severity", type: "string" }] },
    version: 1,
    status: "draft",
    ...overrides,
  });

  beforeEach(() => {
    mockStorage = createMockStorage({
      getChangeById: vi.fn().mockResolvedValue(makeChange()),
      getChangePatchOps: vi.fn().mockResolvedValue([makeOp()]),
      getChangeTargetById: vi.fn().mockResolvedValue(makeTarget()),
      getRecordTypeByKey: vi.fn().mockResolvedValue(makeRecordType()),
      getSnapshot: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("executes a single add_field op successfully", async () => {
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(1);

    // Verify snapshot was created
    expect(mockStorage.createSnapshot).toHaveBeenCalledOnce();
    // Verify schema was updated
    expect(mockStorage.updateRecordTypeSchema).toHaveBeenCalledOnce();
    // Verify op was stamped
    expect(mockStorage.stampPatchOp).toHaveBeenCalledOnce();
  });

  it("E1: rejects execution of merged changes", async () => {
    (mockStorage.getChangeById as any).mockResolvedValue(
      makeChange({ status: "Merged" })
    );
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("merged");
  });

  it("E2: rejects already-executed ops", async () => {
    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({ executedAt: new Date() }),
    ]);
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("already-executed");
  });

  it("returns success with 0 count when no ops", async () => {
    (mockStorage.getChangePatchOps as any).mockResolvedValue([]);
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(0);
  });

  it("P1: rejects cross-project record type targeting", async () => {
    (mockStorage.getRecordTypeByKey as any).mockResolvedValue(
      makeRecordType({ projectId: "other-project" })
    );
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("project");
  });

  it("E4: all-or-nothing — no writes on transform failure", async () => {
    // Op tries to remove a non-existent field
    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        opType: "remove_field",
        payload: { recordType: "incident", field: "nonexistent" },
      }),
    ]);
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    // Zero DB writes
    expect(mockStorage.createSnapshot).not.toHaveBeenCalled();
    expect(mockStorage.updateRecordTypeSchema).not.toHaveBeenCalled();
    expect(mockStorage.stampPatchOp).not.toHaveBeenCalled();
  });

  it("E7: base-type protected fields cannot be removed", async () => {
    // incident inherits from task; task has "title"
    (mockStorage.getRecordTypeByKey as any)
      .mockResolvedValueOnce(
        makeRecordType({
          baseType: "task",
          schema: {
            fields: [
              { name: "title", type: "string", required: true },
              { name: "severity", type: "string" },
            ],
          },
        })
      )
      // Base type lookup
      .mockResolvedValueOnce({
        id: "rt-base",
        key: "task",
        schema: {
          fields: [{ name: "title", type: "string", required: true }],
        },
      });

    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        opType: "remove_field",
        payload: { recordType: "incident", field: "title" },
      }),
    ]);

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("protected by base type");
  });

  it("E7: base-type protected fields cannot be renamed", async () => {
    (mockStorage.getRecordTypeByKey as any)
      .mockResolvedValueOnce(
        makeRecordType({
          baseType: "task",
          schema: {
            fields: [
              { name: "title", type: "string", required: true },
            ],
          },
        })
      )
      .mockResolvedValueOnce({
        id: "rt-base",
        key: "task",
        schema: {
          fields: [{ name: "title", type: "string", required: true }],
        },
      });

    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        opType: "rename_field",
        payload: { recordType: "incident", oldName: "title", newName: "heading" },
      }),
    ]);

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("protected by base type");
  });

  it("D5: snapshot creation is idempotent", async () => {
    // Snapshot already exists
    (mockStorage.getSnapshot as any).mockResolvedValue({
      id: "snap-1",
      changeId: "change-1",
      recordTypeKey: "incident",
    });

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);
    // Should NOT create another snapshot
    expect(mockStorage.createSnapshot).not.toHaveBeenCalled();
  });

  it("P2/D6: snapshot inherits projectId from change, not record type", async () => {
    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);

    const snapshotCall = (mockStorage.createSnapshot as any).mock.calls[0][0];
    expect(snapshotCall.projectId).toBe("project-1"); // from change, not RT
  });

  it("handles set_field on existing field", async () => {
    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        opType: "set_field",
        payload: {
          recordType: "incident",
          field: "severity",
          definition: { type: "number" },
        },
      }),
    ]);

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);

    const schemaCall = (mockStorage.updateRecordTypeSchema as any).mock.calls[0];
    const updatedSchema = schemaCall[1];
    const severityField = updatedSchema.fields.find(
      (f: any) => f.name === "severity"
    );
    expect(severityField.type).toBe("number");
  });

  it("handles rename_field op", async () => {
    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        opType: "rename_field",
        payload: {
          recordType: "incident",
          oldName: "severity",
          newName: "urgency",
        },
      }),
    ]);

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);

    const schemaCall = (mockStorage.updateRecordTypeSchema as any).mock.calls[0];
    const updatedSchema = schemaCall[1];
    expect(updatedSchema.fields.some((f: any) => f.name === "urgency")).toBe(true);
    expect(updatedSchema.fields.some((f: any) => f.name === "severity")).toBe(false);
  });

  it("multi-op execution: all ops applied atomically", async () => {
    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        id: "op-1",
        opType: "add_field",
        payload: {
          recordType: "incident",
          field: "priority",
          definition: { type: "choice" },
        },
      }),
      makeOp({
        id: "op-2",
        opType: "set_field",
        payload: {
          recordType: "incident",
          field: "severity",
          definition: { type: "number" },
        },
      }),
      makeOp({
        id: "op-3",
        opType: "rename_field",
        payload: {
          recordType: "incident",
          oldName: "severity",
          newName: "urgency",
        },
      }),
    ]);

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(3);

    // All ops stamped
    expect(mockStorage.stampPatchOp).toHaveBeenCalledTimes(3);
  });

  it("multi-op: partial failure means zero writes", async () => {
    (mockStorage.getChangePatchOps as any).mockResolvedValue([
      makeOp({
        id: "op-1",
        opType: "add_field",
        payload: {
          recordType: "incident",
          field: "priority",
          definition: { type: "choice" },
        },
      }),
      makeOp({
        id: "op-2",
        opType: "remove_field",
        payload: { recordType: "incident", field: "nonexistent" },
      }),
    ]);

    const result = await executePatchOps(ctx, "change-1");
    expect(result.success).toBe(false);
    expect(mockStorage.createSnapshot).not.toHaveBeenCalled();
    expect(mockStorage.updateRecordTypeSchema).not.toHaveBeenCalled();
    expect(mockStorage.stampPatchOp).not.toHaveBeenCalled();
  });
});
