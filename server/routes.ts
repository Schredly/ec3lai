import type { Express, Request, Response } from "express";

/** Helper to safely extract a route param as string */
function param(req: Request, name: string): string {
  return req.params[name] as string;
}
import { tenantResolution } from "./middleware/tenant.js";
import { getStorage } from "./storage.js";
import { getTenantStorage } from "./tenantStorage.js";
import * as projectService from "./services/projectService.js";
import * as recordTypeService from "./services/recordTypeService.js";
import * as changeService from "./services/changeService.js";
import * as changeTargetService from "./services/changeTargetService.js";
import * as patchOpService from "./services/patchOpService.js";
import * as rbacService from "./services/rbacService.js";
import * as recordInstanceService from "./services/recordInstanceService.js";
import * as workflowService from "./services/workflowService.js";
import * as workflowEngine from "./services/workflowEngine.js";
import * as triggerService from "./services/triggerService.js";
import * as graphService from "./graph/graphService.js";
import * as installService from "./graph/installService.js";
import * as promotionService from "./graph/promotionService.js";
import * as promotionIntentService from "./graph/promotionIntentService.js";
import { builtinPackages } from "./graph/builtinPackages.js";
import * as vibeService from "./vibe/vibeService.js";
import * as vibeDraftService from "./vibe/vibeDraftService.js";
import * as repairService from "./vibe/repairService.js";
import * as multiVariantService from "./vibe/multiVariantService.js";
import * as variantDiffService from "./vibe/variantDiffService.js";
import * as tokenStreamService from "./vibe/tokenStreamService.js";
import * as draftVersionDiffService from "./vibe/draftVersionDiffService.js";
import { listTemplates, getTemplatePrompt } from "./vibe/vibeTemplates.js";
import { applyDraftPatchOps } from "./vibe/draftPatchOps.js";
import { assertNotAgent, AgentGuardError } from "./services/agentGuardService.js";
import { ServiceError } from "./services/recordTypeService.js";
import { RbacError } from "./services/rbacService.js";
import { executePatchOps } from "./executors/patchOpExecutor.js";

/** Error handler utility */
function handleError(res: Response, err: unknown): void {
  if (err instanceof ServiceError) {
    res.status(err.statusCode).json({ error: err.message });
  } else if (err instanceof AgentGuardError) {
    res.status(err.statusCode).json({ error: err.message });
  } else if (err instanceof RbacError) {
    res.status(err.statusCode).json({ error: err.message });
  } else if (err instanceof Error) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } else {
    res.status(500).json({ error: "Internal server error" });
  }
}

export function registerRoutes(app: Express): void {
  // ─── Tenant resolution middleware ───────────────────────────────────
  app.use(tenantResolution());

  // ─── Health check ───────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ─── Tenants ────────────────────────────────────────────────────────

  app.get("/api/tenants", async (_req, res) => {
    try {
      const storage = getStorage();
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Projects ───────────────────────────────────────────────────────

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const project = await projectService.createProject(ctx, req.body);
      res.status(201).json(project);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const projects = await projectService.getProjects(ctx);
      res.json(projects);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const project = await projectService.getProjectById(ctx, param(req, "id"));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(
    "/api/projects/:id/changes",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const changes = await changeService.getChangesByProject(
          ctx,
          param(req, "id")
        );
        res.json(changes);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Changes ────────────────────────────────────────────────────────

  app.post("/api/changes", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const change = await changeService.createChange(ctx, req.body);
      res.status(201).json(change);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/changes", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const changes = await changeService.getChanges(ctx);
      res.json(changes);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/changes/:id", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const change = await changeService.getChangeById(ctx, param(req, "id"));
      if (!change) {
        return res.status(404).json({ error: "Change not found" });
      }
      res.json(change);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(
    "/api/changes/:id/status",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { status } = req.body;
        const change = await changeService.updateChangeStatus(
          ctx,
          param(req, "id"),
          status
        );
        res.json(change);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Change Targets ─────────────────────────────────────────────────

  app.post(
    "/api/changes/:id/targets",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const target = await changeTargetService.createChangeTarget(
          ctx,
          param(req, "id"),
          req.body
        );
        res.status(201).json(target);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.get(
    "/api/changes/:id/targets",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const targets = await changeTargetService.getChangeTargets(
          ctx,
          param(req, "id")
        );
        res.json(targets);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Patch Ops ──────────────────────────────────────────────────────

  app.post(
    "/api/changes/:id/patch-ops",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const op = await patchOpService.createPatchOp(
          ctx,
          param(req, "id"),
          req.body
        );
        res.status(201).json(op);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.get(
    "/api/changes/:id/patch-ops",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const ops = await patchOpService.getChangePatchOps(
          ctx,
          param(req, "id")
        );
        res.json(ops);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.delete(
    "/api/changes/:id/patch-ops/:opId",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        await patchOpService.deletePatchOp(
          ctx,
          param(req, "id"),
          param(req, "opId")
        );
        res.status(204).send();
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Execution ──────────────────────────────────────────────────────

  app.post(
    "/api/changes/:id/execute",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const result = await executePatchOps(ctx, param(req, "id"));
        if (!result.success) {
          return res.status(422).json({ error: `Execution failed: ${result.error}` });
        }
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/changes/:id/merge",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;

        // RBAC: change.approve and agent guard
        assertNotAgent(ctx, "approve changes");
        await rbacService.authorize(ctx, "change.approve");

        const merged = await changeService.mergeChange(
          ctx,
          param(req, "id"),
          executePatchOps
        );
        res.json(merged);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/changes/:id/checkin",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;

        // RBAC: change.approve
        assertNotAgent(ctx, "approve changes");
        await rbacService.authorize(ctx, "change.approve");

        const change = await changeService.updateChangeStatus(
          ctx,
          param(req, "id"),
          "Ready"
        );
        res.json(change);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Record Types ───────────────────────────────────────────────────

  app.post("/api/record-types", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const rt = await recordTypeService.createRecordType(ctx, req.body);
      res.status(201).json(rt);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/record-types", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const types = await recordTypeService.getRecordTypes(ctx);
      res.json(types);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(
    "/api/record-types/by-key/:key",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const rt = await recordTypeService.getRecordTypeByKey(
          ctx,
          param(req, "key")
        );
        if (!rt) {
          return res.status(404).json({ error: "Record type not found" });
        }
        res.json(rt);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/record-types/:id/activate",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const rt = await recordTypeService.activateRecordType(
          ctx,
          param(req, "id")
        );
        if (!rt) {
          return res.status(404).json({ error: "Record type not found" });
        }
        res.json(rt);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/record-types/:id/retire",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const rt = await recordTypeService.retireRecordType(
          ctx,
          param(req, "id")
        );
        if (!rt) {
          return res.status(404).json({ error: "Record type not found" });
        }
        res.json(rt);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── RBAC ───────────────────────────────────────────────────────────

  app.post("/api/rbac/seed-defaults", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      await rbacService.seedDefaults(ctx);
      res.json({ message: "Default RBAC configuration seeded" });
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Record Instances ───────────────────────────────────────────────

  app.post("/api/record-instances", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const instance = await recordInstanceService.createRecordInstance(
        ctx,
        req.body
      );
      res.status(201).json(instance);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(
    "/api/record-instances/by-type/:recordTypeId",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const instances = await recordInstanceService.getRecordInstances(
          ctx,
          param(req, "recordTypeId")
        );
        res.json(instances);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.get(
    "/api/record-instances/:id",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const instance = await recordInstanceService.getRecordInstanceById(
          ctx,
          param(req, "id")
        );
        if (!instance) {
          return res.status(404).json({ error: "Record instance not found" });
        }
        res.json(instance);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.patch(
    "/api/record-instances/:id",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const instance = await recordInstanceService.updateRecordInstance(
          ctx,
          param(req, "id"),
          req.body
        );
        res.json(instance);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Workflow Definitions ───────────────────────────────────────────

  app.post(
    "/api/workflow-definitions",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const wf = await workflowService.createWorkflowDefinition(
          ctx,
          req.body
        );
        res.status(201).json(wf);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.get(
    "/api/workflow-definitions",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const wfs = await workflowService.getWorkflowDefinitions(ctx);
        res.json(wfs);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/workflow-definitions/:id/steps",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const step = await workflowService.createWorkflowStep(
          ctx,
          param(req, "id"),
          req.body
        );
        res.status(201).json(step);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/workflow-definitions/:id/execute",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        assertNotAgent(ctx, "execute workflows");
        await rbacService.authorize(ctx, "workflow.execute");
        const result = await workflowEngine.executeWorkflow(
          ctx,
          param(req, "id"),
          req.body
        );
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/workflow-executions/:id/resume",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        assertNotAgent(ctx, "approve workflow steps");
        await rbacService.authorize(ctx, "workflow.approve");
        const result = await workflowEngine.resumeWorkflow(
          ctx,
          param(req, "id")
        );
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Triggers ───────────────────────────────────────────────────────

  app.post("/api/triggers", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const trigger = await triggerService.createTrigger(ctx, req.body);
      res.status(201).json(trigger);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/triggers", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const triggers = await triggerService.getTriggers(ctx);
      res.json(triggers);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(
    "/api/triggers/:id/fire",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        assertNotAgent(ctx, "fire triggers");
        await triggerService.fireTrigger(ctx, param(req, "id"), req.body);
        res.json({ message: "Trigger fired" });
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Graph ──────────────────────────────────────────────────────────

  app.get("/api/graph/snapshot", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      await rbacService.authorize(ctx, "admin.view");
      const snapshot = await graphService.getGraphSnapshot(ctx);
      res.json(snapshot);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/graph/summary", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      await rbacService.authorize(ctx, "admin.view");
      const summary = await graphService.getGraphSummary(ctx);
      res.json(summary);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/graph/validate", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      await rbacService.authorize(ctx, "admin.view");
      const result = await graphService.validateCurrentGraph(ctx);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Package Install ────────────────────────────────────────────────

  app.post("/api/packages/install", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { packageKey, projectId } = req.body;
      const pkg = builtinPackages.find((p) => p.key === packageKey);
      if (!pkg) {
        return res.status(404).json({ error: `Package "${packageKey}" not found` });
      }
      const result = await installService.installPackage(ctx, pkg, projectId);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(
    "/api/packages/install-custom",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { package: pkg, projectId } = req.body;
        const result = await installService.installPackage(ctx, pkg, projectId);
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.get("/api/packages/available", async (_req: Request, res: Response) => {
    res.json(
      builtinPackages.map((p) => ({
        key: p.key,
        name: p.name,
        version: p.version,
        description: p.description,
      }))
    );
  });

  // ─── Environments ───────────────────────────────────────────────────

  app.get("/api/environments", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const envs = await promotionService.getEnvironments(ctx);
      res.json(envs);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/environments", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const env = await promotionService.createEnvironment(ctx, req.body);
      res.status(201).json(env);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Promotion Intents ──────────────────────────────────────────────

  app.get("/api/promotion-intents", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const intents = await promotionIntentService.getPromotionIntents(ctx);
      res.json(intents);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/promotion-intents", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const intent = await promotionIntentService.createPromotionIntent(
        ctx,
        req.body
      );
      res.status(201).json(intent);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(
    "/api/promotion-intents/:id/transition",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { status } = req.body;
        const intent = await promotionIntentService.transitionIntent(
          ctx,
          param(req, "id"),
          status
        );
        res.json(intent);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Vibe: Templates ────────────────────────────────────────────────

  app.get("/api/vibe/templates", async (_req: Request, res: Response) => {
    res.json(listTemplates());
  });

  // ─── Vibe: Generate ─────────────────────────────────────────────────

  app.post("/api/vibe/generate", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { prompt, templateKey } = req.body;
      const finalPrompt = templateKey
        ? getTemplatePrompt(templateKey) ?? prompt
        : prompt;

      if (!finalPrompt) {
        return res.status(400).json({ error: "prompt or templateKey required" });
      }

      const result = await vibeService.generatePackage(ctx, finalPrompt);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post(
    "/api/vibe/generate-with-repair",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { prompt } = req.body;
        const result = await repairService.generateWithRepair(ctx, prompt);
        res.json(result);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post("/api/vibe/install", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { package: pkg, projectId } = req.body;
      const result = await vibeService.installGeneratedPackage(
        ctx,
        pkg,
        projectId
      );
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/vibe/refine", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { package: pkg, refinement } = req.body;
      const result = await vibeService.refinePackage(ctx, pkg, refinement);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Vibe: Variants ────────────────────────────────────────────────

  app.post("/api/vibe/variants", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { prompt, count } = req.body;
      const variants = await multiVariantService.generateVariants(
        ctx,
        prompt,
        count
      );
      res.json(variants);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/vibe/variants/diff", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { a, b } = req.body;
      const diff = variantDiffService.diffVariants(ctx, a, b);
      res.json(diff);
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Vibe: Streaming ───────────────────────────────────────────────

  app.post("/api/vibe/stream", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const { prompt } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const event of tokenStreamService.streamGeneration(
        ctx,
        prompt
      )) {
        res.write(`event: ${event.type}\ndata: ${event.data}\n\n`);
      }

      res.end();
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Vibe: Drafts ──────────────────────────────────────────────────

  app.get("/api/vibe/drafts", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const drafts = await vibeDraftService.getVibeDrafts(ctx);
      res.json(drafts);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.post("/api/vibe/drafts", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const draft = await vibeDraftService.createVibeDraft(ctx, req.body);
      res.status(201).json(draft);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get("/api/vibe/drafts/:id", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const draft = await vibeDraftService.getVibeDraftById(
        ctx,
        param(req, "id")
      );
      if (!draft) {
        return res.status(404).json({ error: "Draft not found" });
      }
      res.json(draft);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.patch("/api/vibe/drafts/:id", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      const draft = await vibeDraftService.updateVibeDraft(
        ctx,
        param(req, "id"),
        req.body
      );
      res.json(draft);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.delete("/api/vibe/drafts/:id", async (req: Request, res: Response) => {
    try {
      const ctx = req.tenantContext!;
      await vibeDraftService.discardVibeDraft(ctx, param(req, "id"));
      res.status(204).send();
    } catch (err) {
      handleError(res, err);
    }
  });

  // ─── Vibe: Draft Versions ──────────────────────────────────────────

  app.get(
    "/api/vibe/drafts/:id/versions",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const versions = await vibeDraftService.getVibeDraftVersions(
          ctx,
          param(req, "id")
        );
        res.json(versions);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/vibe/drafts/:id/restore",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { versionNumber } = req.body;
        const draft = await vibeDraftService.restoreVersion(
          ctx,
          param(req, "id"),
          versionNumber
        );
        res.json(draft);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  app.post(
    "/api/vibe/drafts/:id/patch",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { ops } = req.body;
        const draft = await vibeDraftService.getVibeDraftById(
          ctx,
          param(req, "id")
        );
        if (!draft) {
          return res.status(404).json({ error: "Draft not found" });
        }

        const result = applyDraftPatchOps(
          draft.packageJson as any,
          ops
        );

        if (result.errors.length > 0) {
          return res.status(422).json({ errors: result.errors });
        }

        const updated = await vibeDraftService.updateVibeDraft(
          ctx,
          param(req, "id"),
          { packageJson: result.package }
        );
        res.json(updated);
      } catch (err) {
        handleError(res, err);
      }
    }
  );

  // ─── Vibe: Draft Version Diff ──────────────────────────────────────

  app.post(
    "/api/vibe/drafts/:id/diff",
    async (req: Request, res: Response) => {
      try {
        const ctx = req.tenantContext!;
        const { fromVersion, toVersion } = req.body;
        const diff = await draftVersionDiffService.diffVersions(
          ctx,
          param(req, "id"),
          fromVersion,
          toVersion
        );
        res.json(diff);
      } catch (err) {
        handleError(res, err);
      }
    }
  );
}
