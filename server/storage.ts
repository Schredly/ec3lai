import type { Tenant } from "../shared/schema.js";

/**
 * Raw (non-tenant-scoped) storage interface.
 * Used for operations that span tenants (e.g., listing tenants).
 */
export interface IStorage {
  getTenants(): Promise<Tenant[]>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantById(id: string): Promise<Tenant | undefined>;
}

let _storage: IStorage | null = null;

export function setStorage(storage: IStorage): void {
  _storage = storage;
}

export function getStorage(): IStorage {
  if (!_storage) {
    throw new Error("Storage not initialized. Call setStorage() first.");
  }
  return _storage;
}
