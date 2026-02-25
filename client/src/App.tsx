import { Route, Switch } from "wouter";
import AppLauncher from "./pages/apps/launcher";
import RecordList from "./pages/apps/record-list";
import RecordDetail from "./pages/apps/record-detail";
import ManageApps from "./pages/apps/manage";
import VibeStudio from "./pages/vibe-studio";

export default function App() {
  return (
    <Switch>
      {/* Apps Runtime */}
      <Route path="/t/:tenantSlug/apps">
        {(params) => <AppLauncher tenantSlug={params.tenantSlug} />}
      </Route>
      <Route path="/t/:tenantSlug/apps/:appKey/records/:recordTypeKey">
        {(params) => (
          <RecordList
            tenantSlug={params.tenantSlug}
            appKey={params.appKey}
            recordTypeKey={params.recordTypeKey}
          />
        )}
      </Route>
      <Route path="/t/:tenantSlug/apps/:appKey/records/:recordTypeKey/:recordId">
        {(params) => (
          <RecordDetail
            tenantSlug={params.tenantSlug}
            recordId={params.recordId}
          />
        )}
      </Route>

      {/* Manage / Install */}
      <Route path="/t/:tenantSlug/manage">
        {(params) => <ManageApps tenantSlug={params.tenantSlug} />}
      </Route>

      {/* Vibe Studio */}
      <Route path="/t/:tenantSlug/vibe">
        {(params) => <VibeStudio tenantSlug={params.tenantSlug} />}
      </Route>

      {/* Landing */}
      <Route>
        <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
          <h1>EC3L</h1>
          <p>Enterprise Control Plane</p>
          <p>Navigate to <code>/t/default/apps</code> to get started.</p>
        </div>
      </Route>
    </Switch>
  );
}
