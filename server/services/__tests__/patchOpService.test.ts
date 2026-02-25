import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, createMockStorage } from "./testHelpers.js";
import type { ITenantStorage } from "../../tenantStorage.js";

let mockStorage: ITenantStorage;

vi.mock("../../tenantStorage.js", () => ({
  getTenantStorage: () => mockStorage,
}));

const { createPatchOp, deletePatchOp, getChangePatchOps } =
  await import("../patchOpService.js");

describe("patchOpService", () => {
  const ctx = createMockCtx();

  beforeEach(() => {
    mockStorage = createMockStorage({
      getChangeById: vi.fn().mockResolvedValue({
        id: "change-1",
        tenantId: "tenant-uuid-1",
        projectId: "project-1",
        status: "Draft",
      }),
      getChangeTargetById: vi.fn().mockResolvedValue({
        id: "target-1",
        tenantId: "tenant-uuid-1",
        changeId: "change-1",
        projectId: "project-1",
        type: "record_type",
        selector: { recordTypeKey: "incident" },
      }),
      getChangePatchOps: vi.fn().mockResolvedValue([]),
    });
  });

  describe("createPatchOp", () => {
    it("creates an op with valid data", async () => {
      const op = await createPatchOp(ctx, "change-1", {
        targetId: "target-1",
        opType: "add_field",
        payload: {
          recordType: "incident",
          field: "priority",
          definition: { type: "choice", required: true },
        },
      });
      expect(op.opType).toBe("add_field");
      expect(mockStorage.createPatchOp).toHaveBeenCalledOnce();
    });

    it("E1: rejects ops on merged changes", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Merged",
      });
      await expect(
        createPatchOp(ctx, "change-1", {
          targetId: "target-1",
          opType: "add_field",
          payload: { recordType: "incident", field: "x", definition: { type: "string" } },
        })
      ).rejects.toThrow("Cannot add patch ops to a merged change");
    });

    it("rejects ops in Validating status", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Validating",
      });
      await expect(
        createPatchOp(ctx, "change-1", {
          targetId: "target-1",
          opType: "add_field",
          payload: { recordType: "incident", field: "x", definition: { type: "string" } },
        })
      ).rejects.toThrow("Cannot add patch ops when change is in 'Validating' status");
    });

    it("D8: rejects invalid field types", async () => {
      await expect(
        createPatchOp(ctx, "change-1", {
          targetId: "target-1",
          opType: "set_field",
          payload: {
            recordType: "incident",
            field: "bad",
            definition: { type: "invalid_type" },
          },
        })
      ).rejects.toThrow('Invalid field type "invalid_type"');
    });

    it("rejects invalid op types", async () => {
      await expect(
        createPatchOp(ctx, "change-1", {
          targetId: "target-1",
          opType: "bad_op",
          payload: {},
        })
      ).rejects.toThrow('Invalid op type "bad_op"');
    });

    it("409: rejects duplicate field ops within same change", async () => {
      (mockStorage.getChangePatchOps as any).mockResolvedValue([
        {
          id: "op-existing",
          payload: { recordType: "incident", field: "priority" },
        },
      ]);
      await expect(
        createPatchOp(ctx, "change-1", {
          targetId: "target-1",
          opType: "set_field",
          payload: {
            recordType: "incident",
            field: "priority",
            definition: { type: "string" },
          },
        })
      ).rejects.toThrow(
        'A pending patch op for field "priority" on record type "incident" already exists'
      );
    });

    it("P7: rejects cross-project record type targeting", async () => {
      (mockStorage.getRecordTypeByKey as any).mockResolvedValue({
        id: "rt-1",
        projectId: "other-project", // different from change's project-1
      });
      await expect(
        createPatchOp(ctx, "change-1", {
          targetId: "target-1",
          opType: "set_field",
          payload: {
            recordType: "incident",
            field: "x",
            definition: { type: "string" },
          },
        })
      ).rejects.toThrow("belongs to a different project");
    });
  });

  describe("deletePatchOp", () => {
    it("deletes a pending op", async () => {
      (mockStorage.getPatchOpById as any).mockResolvedValue({
        id: "op-1",
        tenantId: "tenant-uuid-1",
        changeId: "change-1",
        executedAt: null,
      });
      await deletePatchOp(ctx, "change-1", "op-1");
      expect(mockStorage.deletePatchOp).toHaveBeenCalledWith("op-1");
    });

    it("E1: rejects deletion from merged changes", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Merged",
      });
      await expect(
        deletePatchOp(ctx, "change-1", "op-1")
      ).rejects.toThrow("Cannot delete patch ops from a merged change");
    });

    it("E3: rejects deletion of executed ops", async () => {
      (mockStorage.getPatchOpById as any).mockResolvedValue({
        id: "op-1",
        tenantId: "tenant-uuid-1",
        changeId: "change-1",
        executedAt: new Date(),
      });
      await expect(
        deletePatchOp(ctx, "change-1", "op-1")
      ).rejects.toThrow("Cannot delete an executed patch op");
    });

    it("rejects if op belongs to different change", async () => {
      (mockStorage.getPatchOpById as any).mockResolvedValue({
        id: "op-1",
        tenantId: "tenant-uuid-1",
        changeId: "change-other",
        executedAt: null,
      });
      await expect(
        deletePatchOp(ctx, "change-1", "op-1")
      ).rejects.toThrow("Patch op does not belong to this change");
    });

    it("T5: returns 404 for non-existent op", async () => {
      (mockStorage.getPatchOpById as any).mockResolvedValue(undefined);
      await expect(
        deletePatchOp(ctx, "change-1", "nonexistent")
      ).rejects.toThrow("Patch op not found");
    });
  });
});
