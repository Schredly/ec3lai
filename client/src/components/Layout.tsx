import type { ReactNode } from "react";

interface Props {
  sidebar: ReactNode;
  main: ReactNode;
  context?: ReactNode;
}

/**
 * 3-panel Enterprise Builder Workspace layout.
 * Left: Tenant + App Navigator
 * Center: Builder Canvas
 * Right: Context Panel (Graph, Events, Agent status)
 */
export default function Layout({ sidebar, main, context }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: context ? "240px 1fr 300px" : "240px 1fr",
        height: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: "#1a1a2e",
        background: "#f8f9fb",
      }}
    >
      {/* Left: Navigator */}
      <aside
        style={{
          background: "#1a1a2e",
          color: "#e0e0e0",
          padding: "1rem 0",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sidebar}
      </aside>

      {/* Center: Builder Canvas */}
      <main
        style={{
          overflowY: "auto",
          padding: "1.5rem 2rem",
        }}
      >
        {main}
      </main>

      {/* Right: Context Panel */}
      {context && (
        <aside
          style={{
            background: "#fff",
            borderLeft: "1px solid #e5e7eb",
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          {context}
        </aside>
      )}
    </div>
  );
}
