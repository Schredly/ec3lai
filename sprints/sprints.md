🧭 EC3L Enterprise Layout Spec (Follow This Exactly)
1️⃣ Global Top Bar

Minimal. Strategic. No clutter.

Left:

Tenant selector (dropdown)

App name

Version badge (Draft / Installed / Promoted)

Center:

Command search (⌘K powered by cmdk)

Right:

Promote button

Agent status indicator

User avatar

No breadcrumbs.
No deep nesting.

2️⃣ Left Navigation — App Context

Collapsible.
Radix-based.
Icon + label.

Sections:

Dashboard

Apps

Agents

Graph

Events

Settings

Apps expands:

App list

New App (AI)

Active app highlighted.

3️⃣ Main Canvas — Builder Surface

This is the heart.

Tabs (Radix Tabs):

Builder

Graph

Agents

Versions

Each tab feels like a workspace, not a page reload.

Use:

react-resizable-panels

motion transitions

Subtle background contrast shift

4️⃣ Right Context Panel

This is where enterprise power lives.

Context-sensitive.

If in Builder:

Draft metadata

Domain events emitted

Promotion warnings

If in Graph:

Node inspector

Connected events

SLA policies

If in Agents:

Event subscriptions

Execution policy

Logs

Panel must be collapsible.

🎯 UX Philosophy

The Figma layout suggests:

High contrast

Soft radius

Layered dark backgrounds

No heavy borders

Use elevation, not lines

Micro motion

Hover transitions

This must feel like:

“Modern control system”
not
“Old enterprise CRUD app”

🚀 Now: Implementation Sprints to Align UI

We will adjust your sprint plan to follow the Figma UX.

Sprint A — Structural Refactor to Figma Layout
Claude Prompt
We are aligning EC3L UI to the new Figma layout.

Requirements:

1. Implement global 3-panel layout using:
   - LeftNav
   - MainCanvas
   - RightContextPanel

2. Use react-resizable-panels for:
   - Adjustable left and right panes

3. Add GlobalTopBar:
   - Tenant selector
   - App name
   - Version badge
   - Promote button
   - Agent status
   - Command palette trigger

4. Convert existing routes to workspace tabs:
   - Builder
   - Graph
   - Agents
   - Versions

5. Preserve:
   - URL-scoped tenancy
   - Draft/version state
   - Promotion logic
   - Domain events

6. Do NOT change backend logic.
   Only refactor UI structure.

Output:
- File tree changes
- Updated layout component
- Updated route structure
- Required imports from shadcn/ui
Sprint B — Command-Driven UX (⌘K Everything)

Enterprise vibe coding requires command-first.

Claude Prompt
Add a global command palette using cmdk.

Must support:
- Switch tenant
- Switch app
- Create app (AI)
- Promote current draft
- Toggle agent
- Navigate tabs

Implementation:
- Global CommandProvider
- Keyboard shortcut (⌘K)
- Actions mapped to existing services

Must respect tenant isolation.
No client-supplied tenant IDs.
Sprint C — Visual Graph Editor Alignment

You already have graph.

Now align visuals:

Refactor graph UI to follow Figma aesthetic.

Requirements:
- Soft grid background
- Rounded nodes
- Shadow elevation
- Node hover states
- Event connectors animated
- Right panel inspector

Must integrate with existing graph snapshot system.
No rewrite of graph engine.
Sprint D — Agent Panel Redesign

Agents must feel like a control tower.

Refactor Agent UI to:

- Show status badges
- Show event subscriptions
- Show execution count
- Show last run
- Show bound version

Add toggle for active/paused.
Visual difference between:
- Draft agent
- Installed agent
- Promoted agent
Sprint E — Dashboard View

Use recharts (already installed).

Create tenant dashboard view.

Show:
- Events processed
- Agent executions
- Failures
- Promotions over time

Use recharts.
No synthetic data.
Must query existing domain event store.
⚡ Critical Alignment With Your North Star

This Figma layout supports your:

Stateless control plane

Multi-tenant isolation

Draft → Installed → Promoted lifecycle

Agent orchestration

Graph-first modeling

But only if:

You do NOT let the UI devolve into page-based routing chaos.

This must feel:

Workspace-based.
Command-driven.
Agent-aware.
Promotion-governed.

🧠 Final Strategic Advice

You are not building:

“Another CRUD app builder.”

You are building:

The Enterprise Vibe Operating System

So the UI must communicate:

Power

Control

Intelligence

Governance

Safety

All at once.