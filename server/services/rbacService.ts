import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

export class RbacError extends Error {
  public readonly statusCode = 403;
  constructor(permission: string) {
    super(`Access denied: required permission '${permission}'`);
    this.name = "RbacError";
  }
}

const DEFAULT_ROLES = [
  {
    name: "admin",
    permissions: [
      "form.view",
      "form.edit",
      "workflow.execute",
      "workflow.approve",
      "override.activate",
      "change.approve",
      "admin.view",
    ],
  },
  {
    name: "editor",
    permissions: ["form.view", "form.edit", "workflow.execute", "override.activate"],
  },
  {
    name: "viewer",
    permissions: ["form.view"],
  },
];

/**
 * R2: RBAC checks are per-tenant.
 * R3: System actors bypass RBAC.
 */
export async function authorize(
  ctx: TenantContext,
  permission: string
): Promise<void> {
  // R3: System actors bypass RBAC
  if (ctx.actorType === "system") {
    return;
  }

  const actorId = ctx.userId || ctx.agentId;
  if (!actorId) {
    throw new RbacError(permission);
  }

  const storage = getTenantStorage(ctx);
  const userRoles = await storage.getUserRoles(actorId);

  if (userRoles.length === 0) {
    // No roles assigned — check denied. Log audit.
    await storage.createAuditLogEntry({
      actor: actorId,
      action: "authorize",
      permission,
      granted: false,
    });
    throw new RbacError(permission);
  }

  // Load roles and check permissions
  const roles = await storage.getRoles();
  const assignedRoleIds = new Set(userRoles.map((ur) => ur.roleId));
  const assignedRoles = roles.filter((r) => assignedRoleIds.has(r.id));

  const hasPermission = assignedRoles.some((role) => {
    const perms = role.permissions as string[];
    return perms.includes(permission);
  });

  await storage.createAuditLogEntry({
    actor: actorId,
    action: "authorize",
    permission,
    granted: hasPermission,
  });

  if (!hasPermission) {
    throw new RbacError(permission);
  }
}

/**
 * Seeds default RBAC roles for a tenant. Idempotent.
 */
export async function seedDefaults(ctx: TenantContext): Promise<void> {
  const storage = getTenantStorage(ctx);

  for (const roleDef of DEFAULT_ROLES) {
    const existing = await storage.getRoleByName(roleDef.name);
    if (!existing) {
      await storage.createRole({
        name: roleDef.name,
        permissions: roleDef.permissions,
      });
    }
  }
}
