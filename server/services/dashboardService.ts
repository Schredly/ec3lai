import type { TenantContext } from "../../shared/schema.js";
import { getTenantStorage } from "../tenantStorage.js";

export interface DashboardStats {
  agents: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    draft: number;
    installed: number;
  };
  events: {
    total24h: number;
    byType: Record<string, number>;
  };
  executions: {
    total: number;
    failed: number;
    rejected: number;
    completed: number;
    avgDurationMs: number | null;
  };
  workflows: {
    total: number;
    avgDurationMs: number | null;
  };
  promotions: {
    total: number;
    draft: number;
    previewed: number;
    approved: number;
    executed: number;
    rejected: number;
    timeline: Array<{
      id: string;
      status: string;
      createdBy: string | null;
      approvedBy: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
}

export async function getDashboardStats(
  ctx: TenantContext
): Promise<DashboardStats> {
  const storage = getTenantStorage(ctx);

  const [agents, telemetry, promotions] = await Promise.all([
    storage.getAgents(),
    storage.getTelemetryEvents(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    storage.getPromotionIntents(),
  ]);

  // Agent stats
  const active = agents.filter((a) => a.status === "active").length;
  const paused = agents.filter((a) => a.status === "paused").length;
  const inactive = agents.filter((a) => a.status === "inactive").length;
  const draft = agents.filter((a) => !a.boundPackageInstallId).length;
  const installed = agents.filter((a) => !!a.boundPackageInstallId).length;

  // Event stats (24h)
  const byType: Record<string, number> = {};
  for (const evt of telemetry) {
    byType[evt.eventType] = (byType[evt.eventType] ?? 0) + 1;
  }

  // Agent execution stats from telemetry
  const agentExecEvents = telemetry.filter(
    (e) =>
      e.eventType === "agent.execution_completed" ||
      e.eventType === "agent.execution_failed"
  );
  const completedExecs = telemetry.filter(
    (e) => e.eventType === "agent.execution_completed"
  );
  const failedExecs = telemetry.filter(
    (e) => e.eventType === "agent.execution_failed"
  );
  const rejectedExecs = telemetry.filter(
    (e) =>
      e.eventType === "agent.execution_failed" &&
      (e.payload as any)?.status === "rejected"
  );

  // Avg duration from telemetry metadata
  const durations = completedExecs
    .map((e) => (e.payload as any)?.metadata?.durationMs ?? (e.payload as any)?.durationMs)
    .filter((d): d is number => typeof d === "number" && d > 0);
  const avgExecDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  // Workflow stats from telemetry
  const wfCompleted = telemetry.filter(
    (e) => e.eventType === "workflow.intent.completed"
  );
  const wfDurations = wfCompleted
    .map((e) => (e.payload as any)?.metadata?.durationMs ?? (e.payload as any)?.durationMs)
    .filter((d): d is number => typeof d === "number" && d > 0);
  const avgWfDuration =
    wfDurations.length > 0
      ? Math.round(wfDurations.reduce((a, b) => a + b, 0) / wfDurations.length)
      : null;

  // Promotion stats
  const promDraft = promotions.filter((p) => p.status === "draft").length;
  const promPreviewed = promotions.filter((p) => p.status === "previewed").length;
  const promApproved = promotions.filter((p) => p.status === "approved").length;
  const promExecuted = promotions.filter((p) => p.status === "executed").length;
  const promRejected = promotions.filter((p) => p.status === "rejected").length;
  const timeline = promotions
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      status: p.status,
      createdBy: p.createdBy,
      approvedBy: p.approvedBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

  return {
    agents: { total: agents.length, active, paused, inactive, draft, installed },
    events: { total24h: telemetry.length, byType },
    executions: {
      total: agentExecEvents.length,
      failed: failedExecs.length,
      rejected: rejectedExecs.length,
      completed: completedExecs.length,
      avgDurationMs: avgExecDuration,
    },
    workflows: {
      total: wfCompleted.length,
      avgDurationMs: avgWfDuration,
    },
    promotions: {
      total: promotions.length,
      draft: promDraft,
      previewed: promPreviewed,
      approved: promApproved,
      executed: promExecuted,
      rejected: promRejected,
      timeline,
    },
  };
}
