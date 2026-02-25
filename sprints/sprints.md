NORTH STAR (Reframed)

We are evolving from:

Platform primitives + drafts + modules

To:

Enterprise Vibe Coding System
→ Agent-aware
→ Tenant-safe
→ Promotion-governed
→ UX simple enough for builders
→ Powerful enough for CIOs

PHASE 1 — MAKE IT USABLE
Sprint 1 — Builder Experience Simplification
Goal

Turn the current UI into a clear “Enterprise Builder Workspace”
Remove cognitive overload.
Establish mental model:

Tenant

App

Draft

Graph

Agent

Claude Prompt — Sprint 1
We are evolving EC3L into an enterprise vibe-coding system.

Your task:
Refactor the current UI into a clean "Enterprise Builder Workspace".

Constraints:
- Stateless control plane
- URL-scoped tenancy
- No client-supplied tenant IDs
- Must preserve existing draft + graph + version infrastructure

Design requirements:

1. Introduce a 3-panel layout:
   - Left: Tenant + App Navigator
   - Center: Builder Canvas (Draft view)
   - Right: Context Panel (Graph, Events, Agent status)

2. Simplify terminology:
   Replace technical internal labels with:
   - "Apps"
   - "Versions"
   - "Promote"
   - "Agents"
   - "Graph"

3. Create a clear App Dashboard:
   - List apps for tenant
   - Show status: Draft / Installed / Promoted
   - Show last modified
   - Show agent status (inactive / running)

4. Do NOT rewrite platform logic.
   Only reorganize UI components and routes.

Output:
- File modifications required
- Component tree refactor
- Updated routing structure
- Any new components needed
- No placeholders. Must integrate with current data hooks.
Acceptance Criteria

Tenant switching remains intact

Draft versions visible

No raw technical identifiers shown

Cognitive load reduced

PHASE 2 — VIBE CODING LAYER

Now we layer intelligence on top of primitives.

Sprint 2 — Natural Language App Creation
Goal

Allow user to type:

“Build an employee onboarding workflow with approval and laptop provisioning”

System generates:

Draft module

Graph nodes

Workflow primitives

Domain events

Using existing infrastructure.

Claude Prompt — Sprint 2
We are adding a Natural Language App Builder.

Goal:
Allow user to input a structured natural-language prompt that generates:

- A new draft app
- Graph nodes
- Workflow definitions
- Required domain events

Constraints:
- Must use existing draft + module creation services
- Must emit proper domain events
- Must respect tenant context
- Must not bypass promotion model

Implementation requirements:

1. Create a "New App (AI)" entry point in UI.
2. Add backend endpoint:
   POST /vibe/generate-app
   Input:
     { prompt: string }
   Output:
     Draft ID

3. Internally:
   - Parse prompt into structured intent
   - Map to:
       - Entities
       - Workflows
       - Events
       - Roles

4. Use deterministic transformation logic first.
   No external LLM call required in this sprint.
   Use rule-based generation.

5. Attach generated graph to draft.

Output:
- Backend endpoint implementation
- Draft generation logic
- Graph projection updates
- UI integration
- Domain event emission
Acceptance Criteria

New draft created from text

Graph renders correctly

Version history preserved

Fully tenant-safe

PHASE 3 — AGENT CONTROL PLANE

Now we add the missing layer most systems fail at.

Sprint 3 — Agent Registration & Execution Model
Goal

Introduce Agent definitions tied to apps.

Agents:

Listen to domain events

Execute workflows

Emit events

Respect tenancy

Log execution

Claude Prompt — Sprint 3
We are introducing the Agent Control Plane.

Goal:
Add first-class Agent definitions to EC3L.

Requirements:

1. Create Agent model:
   - id
   - tenant_id
   - app_id
   - status (inactive, active, paused)
   - subscribed_events[]
   - execution_policy
   - version

2. Agents must:
   - Subscribe to domain events
   - Execute workflow handlers
   - Emit new domain events

3. Add:
   - agentRegistry.ts
   - agentExecutionService.ts

4. Agents must:
   - Run in stateless fashion
   - Derive tenant context server-side
   - Never rely on client tenant headers

5. Add UI:
   - Agent panel per app
   - Toggle active/paused
   - Show last execution
   - Show event subscriptions

Output:
- Data model changes
- Migration required
- Backend services
- UI integration
- Domain event integration
Acceptance Criteria

Agent can subscribe to event

Event triggers execution

Execution logged

Agent respects tenant boundary

PHASE 4 — ENTERPRISE SAFETY

Now we prevent chaos.

Sprint 4 — Promotion-Governed Agent Deployment
Goal

Agents only activate when app version is promoted.

No draft agents executing.

Claude Prompt — Sprint 4
We are hardening enterprise governance.

Goal:
Agents may only execute against promoted versions.

Requirements:

1. Extend promotion system:
   - When app promoted, agent version snapshot created
   - Agents bound to installed graph snapshot

2. Draft agents must:
   - Be editable
   - Never execute

3. Modify agentExecutionService:
   - Validate agent version is installed
   - Reject execution otherwise

4. UI:
   - Clear visual difference:
       Draft Agent
       Installed Agent
       Promoted Agent

5. Emit domain event:
   agent.version_installed

Output:
- Service modifications
- Guard clauses
- UI state indicators
- Tests
Acceptance Criteria

Draft cannot execute

Installed version executes

Promotion updates agent binding

PHASE 5 — EXECUTIVE UX

Now make it board-ready.

Sprint 5 — Operational Dashboard
Goal

Enterprise visibility layer.

Show:

Active agents

Event throughput

Workflow success rate

SLA breaches

Error rates

Promotion history

Claude Prompt — Sprint 5
We are building the Enterprise Operations Dashboard.

Requirements:

1. Create dashboard route per tenant.
2. Show:
   - Active agents count
   - Events processed (24h)
   - Failed executions
   - Average workflow duration
   - Promotion timeline

3. Must use existing domain event store.
4. No synthetic data.
5. Charts simple but clean.

Output:
- API endpoints
- UI components
- Queries required
- Any index optimizations needed
PHASE 6 — TRUE VIBE EXPERIENCE

Now we make it magical.

Sprint 6 — Live Graph Editing + AI Refactor
Goal

User edits graph visually.
AI suggests improvements.

Claude Prompt — Sprint 6
We are adding visual graph editing.

Requirements:

1. Allow drag/drop node editing.
2. Allow connecting events to workflows.
3. On change:
   - Update draft version
   - Emit draft.modified event

4. Add:
   "Refactor with AI" button
   - Analyze graph
   - Suggest:
       - missing approvals
       - redundant events
       - unused nodes

5. No external LLM in this sprint.
   Use rule-based structural analysis.

Output:
- UI modifications
- Draft update logic
- Graph diff integration
- Version bump behavior
OVERALL STRATEGIC SEQUENCE
Phase	Focus	Why
1	Usability	Remove friction
2	AI Builder	Deliver vibe coding
3	Agent Model	Add intelligence
4	Governance	Enterprise safety
5	Visibility	CIO confidence
6	Live Refactor	Competitive moat