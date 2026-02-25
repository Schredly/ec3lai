import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, createMockStorage } from "./testHelpers.js";
import type { ITenantStorage } from "../../tenantStorage.js";

let mockStorage: ITenantStorage;

vi.mock("../../tenantStorage.js", () => ({
  getTenantStorage: () => mockStorage,
}));

// Import after mock
const { createRecordType, getRecordTypes, getRecordTypeByKey } =
  await import("../recordTypeService.js");

describe("recordTypeService", () => {
  const ctx = createMockCtx();

  beforeEach(() => {
    mockStorage = createMockStorage({
      getProjectById: vi.fn().mockResolvedValue({
        id: "project-1",
        tenantId: "tenant-uuid-1",
        name: "Test Project",
      }),
    });
  });

  describe("createRecordType", () => {
    it("creates a record type with valid data", async () => {
      const rt = await createRecordType(ctx, {
        key: "incident",
        name: "Incident",
        projectId: "project-1",
        schema: { fields: [{ name: "title", type: "string", required: true }] },
      });
      expect(rt.key).toBe("incident");
      expect(mockStorage.createRecordType).toHaveBeenCalledOnce();
    });

    it("P3: rejects if project not found", async () => {
      mockStorage.getProjectById = vi.fn().mockResolvedValue(undefined);
      await expect(
        createRecordType(ctx, {
          key: "incident",
          name: "Incident",
          projectId: "nonexistent",
        })
      ).rejects.toThrow("Project not found");
    });

    it("D2: rejects duplicate key within same project", async () => {
      (mockStorage.getRecordTypeByKeyAndProject as any).mockResolvedValue({
        id: "existing",
        key: "incident",
      });
      await expect(
        createRecordType(ctx, {
          key: "incident",
          name: "Incident New",
          projectId: "project-1",
        })
      ).rejects.toThrow('Record type with key "incident" already exists');
    });

    it("D3: rejects duplicate name within tenant", async () => {
      (mockStorage.getRecordTypeByName as any).mockResolvedValue({
        id: "existing",
        name: "Incident",
      });
      await expect(
        createRecordType(ctx, {
          key: "incident-2",
          name: "Incident",
          projectId: "project-1",
        })
      ).rejects.toThrow('Record type with name "Incident" already exists');
    });

    it("D8: rejects invalid field types", async () => {
      await expect(
        createRecordType(ctx, {
          key: "incident",
          name: "Incident",
          projectId: "project-1",
          schema: { fields: [{ name: "bad", type: "invalid_type" }] },
        })
      ).rejects.toThrow('Invalid field type "invalid_type"');
    });

    it("P6: rejects base type from different project", async () => {
      // getRecordTypeByKeyAndProject returns undefined for baseType in same project
      (mockStorage.getRecordTypeByKeyAndProject as any).mockResolvedValue(undefined);
      await expect(
        createRecordType(ctx, {
          key: "incident",
          name: "Incident",
          projectId: "project-1",
          baseType: "task",
        })
      ).rejects.toThrow('Base type "task" not found');
    });

    it("P6: accepts base type from same project", async () => {
      // First call checks for duplicate key, second checks base type
      (mockStorage.getRecordTypeByKeyAndProject as any)
        .mockResolvedValueOnce(undefined) // key check
        .mockResolvedValueOnce({ id: "rt-base", key: "task", projectId: "project-1" }); // baseType check
      const rt = await createRecordType(ctx, {
        key: "incident",
        name: "Incident",
        projectId: "project-1",
        baseType: "task",
      });
      expect(rt.key).toBe("incident");
    });
  });

  describe("getRecordTypes", () => {
    it("returns all record types", async () => {
      (mockStorage.getRecordTypes as any).mockResolvedValue([
        { id: "rt-1", key: "task" },
      ]);
      const types = await getRecordTypes(ctx);
      expect(types).toHaveLength(1);
    });
  });
});
