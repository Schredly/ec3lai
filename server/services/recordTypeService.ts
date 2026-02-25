import type { TenantContext, RecordType } from "../../shared/schema.js";
import { VALID_FIELD_TYPES } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

interface FieldDefinition {
  name: string;
  type: string;
  required?: boolean;
}

interface RecordTypeSchema {
  fields?: FieldDefinition[];
}

/**
 * P3: Record type creation requires an existing project.
 * P6: Base types must belong to the same project.
 * D2: Key unique per tenant+project.
 * D3: Name unique per tenant.
 * D8: Field types constrained to known set.
 */
export async function createRecordType(
  ctx: TenantContext,
  data: {
    key: string;
    name: string;
    projectId: string;
    description?: string | null;
    baseType?: string | null;
    schema?: RecordTypeSchema;
  }
): Promise<RecordType> {
  const storage = getTenantStorage(ctx);

  // P3: Validate project exists
  const project = await storage.getProjectById(data.projectId);
  if (!project) {
    throw new ServiceError("Project not found", 404);
  }

  // D2: Check key uniqueness per tenant+project
  const existingByKey = await storage.getRecordTypeByKeyAndProject(
    data.key,
    data.projectId
  );
  if (existingByKey) {
    throw new ServiceError(
      `Record type with key "${data.key}" already exists`,
      409
    );
  }

  // D3: Check name uniqueness per tenant
  const existingByName = await storage.getRecordTypeByName(data.name);
  if (existingByName) {
    throw new ServiceError(
      `Record type with name "${data.name}" already exists`,
      409
    );
  }

  // D8: Validate field types
  if (data.schema?.fields) {
    for (const field of data.schema.fields) {
      if (!VALID_FIELD_TYPES.includes(field.type as any)) {
        throw new ServiceError(
          `Invalid field type "${field.type}". Allowed types: ${VALID_FIELD_TYPES.join(", ")}`,
          400
        );
      }
    }
  }

  // P6: Base type must belong to the same project and tenant
  if (data.baseType) {
    const baseRT = await storage.getRecordTypeByKeyAndProject(
      data.baseType,
      data.projectId
    );
    if (!baseRT) {
      throw new ServiceError(
        `Base type "${data.baseType}" not found`,
        404
      );
    }
  }

  return storage.createRecordType({
    key: data.key,
    name: data.name,
    projectId: data.projectId,
    description: data.description ?? null,
    baseType: data.baseType ?? null,
    schema: data.schema ?? { fields: [] },
  });
}

export async function getRecordTypes(ctx: TenantContext): Promise<RecordType[]> {
  const storage = getTenantStorage(ctx);
  return storage.getRecordTypes();
}

export async function getRecordTypeById(
  ctx: TenantContext,
  id: string
): Promise<RecordType | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getRecordTypeById(id);
}

export async function getRecordTypeByKey(
  ctx: TenantContext,
  key: string
): Promise<RecordType | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getRecordTypeByKey(key);
}

export async function activateRecordType(
  ctx: TenantContext,
  id: string
): Promise<RecordType | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.updateRecordTypeStatus(id, "active");
}

export async function retireRecordType(
  ctx: TenantContext,
  id: string
): Promise<RecordType | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.updateRecordTypeStatus(id, "retired");
}
