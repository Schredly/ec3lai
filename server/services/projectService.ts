import type { TenantContext, Project } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

export async function getProjects(ctx: TenantContext): Promise<Project[]> {
  const storage = getTenantStorage(ctx);
  return storage.getProjects();
}

export async function getProjectById(
  ctx: TenantContext,
  id: string
): Promise<Project | undefined> {
  const storage = getTenantStorage(ctx);
  return storage.getProjectById(id);
}

export async function createProject(
  ctx: TenantContext,
  data: {
    name: string;
    description?: string | null;
    githubRepo?: string | null;
    defaultBranch?: string | null;
  }
): Promise<Project> {
  const storage = getTenantStorage(ctx);
  return storage.createProject({
    name: data.name,
    description: data.description ?? null,
    githubRepo: data.githubRepo ?? null,
    defaultBranch: data.defaultBranch ?? null,
  });
}
