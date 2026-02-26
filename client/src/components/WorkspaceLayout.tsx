import { Group, Panel, Separator } from "react-resizable-panels";
import GlobalTopBar from "./GlobalTopBar";
import LeftNav from "./LeftNav";
import RightContextPanel from "./RightContextPanel";

interface Props {
  tenantSlug: string;
  activeSection: string;
  activeTab: string;
  onNavigate: (section: string) => void;
  onCommandPalette?: () => void;
  children: React.ReactNode;
}

export default function WorkspaceLayout({
  tenantSlug,
  activeSection,
  activeTab,
  onNavigate,
  onCommandPalette,
  children,
}: Props) {
  return (
    <div style={shellStyle}>
      <GlobalTopBar tenantSlug={tenantSlug} onCommandPalette={onCommandPalette} />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Group orientation="horizontal">
          {/* Left Nav */}
          <Panel defaultSize={15} minSize={4} maxSize={25} collapsible>
            <LeftNav tenantSlug={tenantSlug} activeSection={activeSection} onNavigate={onNavigate} />
          </Panel>

          <Separator style={handleStyle} />

          {/* Main Canvas */}
          <Panel defaultSize={65} minSize={40}>
            <div style={canvasStyle}>
              {children}
            </div>
          </Panel>

          <Separator style={handleStyle} />

          {/* Right Context Panel */}
          <Panel defaultSize={20} minSize={4} maxSize={30} collapsible>
            <RightContextPanel tenantSlug={tenantSlug} activeTab={activeTab} />
          </Panel>
        </Group>
      </div>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  width: "100vw",
  background: "#0a0a18",
  color: "#e0e0f0",
  overflow: "hidden",
};

const canvasStyle: React.CSSProperties = {
  height: "100%",
  overflow: "auto",
  background: "#13132a",
  padding: "1.25rem",
};

const handleStyle: React.CSSProperties = {
  width: "1px",
  background: "rgba(255,255,255,0.04)",
  cursor: "col-resize",
  transition: "background 0.2s",
};
