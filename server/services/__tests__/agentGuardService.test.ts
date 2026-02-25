import { describe, it, expect } from "vitest";
import { assertNotAgent, AgentGuardError } from "../agentGuardService.js";
import { createMockCtx, createAgentCtx } from "./testHelpers.js";

describe("agentGuardService", () => {
  it("R1: allows user actors", () => {
    const ctx = createMockCtx();
    expect(() => assertNotAgent(ctx, "approve changes")).not.toThrow();
  });

  it("R1: blocks agent actors", () => {
    const ctx = createAgentCtx();
    expect(() => assertNotAgent(ctx, "approve changes")).toThrow(
      AgentGuardError
    );
    expect(() => assertNotAgent(ctx, "approve changes")).toThrow(
      "Agents are not permitted to approve changes"
    );
  });

  it("R1: allows system actors", () => {
    const ctx = createMockCtx({ actorType: "system" });
    expect(() => assertNotAgent(ctx, "approve changes")).not.toThrow();
  });
});
