import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface Props {
  tenantSlug: string;
  onClose: () => void;
  onNavigate: (target: string) => void;
  onSwitchTenant?: (slug: string) => void;
}

export default function CommandPalette({ tenantSlug, onClose, onNavigate, onSwitchTenant }: Props) {
  const [search, setSearch] = useState("");

  // Fetch tenants for switching
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const res = await fetch("/api/tenants");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch agents for toggling
  const { data: agents } = useQuery({
    queryKey: ["agents", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/agents", { tenantSlug });
      return res.json();
    },
  });

  // Fetch installed apps / record types for switching
  const { data: recordTypes } = useQuery({
    queryKey: ["recordTypes", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/record-types", { tenantSlug });
      return res.json();
    },
  });

  // Fetch vibe drafts for "Create App (AI)" context
  const { data: drafts } = useQuery({
    queryKey: ["vibeDrafts", tenantSlug],
    queryFn: async () => {
      const res = await apiRequest("/vibe/drafts", { tenantSlug });
      return res.json();
    },
  });

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function runAndClose(fn: () => void) {
    fn();
    onClose();
  }

  async function toggleAgent(agent: any) {
    const newStatus = agent.status === "active" ? "paused" : "active";
    try {
      await apiRequest(`/agents/${agent.id}/status`, {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* noop */ }
    onClose();
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <Command label="Command Palette" shouldFilter>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command..."
            style={inputStyle}
            autoFocus
          />

          <Command.List style={listStyle}>
            <Command.Empty style={emptyStyle}>No results found.</Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigate" style={groupStyle}>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("dashboard"))}>
                <span style={iconSpan}>⊞</span> Dashboard
              </CommandItem>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("apps"))}>
                <span style={iconSpan}>◫</span> Apps
              </CommandItem>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("builder"))}>
                <span style={iconSpan}>✦</span> Builder
              </CommandItem>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("agents"))}>
                <span style={iconSpan}>⬡</span> Agents
              </CommandItem>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("graph"))}>
                <span style={iconSpan}>◈</span> Graph
              </CommandItem>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("manage"))}>
                <span style={iconSpan}>⚙</span> Settings
              </CommandItem>
            </Command.Group>

            {/* Switch App */}
            {(recordTypes ?? []).length > 0 && (
              <Command.Group heading="Switch App" style={groupStyle}>
                {(recordTypes ?? []).map((rt: any) => (
                  <CommandItem
                    key={rt.id}
                    onSelect={() => runAndClose(() => onNavigate(`app:${rt.key}`))}
                  >
                    <span style={iconSpan}>◫</span> {rt.name}
                    <span style={badgeStyle}>installed</span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* AI Actions */}
            <Command.Group heading="AI / Builder" style={groupStyle}>
              <CommandItem onSelect={() => runAndClose(() => onNavigate("builder"))}>
                <span style={iconSpan}>✦</span> Create App (AI)
              </CommandItem>
              {(drafts ?? []).map((d: any) => (
                <CommandItem
                  key={d.id}
                  onSelect={() => runAndClose(() => onNavigate("builder"))}
                >
                  <span style={iconSpan}>✎</span> Edit Draft: {d.name}
                  <span style={{ ...badgeStyle, background: "rgba(255,200,50,0.15)", color: "#e0b030" }}>draft</span>
                </CommandItem>
              ))}
            </Command.Group>

            {/* Agent Toggle */}
            {(agents ?? []).length > 0 && (
              <Command.Group heading="Agents" style={groupStyle}>
                {(agents ?? []).map((agent: any) => (
                  <CommandItem
                    key={agent.id}
                    onSelect={() => toggleAgent(agent)}
                  >
                    <span style={iconSpan}>⬡</span>
                    {agent.status === "active" ? "Pause" : "Activate"}: {agent.name}
                    <span style={{
                      ...badgeStyle,
                      background: agent.status === "active" ? "rgba(40,167,69,0.15)" : "rgba(255,255,255,0.06)",
                      color: agent.status === "active" ? "#28a745" : "#666",
                    }}>
                      {agent.status}
                    </span>
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* Switch Tenant */}
            {onSwitchTenant && (tenants ?? []).length > 0 && (
              <Command.Group heading="Switch Tenant" style={groupStyle}>
                {(tenants ?? []).map((t: any) => (
                  <CommandItem
                    key={t.id}
                    onSelect={() => runAndClose(() => onSwitchTenant!(t.slug))}
                  >
                    <span style={iconSpan}>⊕</span> {t.slug}
                    {t.slug === tenantSlug && <span style={{ ...badgeStyle, background: "rgba(99,132,255,0.15)", color: "#6384ff" }}>current</span>}
                  </CommandItem>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({ onSelect, children }: { onSelect: () => void; children: React.ReactNode }) {
  return (
    <Command.Item onSelect={onSelect} style={itemStyle}>
      {children}
    </Command.Item>
  );
}

// Global keyboard shortcut hook
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onOpen]);
}

/* --- Styles --- */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  paddingTop: "12vh",
  zIndex: 9999,
};

const dialogStyle: React.CSSProperties = {
  width: "560px",
  maxWidth: "90vw",
  maxHeight: "480px",
  background: "#161628",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
  overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.9rem 1.1rem",
  border: "none",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  background: "transparent",
  color: "#e0e0f0",
  fontSize: "0.92rem",
  outline: "none",
  boxSizing: "border-box",
};

const listStyle: React.CSSProperties = {
  maxHeight: "380px",
  overflow: "auto",
  padding: "0.35rem 0",
};

const emptyStyle: React.CSSProperties = {
  padding: "2rem 1rem",
  textAlign: "center",
  color: "#555",
  fontSize: "0.82rem",
};

const groupStyle: React.CSSProperties = {
  padding: "0.3rem 0",
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  width: "100%",
  padding: "0.55rem 1.1rem",
  border: "none",
  background: "transparent",
  color: "#c0c0d0",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "0.84rem",
};

const iconSpan: React.CSSProperties = {
  fontSize: "0.85rem",
  width: "18px",
  textAlign: "center",
  flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "0.65rem",
  padding: "0.1rem 0.45rem",
  borderRadius: "4px",
  background: "rgba(40,167,69,0.15)",
  color: "#28a745",
  fontWeight: 500,
};
