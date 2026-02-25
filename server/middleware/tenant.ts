import type { Request, Response, NextFunction } from "express";
import type { TenantContext } from "../../shared/schema.js";
import { getStorage } from "../storage.js";

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/** Paths that do not require tenant resolution */
const EXEMPT_PATHS = ["/api/tenants", "/api/health"];

function isExempt(path: string, method: string): boolean {
  return EXEMPT_PATHS.some(
    (p) => path === p || path.startsWith(p + "/")
  ) && method === "GET";
}

/**
 * Tenant resolution middleware.
 * T1: Resolves slug → UUID via DB lookup
 * T3: Missing header → 401
 * T4: Unknown slug → 404
 * T6: No sessions/cookies — header only
 */
export function tenantResolution() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip tenant resolution for exempt paths
    if (isExempt(req.path, req.method)) {
      return next();
    }

    const slug = req.headers["x-tenant-id"] as string | undefined;

    // T3: Missing tenant header → 401
    if (!slug) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    try {
      const storage = getStorage();
      const tenant = await storage.getTenantBySlug(slug);

      // T4: Unknown slug → 404
      if (!tenant) {
        return res
          .status(404)
          .json({ error: `Tenant '${slug}' not found` });
      }

      // Determine actor type
      const agentId = req.headers["x-agent-id"] as string | undefined;
      const userId = req.headers["x-user-id"] as string | undefined;

      // T1, T6: Build tenant context from headers only
      req.tenantContext = {
        tenantId: tenant.id,
        userId: agentId ? undefined : userId,
        agentId,
        actorType: agentId ? "agent" : "user",
        source: "header",
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
