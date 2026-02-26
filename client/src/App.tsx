import { Route, Switch, Redirect, useLocation } from "wouter";
import { useState, useCallback } from "react";
import WorkspaceLayout from "./components/WorkspaceLayout";
import WorkspaceTabs from "./components/WorkspaceTabs";
import AppDashboard from "./pages/apps/dashboard";
import RecordList from "./pages/apps/record-list";
import RecordDetail from "./pages/apps/record-detail";
import ManageApps from "./pages/apps/manage";
import VibeStudio from "./pages/vibe-studio";
import AgentPanel from "./pages/agents/agent-panel";
import Dashboard from "./pages/dashboard";
import GraphEditor from "./components/GraphEditor";
import CommandPalette, { useCommandPaletteShortcut } from "./components/CommandPalette";

const WORKSPACE_TABS = [
  { key: "builder", label: "Builder" },
  { key: "graph", label: "Graph" },
  { key: "agents", label: "Agents" },
  { key: "versions", label: "Versions" },
];

function Workspace({ tenantSlug: initialTenantSlug }: { tenantSlug: string }) {
  const [, navigate] = useLocation();
  const [tenantSlug, setTenantSlug] = useState(initialTenantSlug);
  const [section, setSection] = useState("apps");
  const [activeTab, setActiveTab] = useState("builder");
  const [cmdOpen, setCmdOpen] = useState(false);

  // Track record navigation
  const [appKey, setAppKey] = useState<string | null>(null);
  const [rtKey, setRtKey] = useState<string | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);

  const handleNavigate = useCallback((target: string) => {
    // Reset record drill-in when switching sections
    setRecordId(null);
    setAppKey(null);
    setRtKey(null);

    if (target.startsWith("app:")) {
      const key = target.slice(4);
      setSection("apps");
      setAppKey(key);
      setRtKey(key);
      return;
    }
    setSection(target);
  }, []);

  const handleCommandPalette = useCallback(() => setCmdOpen(true), []);

  const handleSwitchTenant = useCallback((slug: string) => {
    setTenantSlug(slug);
    navigate(`/t/${slug}/apps`);
    setSection("apps");
    setAppKey(null);
    setRtKey(null);
    setRecordId(null);
  }, [navigate]);

  // Global ⌘K shortcut
  useCommandPaletteShortcut(handleCommandPalette);

  // Determine effective tab for context panel
  const effectiveTab = section === "builder" || section === "graph" || section === "agents" || section === "dashboard" || section === "manage"
    ? section === "manage" ? "versions" : section
    : activeTab;

  return (
    <>
      <WorkspaceLayout
        tenantSlug={tenantSlug}
        activeSection={section}
        activeTab={effectiveTab}
        onNavigate={handleNavigate}
        onCommandPalette={handleCommandPalette}
      >
        {/* Dashboard */}
        {section === "dashboard" && (
          <Dashboard tenantSlug={tenantSlug} />
        )}

        {/* Apps section */}
        {section === "apps" && !appKey && (
          <AppDashboard tenantSlug={tenantSlug} />
        )}

        {/* Record list for a specific app */}
        {section === "apps" && appKey && rtKey && !recordId && (
          <RecordList
            tenantSlug={tenantSlug}
            appKey={appKey}
            recordTypeKey={rtKey}
          />
        )}

        {/* Record detail */}
        {section === "apps" && recordId && (
          <RecordDetail tenantSlug={tenantSlug} recordId={recordId} />
        )}

        {/* Builder — workspace tabs */}
        {section === "builder" && (
          <>
            <WorkspaceTabs tabs={WORKSPACE_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
            {activeTab === "builder" && <VibeStudio tenantSlug={tenantSlug} />}
            {activeTab === "graph" && <GraphTab tenantSlug={tenantSlug} />}
            {activeTab === "agents" && <AgentPanel tenantSlug={tenantSlug} />}
            {activeTab === "versions" && <ManageApps tenantSlug={tenantSlug} />}
          </>
        )}

        {/* Standalone agent view */}
        {section === "agents" && (
          <AgentPanel tenantSlug={tenantSlug} />
        )}

        {/* Graph standalone view */}
        {section === "graph" && (
          <GraphTab tenantSlug={tenantSlug} />
        )}

        {/* Manage / Settings */}
        {section === "manage" && (
          <ManageApps tenantSlug={tenantSlug} />
        )}
      </WorkspaceLayout>

      {cmdOpen && (
        <CommandPalette
          tenantSlug={tenantSlug}
          onClose={() => setCmdOpen(false)}
          onNavigate={(target) => {
            handleNavigate(target);
            setCmdOpen(false);
          }}
          onSwitchTenant={handleSwitchTenant}
        />
      )}
    </>
  );
}

function GraphTab({ tenantSlug }: { tenantSlug: string }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", fontSize: "1.25rem", fontWeight: 700 }}>
        Graph Explorer
      </h2>
      <p style={{ color: "#666", fontSize: "0.85rem" }}>
        Visual graph view of installed record types, workflows, and their relationships.
        Edit graphs through the Builder tab.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Switch>
      {/* Workspace */}
      <Route path="/t/:tenantSlug/:rest*">
        {(params) => <Workspace tenantSlug={params.tenantSlug} />}
      </Route>
      <Route path="/t/:tenantSlug">
        {(params) => <Workspace tenantSlug={params.tenantSlug} />}
      </Route>

      {/* Landing */}
      <Route path="/">
        <Redirect to="/t/default/apps" />
      </Route>
      <Route>
        <Redirect to="/t/default/apps" />
      </Route>
    </Switch>
  );
}
