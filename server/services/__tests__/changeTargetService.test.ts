import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, createMockStorage } from "./testHelpers.js";
import type { ITenantStorage } from "../../tenantStorage.js";

let mockStorage: ITenantStorage;

vi.mock("../../tenantStorage.js", () => ({
  getTenantStorage: () => mockStorage,
}));

const { createChangeTarget, getChangeTargets } =
  await import("../changeTargetService.js");

describe("changeTargetService", () => {
  const ctx = createMockCtx();

  beforeEach(() => {
    mockStorage = createMockStorage({
      getChangeById: vi.fn().mockResolvedValue({
        id: "change-1",
        tenantId: "tenant-uuid-1",
        projectId: "project-1",
        status: "Draft",
      }),
    });
  });

  describe("createChangeTarget", () => {
    it("creates a record_type target", async () => {
      const target = await createChangeTarget(ctx, "change-1", {
        type: "record_type",
        selector: { recordTypeKey: "incident" },
      });
      expect(target.type).toBe("record_type");
      expect(target.projectId).toBe("project-1"); // P5: inherited from change
    });

    it("creates a file target", async () => {
      const target = await createChangeTarget(ctx, "change-1", {
        type: "file",
        selector: { filePath: "src/test.tsx" },
      });
      expect(target.type).toBe("file");
    });

    it("rejects targets on non-Draft changes", async () => {
      (mockStorage.getChangeById as any).mockResolvedValue({
        id: "change-1",
        status: "Implementing",
      });
      await expect(
        createChangeTarget(ctx, "change-1", {
          type: "record_type",
          selector: { recordTypeKey: "incident" },
        })
      ).rejects.toThrow("Change must be in Draft status to add targets");
    });

    it("D9: rejects invalid target types", async () => {
      await expect(
        createChangeTarget(ctx, "change-1", {
          type: "invalid",
          selector: {},
        })
      ).rejects.toThrow("Invalid target type");
    });

    it("D9: validates record_type selector requires recordTypeKey", async () => {
      await expect(
        createChangeTarget(ctx, "change-1", {
          type: "record_type",
          selector: {},
        })
      ).rejects.toThrow("recordTypeKey");
    });

    it("D9: validates file selector requires filePath", async () => {
      await expect(
        createChangeTarget(ctx, "change-1", {
          type: "file",
          selector: {},
        })
      ).rejects.toThrow("filePath");
    });
  });
});
