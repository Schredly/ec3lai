import { Route, Switch, Redirect } from "wouter";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import ContextPanel from "./components/ContextPanel";
import AppDashboard from "./pages/apps/dashboard";
import RecordList from "./pages/apps/record-list";
import RecordDetail from "./pages/apps/record-detail";
import ManageApps from "./pages/apps/manage";
import VibeStudio from "./pages/vibe-studio";
import AgentPanel from "./pages/agents/agent-panel";
import Dashboard from "./pages/dashboard";

/**
 * Wraps a tenant page in the 3-panel layout.
 */
function TenantLayout({
  tenantSlug,
  children,
  showContext = false,
}: {
  tenantSlug: string;
  children: React.ReactNode;
  showContext?: boolean;
}) {
  return (
    <Layout
      sidebar={<Sidebar tenantSlug={tenantSlug} />}
      main={children}
      context={showContext ? <ContextPanel tenantSlug={tenantSlug} /> : undefined}
    />
  );
}

export default function App() {
  return (
    <Switch>
      {/* Apps Dashboard */}
      <Route path="/t/:tenantSlug/apps">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug} showContext>
            <AppDashboard tenantSlug={params.tenantSlug} />
          </TenantLayout>
        )}
      </Route>

      {/* Record List */}
      <Route path="/t/:tenantSlug/apps/:appKey/records/:recordTypeKey">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug}>
            <RecordList
              tenantSlug={params.tenantSlug}
              appKey={params.appKey}
              recordTypeKey={params.recordTypeKey}
            />
          </TenantLayout>
        )}
      </Route>

      {/* Record Detail */}
      <Route path="/t/:tenantSlug/apps/:appKey/records/:recordTypeKey/:recordId">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug}>
            <RecordDetail
              tenantSlug={params.tenantSlug}
              recordId={params.recordId}
            />
          </TenantLayout>
        )}
      </Route>

      {/* Manage / Install */}
      <Route path="/t/:tenantSlug/manage">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug}>
            <ManageApps tenantSlug={params.tenantSlug} />
          </TenantLayout>
        )}
      </Route>

      {/* Build (Vibe Studio) */}
      <Route path="/t/:tenantSlug/build">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug} showContext>
            <VibeStudio tenantSlug={params.tenantSlug} />
          </TenantLayout>
        )}
      </Route>

      {/* Agents */}
      <Route path="/t/:tenantSlug/agents">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug} showContext>
            <AgentPanel tenantSlug={params.tenantSlug} />
          </TenantLayout>
        )}
      </Route>

      {/* Legacy route redirect */}
      <Route path="/t/:tenantSlug/vibe">
        {(params) => <Redirect to={`/t/${params.tenantSlug}/build`} />}
      </Route>

      {/* Dashboard */}
      <Route path="/t/:tenantSlug/dashboard">
        {(params) => (
          <TenantLayout tenantSlug={params.tenantSlug}>
            <Dashboard tenantSlug={params.tenantSlug} />
          </TenantLayout>
        )}
      </Route>

      {/* Landing — redirect to default tenant */}
      <Route path="/">
        <Redirect to="/t/default/apps" />
      </Route>
      <Route>
        <Redirect to="/t/default/apps" />
      </Route>
    </Switch>
  );
}
