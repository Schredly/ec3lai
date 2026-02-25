import type { TenantContext } from "../../shared/schema.js";

/**
 * R1: Agents cannot perform approval or privileged actions.
 * Throws 403 for actors with actorType: "agent".
 */
export function assertNotAgent(ctx: TenantContext, action: string): void {
  if (ctx.actorType === "agent") {
    throw new AgentGuardError(
      `Agents are not permitted to ${action}`
    );
  }
}

export class AgentGuardError extends Error {
  public readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "AgentGuardError";
  }
}
