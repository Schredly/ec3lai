import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, createMockStorage } from "./testHelpers.js";
import type { ITenantStorage } from "../../tenantStorage.js";

let mockStorage: ITenantStorage;

vi.mock("../../tenantStorage.js", () => ({
  getTenantStorage: () => mockStorage,
}));

const { createChange, updateChangeStatus, mergeChange } =
  await import("../changeService.js");

describe("changeService", () => {
  const ctx = createMockCtx();

  beforeEach(() => {
    mockStorage = createMockStorage({
      getProjectById: vi.fn().mockResolvedValue({
        id: "project-1",
        tenantId: "tenant-uuid-1",
      }),
      getChangeById: vi.fn().mockResolvedValue({
        id: "change-1",
        tenantId: "tenant-uuid-1",
        projectId: "project-1",
        status: "Draft",
      }),
      updateChangeStatus: vi.fn().mockImplementation(async (id, status) => ({
        id,
        tenantId: "tenant-uuid-1",
        projectId: "project-1",
        status,
      })),
    });
  });

  describe("createChange", () => {
    it("creates a change with valid data", async () => {
      const change = await createChange(ctx, {
        title: "Test Change",
        projectId: "project-1",
      });
      expect(change.title).toBe("Test Change");
      expect(change.status).toBe("Draft");
    });

    it("rejects if project not found", async () => {
      mockStorage.getProjectById = vi.fn().mockResolvedValue(undefined);
      await expect(
        createChange(ctx, { title: "Test", projectId: "bad" })
      ).rejects.toThrow("Project not found");
    });
  });

  describe("updateChangeStatus", () => {
    it("allows Draft → Implementing", async () => {
      const result = await updateChangeStatus(ctx, "change-1", "Implementing");
      expect(result.status).toBe("Implementing");
    });

    it("E1: rejects transitions from Merged", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Merged",
      });
      await expect(
        updateChangeStatus(ctx, "change-1", "Draft")
      ).rejects.toThrow("Cannot modify a merged change");
    });

    it("rejects invalid transitions", async () => {
      await expect(
        updateChangeStatus(ctx, "change-1", "Merged")
      ).rejects.toThrow("Invalid status transition");
    });

    it("allows Validating → Ready", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Validating",
      });
      const result = await updateChangeStatus(ctx, "change-1", "Ready");
      expect(result.status).toBe("Ready");
    });
  });

  describe("mergeChange", () => {
    it("merges on successful execution", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Ready",
        projectId: "project-1",
      });
      const executeFn = vi.fn().mockResolvedValue({
        success: true,
        appliedCount: 2,
      });
      const result = await mergeChange(ctx, "change-1", executeFn);
      expect(result.status).toBe("Merged");
    });

    it("sets ValidationFailed on execution failure", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Ready",
        projectId: "project-1",
      });
      const executeFn = vi.fn().mockResolvedValue({
        success: false,
        error: "Field not found",
      });
      await expect(
        mergeChange(ctx, "change-1", executeFn)
      ).rejects.toThrow("Execution failed: Field not found");
      expect(mockStorage.updateChangeStatus).toHaveBeenCalledWith(
        "change-1",
        "ValidationFailed"
      );
    });

    it("E1: rejects merge of already-merged change", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Merged",
      });
      const executeFn = vi.fn();
      await expect(
        mergeChange(ctx, "change-1", executeFn)
      ).rejects.toThrow("Change is already merged");
      expect(executeFn).not.toHaveBeenCalled();
    });
  });
});
