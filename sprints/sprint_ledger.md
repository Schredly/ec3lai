# Sprint Ledger

## Sprint 1 — Builder Experience Simplification ✅

**Status:** Complete
**Date:** 2026-02-24

### What was completed:

1. **3-Panel Layout** (`client/src/components/Layout.tsx`)
   - Left: Tenant + App Navigator (240px sidebar)
   - Center: Builder Canvas (flexible main area)
   - Right: Context Panel (300px, Graph/Events/Agents summary — shown on Apps & Build pages)

2. **Sidebar Navigator** (`client/src/components/Sidebar.tsx`)
   - EC3L branding with "Enterprise Builder" subtitle
   - Tenant display (slug-based)
   - Navigation: Apps, Build, Manage, Dashboard — with active state highlighting
   - Installed Apps list (quick links to record types)
   - Drafts list (quick links to builder)

3. **Context Panel** (`client/src/components/ContextPanel.tsx`)
   - Graph summary: Record Types count, Active/Draft breakdown, Environments count
   - Promotions feed: recent promotion intents with status badges
   - Agents section: placeholder for Sprint 3

4. **App Dashboard** (`client/src/pages/apps/dashboard.tsx`)
   - Replaced old launcher with table-based dashboard
   - Shows: Name, Key, Status (with color-coded badges), Fields count, Last Modified, Agents
   - Drafts shown in card grid below installed apps
   - "New App (AI)" and "Install Package" action buttons

5. **Terminology Simplification**
   - "Vibe Studio" → "Build"
   - Route `/t/:slug/vibe` → `/t/:slug/build` (with redirect for backward compat)
   - Added "Dashboard" route placeholder for Sprint 5
   - Removed technical labels; using Apps/Versions/Promote/Agents/Graph

6. **Route Refactor** (`client/src/App.tsx`)
   - All routes wrapped in `TenantLayout` with sidebar + optional context panel
   - Landing page (`/`) redirects to `/t/default/apps`
   - Legacy `/vibe` route redirects to `/build`

7. **Component Cleanup**
   - Removed inline nav bars from record-list, record-detail, manage, vibe-studio
   - All pages now rely on the sidebar for navigation

### Acceptance Criteria Met:
- [x] Tenant switching remains intact (URL-scoped)
- [x] Draft versions visible (in sidebar + dashboard)
- [x] No raw technical identifiers shown (simplified labels)
- [x] Cognitive load reduced (3-panel layout, clear navigation)
- [x] TypeScript compiles cleanly
- [x] All 52 tests pass

---

## Sprint 2 — Natural Language App Creation ✅

**Status:** Complete
**Date:** 2026-02-24

### What was completed:

1. **Rule-Based Generator** (`server/vibe/ruleBasedGenerator.ts`)
   - `parsePrompt()`: Extracts app name, entities, workflows, events, and roles from natural language
   - 12 entity patterns (employee, department, onboarding, ticket, request, asset, approval, project, vendor, invoice, PTO, incident)
   - 5 workflow patterns (approval, onboarding, provisioning, escalation, notification)
   - 6 role patterns (admin, manager, approver, viewer, editor, agent)
   - Auto-generates domain events from detected entities and workflows
   - Fallback: creates generic entity if no patterns match

2. **Backend Endpoints**
   - `POST /api/vibe/generate-app` — Creates a draft app from a text prompt using rule-based generation
   - `POST /api/vibe/parse-prompt` — Preview endpoint: returns parsed intent without creating anything
   - Both fully tenant-scoped, emit domain events

3. **Draft Integration**
   - Creates a `VibePackageDraft` with the generated package JSON
   - Creates initial version (v1) for version history
   - Package JSON matches `GraphPackage` schema for future install compatibility

4. **UI: "New App (AI)" Tab** (`client/src/pages/vibe-studio.tsx`)
   - New tab in Build page: "New App (AI)"
   - Text prompt input with "Preview" and "Create App" buttons
   - Live preview panel showing detected entities, workflows, events, and roles
   - On creation: redirects to draft detail view
   - Styled tab bar replacing plain buttons

5. **Domain Event** (`vibe.app_generated`)
   - Added to `DomainEventType` union
   - Added `metadata` field to `DomainEvent` interface for extensible event data
   - Emitted on successful app generation with prompt, app name, entity/workflow counts

### Acceptance Criteria Met:
- [x] New draft created from text prompt
- [x] Graph renders correctly (package JSON with record types, workflows)
- [x] Version history preserved (initial version created)
- [x] Fully tenant-safe (tenant context from middleware)
- [x] TypeScript compiles cleanly
- [x] All 52 tests pass

---

## Sprint 3 — Agent Registration & Execution Model ✅

**Status:** Complete
**Date:** 2026-02-24

### What was completed:

1. **Agent Data Model** (`shared/schema.ts`)
   - `agents` table: id, tenant_id, app_id, name, status (inactive/active/paused), subscribed_events (JSONB), execution_policy (JSONB), version, last_execution_at, last_execution_status, created_at, updated_at
   - `agent_execution_logs` table: id, tenant_id, agent_id, event_type, status, duration_ms, input/output (JSONB), error, created_at
   - Types: `Agent`, `AgentExecutionLog` exported

2. **Agent Registry Service** (`server/services/agentRegistryService.ts`)
   - `createAgent()` — registers agent with tenant context, emits `agent.registered`
   - `updateAgentStatus()` — toggle active/paused/inactive, emits `agent.status_changed`
   - `updateAgentSubscriptions()` — update subscribed event types
   - `getAgents()`, `getAgentById()` — tenant-scoped queries

3. **Agent Execution Service** (`server/services/agentExecutionService.ts`)
   - `executeAgent()` — executes agent handler for a domain event, logs success/failure, updates agent last execution, emits `agent.execution_completed` or `agent.execution_failed`
   - `wireAgentSubscriptions()` — subscribes active agents to their event types via domain event pub-sub, respects tenant boundary
   - `getAgentExecutionLogs()` — fetch execution history per agent

4. **Domain Event Integration** (`server/services/domainEventService.ts`)
   - Added event types: `agent.registered`, `agent.status_changed`, `agent.execution_completed`, `agent.execution_failed`, `agent.version_installed`

5. **API Routes** (`server/routes.ts`)
   - `GET /api/agents` — list agents for tenant
   - `POST /api/agents` — register new agent
   - `POST /api/agents/:id/status` — toggle agent status
   - `POST /api/agents/:id/subscriptions` — update event subscriptions
   - `GET /api/agents/:id/logs` — get execution logs

6. **Storage Layer**
   - Added agent methods to `ITenantStorage` interface (`server/tenantStorage.ts`)
   - Drizzle implementations in `server/drizzleStorage.ts`: getAgents, getAgentById, createAgent, updateAgent, getAgentExecutionLogs, createAgentExecutionLog
   - Mock implementations in `server/services/__tests__/testHelpers.ts`

7. **Agent Panel UI** (`client/src/pages/agents/agent-panel.tsx`)
   - Create agent form: name + subscribed events (comma-separated)
   - Agent table: Name (clickable), Status badge, Event subscription count, Last execution timestamp + status, Activate/Pause toggle
   - Execution logs viewer: Event type, Status badge, Duration (ms), Timestamp
   - Shows most recent 20 logs per agent

8. **UI Integration**
   - Added "Agents" nav item to sidebar (`client/src/components/Sidebar.tsx`)
   - Added `/t/:tenantSlug/agents` route to App.tsx with context panel
   - Updated ContextPanel (`client/src/components/ContextPanel.tsx`) — real agent counts (Total/Active/Paused) and agent list with status badges, replacing placeholder

### Acceptance Criteria Met:
- [x] Agent can subscribe to events (via subscribed_events field + wireAgentSubscriptions)
- [x] Event triggers execution (domain event pub-sub wiring)
- [x] Execution logged (agent_execution_logs table + createAgentExecutionLog)
- [x] Agent respects tenant boundary (server-side ctx, tenant_id scoping)
- [x] TypeScript compiles cleanly
- [x] All 52 tests pass

---

## Sprint 4 — Promotion-Governed Agent Deployment ✅

**Status:** Complete
**Date:** 2026-02-24

### What was completed:

1. **Agent Version Binding** (`shared/schema.ts`)
   - Added `bound_package_install_id` column to `agents` table (FK → graphPackageInstalls)
   - Agents start as "draft" (null binding) and become "installed" when bound to a promoted package version

2. **Execution Guard** (`server/services/agentExecutionService.ts`)
   - Draft agents (no `boundPackageInstallId`) cannot execute — returns `{ success: false, error: "draft agent" }`
   - Logs rejected execution with status "rejected"
   - Emits `agent.execution_failed` with rejection reason

3. **Activation Guard** (`server/services/agentRegistryService.ts`)
   - `updateAgentStatus()` rejects activating draft agents — throws "Cannot activate a draft agent"
   - Only agents with a bound package install version can be set to "active"

4. **Version Binding Service** (`server/services/agentRegistryService.ts`)
   - `bindAgentToVersion(ctx, agentId, packageInstallId)` — binds agent to installed version
   - Increments agent version on each binding
   - Emits `agent.version_installed` domain event with metadata

5. **Promotion Integration** (`server/graph/promotionIntentService.ts`)
   - When promotion intent transitions to "executed", `bindAgentsOnPromotion()` is called
   - Finds all agents linked to installed packages and binds them to the package install
   - Agents become executable only after promotion execution

6. **Admin Bind Endpoint** (`server/routes.ts`)
   - `POST /api/agents/:id/bind` — manually bind agent to a package install (admin use)

7. **UI: Visual Agent Distinction** (`client/src/pages/agents/agent-panel.tsx`)
   - New "Binding" column in agent table
   - `AgentBindingBadge` component: "Draft" (dashed border, gray) vs "Installed (vN)" (blue badge)
   - Draft agents show "Promote to activate" instead of Activate button
   - Only installed agents show Activate/Pause toggle

8. **Storage Updates**
   - `ITenantStorage.updateAgent()` — accepts `boundPackageInstallId` in update data
   - `DrizzleTenantStorage.updateAgent()` — persists binding column
   - Test helper mock includes `boundPackageInstallId: null` default

### Acceptance Criteria Met:
- [x] Draft agents cannot execute (guard rejects with logged error)
- [x] Installed version executes (bound agents pass guard)
- [x] Promotion updates agent binding (bindAgentsOnPromotion on intent execution)
- [x] TypeScript compiles cleanly
- [x] All 52 tests pass

---

## Sprint 5 — Operational Dashboard ✅

**Status:** Complete
**Date:** 2026-02-24

### What was completed:

1. **Dashboard Service** (`server/services/dashboardService.ts`)
   - `getDashboardStats(ctx)` — aggregates all operational metrics for a tenant
   - Agent stats: total, active, paused, inactive, draft vs installed counts
   - Event stats: 24h event count + breakdown by event type
   - Execution stats: total, completed, failed, rejected counts + avg duration (ms)
   - Workflow stats: completed count + avg duration
   - Promotion stats: counts by status + recent timeline (last 10)

2. **Telemetry Read Method**
   - Added `getTelemetryEvents(since?: Date)` to `ITenantStorage` interface
   - Drizzle implementation with tenant-scoped `WHERE` + optional `created_at >= since` filter
   - Added `ExecutionTelemetryEvent` type export to shared schema

3. **Dashboard API Endpoint** (`server/routes.ts`)
   - `GET /api/dashboard/stats` — returns full `DashboardStats` object
   - Tenant-scoped via middleware

4. **Dashboard UI** (`client/src/pages/dashboard.tsx`)
   - **KPI Cards Row**: Active Agents (green), Events 24h (blue), Failed Executions (red), Avg Exec Duration (yellow)
   - **Agent Overview Panel**: 3x2 grid of mini-stats (Active, Paused, Inactive, Installed, Draft, Total)
   - **Workflow Stats Panel**: Completed 24h + Avg Duration
   - **Event Types Panel**: Table of top 10 event types by count, sorted descending
   - **Promotions Panel**: Status counts (Draft/Approved/Executed) + recent activity timeline with status badges
   - **Agent Executions Panel**: Total/Completed/Failed/Rejected breakdown
   - Auto-refreshes every 30 seconds

5. **Route Integration** (`client/src/App.tsx`)
   - Replaced dashboard placeholder with real `Dashboard` component
   - Full-width layout (no context panel — dashboard IS the visibility layer)

6. **Storage Updates**
   - `ITenantStorage` — added `getTelemetryEvents(since?: Date)` method
   - `DrizzleTenantStorage` — implementation with `gte()` filter on `createdAt`
   - Test helper mock — added `getTelemetryEvents` mock

### Acceptance Criteria Met:
- [x] Active agents count displayed (from real data)
- [x] Events processed 24h shown (from telemetry store)
- [x] Failed executions visible (from telemetry events)
- [x] Average workflow duration calculated (from telemetry metadata)
- [x] Promotion timeline displayed (from promotion intents)
- [x] No synthetic data — all from existing domain event store
- [x] TypeScript compiles cleanly
- [x] All 52 tests pass

---

## Sprint 6 — Live Graph Editing + AI Refactor ✅

**Status:** Complete
**Date:** 2026-02-24

### What was completed:

1. **Visual Graph Editor** (`client/src/components/GraphEditor.tsx`)
   - Interactive 2-column layout: Entities (left) + Workflows (right)
   - **Entity editing**: Add/remove entities, edit names, add/remove/edit fields (name, type dropdown with 8 types, required checkbox)
   - **Workflow editing**: Add/remove workflows, edit names, add/remove/reorder steps (6 step types)
   - **Events panel**: Add/remove domain events with tag-based display
   - **Roles panel**: Add/remove roles with tag-based display
   - **Dirty state tracking**: "Unsaved changes" indicator with Save button
   - Node type icons (E for Entity, W for Workflow) with color coding
   - Inline editing mode — click to expand field/step editors

2. **Refactor with AI** (`server/graph/graphRefactorService.ts`)
   - Rule-based structural analysis — 9 analysis patterns:
     - Missing approval workflows (governance)
     - Duplicate events detection
     - Entities without status fields
     - Entities without required fields
     - Entities without name/title fields
     - Orphan entities (not referenced by events or workflows)
     - Missing admin role
     - Empty workflow steps
     - Workflows without notification steps
     - Event-to-workflow coverage gaps
   - Returns typed `RefactorSuggestion[]` with type (warning/improvement/missing), category, message, nodeKey, and optional fix

3. **Refactor API Endpoint** (`server/routes.ts`)
   - `POST /api/graph/analyze` — accepts `packageJson`, returns `{ suggestions: RefactorSuggestion[] }`
   - No LLM dependency — pure structural analysis

4. **Draft View Overhaul** (`client/src/pages/vibe-studio.tsx`)
   - **View mode toggle**: "Visual Editor" (GraphEditor) vs "JSON" (raw JSON preview)
   - **Refactor with AI button**: Triggers analysis, displays suggestions in a dismissible info panel
   - **Suggestion display**: Color-coded badges (warning=yellow, missing=red, improvement=green) with fix suggestions
   - **Styled action buttons**: Install (green), Refactor (teal), Discard (red outline)
   - Draft updates emit `vibe.draft_patched` domain event (via existing updateDraft service)
   - Version bumps on each save (via existing version auto-snapshot)

5. **Version History UI Polish**
   - Styled table with uppercase headers matching design system
   - Timestamps formatted with toLocaleString()
   - Consistent button styles

### Acceptance Criteria Met:
- [x] User can edit graph visually (entities, fields, workflows, steps, events, roles)
- [x] Events can be connected to workflows (via shared event type references)
- [x] On change: draft version updated + domain event emitted
- [x] "Refactor with AI" analyzes graph and suggests improvements
- [x] Suggests missing approvals, redundant events, unused nodes
- [x] No external LLM — rule-based structural analysis
- [x] Version bump on save (existing auto-snapshot mechanism)
- [x] TypeScript compiles cleanly
- [x] All 52 tests pass

---

## All Sprints Complete

All 6 sprints across 6 phases have been implemented:
- Phase 1: Builder Experience Simplification
- Phase 2: Natural Language App Creation
- Phase 3: Agent Registration & Execution Model
- Phase 4: Promotion-Governed Agent Deployment
- Phase 5: Operational Dashboard
- Phase 6: Live Graph Editing + AI Refactor
