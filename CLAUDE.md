# EC3L — Enterprise Control Plane

## Project Identity

EC3L is a **stateless, multi-tenant control plane** for managing structured metadata changes across enterprise environments. Think "ServiceNow primitives, rebuilt for determinism and change safety." All mutations to record types, workflows, forms, and configuration flow through a **Change → PatchOp → Execute** pipeline. Every mutation is auditable, deterministic, and reversible via pre-execution snapshots.

## Grounding Instruction

On startup, read the `ai-context/` folder files (00 through 08, 99, GPT-Plan) to understand the platform architecture, invariants, API contracts, and operational subsystems before writing any code.

## North Star

**Correctness, auditability, and execution safety** over UI convenience.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Express, TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod (via Drizzle) |
| Testing | Vitest |
| Client | React, Vite |
| Routing (client) | Wouter |
| Data fetching | TanStack Query |

## Hard Prohibitions

From `ai-context/99-master-prompt.md`:

- **No sessions/cookies** — tenant context comes exclusively from `x-tenant-id` header
- **No mutating Merged changes** — terminal, immutable state
- **No skipping project validation** during execution
- **No DB writes during Transform phase** — Phase 2 is pure
- **No letting agents execute changes** — agents author, humans approve and merge
- **No deleting executed patch ops** — audit trail preservation
- **No nullable FKs on core entities** that logically require a parent
- **No duplicate patch ops** for the same field within a change
- **No deriving snapshot project_id from the record type** — use the change's project_id
- **No conflating `/execute` (testing) with `/merge` (production transition)**

## Invariant Reference

All invariants are defined in `ai-context/02-invariants.md` and `ai-context/08-operational-subsystems.md`.

| Range | Domain |
|-------|--------|
| D1-D9 | Data invariants (schema constraints, field types, selectors) |
| E1-E7 | Execution invariants (immutability, atomicity, determinism, snapshots) |
| P1-P7 | Project invariants (cross-project guards, base type scoping) |
| T1-T6 | Tenant invariants (resolution, scoping, statelessness) |
| R1-R3 | RBAC invariants (agent guard, per-tenant roles, system bypass) |
| O1-O95 | Operational subsystem invariants (events, workflows, timers, graph, vibe, promotions) |

## Key File Locations

| File | Purpose |
|------|---------|
| `shared/schema.ts` | All Drizzle table definitions, Zod insert schemas, TypeScript types |
| `server/index.ts` | Express entry point |
| `server/routes.ts` | All route handlers |
| `server/middleware/tenant.ts` | Tenant resolution middleware (slug → UUID) |
| `server/tenantStorage.ts` | Tenant-scoped data access factory |
| `server/storage.ts` | Raw storage (non-tenant-scoped) |
| `server/services/changeService.ts` | Change CRUD + merge flow |
| `server/services/patchOpService.ts` | Patch op CRUD + guards |
| `server/services/recordTypeService.ts` | Record type creation + validation |
| `server/services/changeTargetService.ts` | Change target creation + guards |
| `server/services/rbacService.ts` | RBAC permission checks |
| `server/services/agentGuardService.ts` | Agent action restrictions |
| `server/executors/patchOpExecutor.ts` | 3-phase execution engine (Load → Transform → Persist) |
| `server/services/workflowEngine.ts` | Workflow step execution |
| `server/graph/` | Graph layer, install engine, promotions |
| `server/vibe/` | AI authoring (Vibe Studio) services |
| `client/src/App.tsx` | React router shell |
| `client/src/lib/queryClient.ts` | TanStack Query client + API helpers |
| `ai-context/` | Architecture docs (read before coding) |

## Core Primitives

- **Tenant** — isolated org unit, resolved from `x-tenant-id` slug
- **Project** — groups record types and changes
- **Record Type** — project-scoped metadata definition with typed fields and optional base-type inheritance
- **Change** — unit of work, groups targets and patch ops, flows through state machine
- **Change Target** — points a change at a record type or file
- **Patch Op** — atomic typed mutation: `set_field`, `add_field`, `remove_field`, `rename_field`, `edit_file`
- **Snapshot** — pre-execution schema capture per record type per change

## State Machine

```
Draft → Implementing → WorkspaceRunning → Validating → Ready → Merged (terminal)
                                                      ↘ ValidationFailed
```

## Testing Conventions

- **Framework**: Vitest
- **Unit tests**: Fully mocked storage — no DB required
- **Test location**: `server/**/*.test.ts`
- **Integration tests**: curl-based flows in `ai-context/06-testing-playbook.md`
- **Run**: `npx vitest run`
