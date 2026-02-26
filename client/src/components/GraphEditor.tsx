import { useState, useCallback } from "react";

interface FieldDef {
  name: string;
  type: string;
  required?: boolean;
}

interface Entity {
  key: string;
  name: string;
  fields: FieldDef[];
}

interface Workflow {
  name: string;
  triggerType?: string;
  steps: { stepType: string; config?: Record<string, unknown> }[];
}

interface PackageJson {
  appName?: string;
  entities?: Entity[];
  workflows?: Workflow[];
  events?: string[];
  roles?: string[];
}

interface Props {
  packageJson: unknown;
  onSave: (updated: unknown) => void;
  saving?: boolean;
}

const FIELD_TYPES = ["string", "number", "boolean", "text", "date", "datetime", "choice", "reference"];
const STEP_TYPES = ["approval", "notification", "assignment", "validation", "transformation", "escalation"];

export default function GraphEditor({ packageJson, onSave, saving }: Props) {
  const pkg = (packageJson ?? {}) as PackageJson;
  const [entities, setEntities] = useState<Entity[]>(pkg.entities ?? []);
  const [workflows, setWorkflows] = useState<Workflow[]>(pkg.workflows ?? []);
  const [events, setEvents] = useState<string[]>(pkg.events ?? []);
  const [roles, setRoles] = useState<string[]>(pkg.roles ?? []);
  const [editingEntity, setEditingEntity] = useState<string | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  function handleSave() {
    onSave({
      ...pkg,
      entities,
      workflows,
      events,
      roles,
    });
    setDirty(false);
  }

  // ─── Entity Operations ────────────────────────────────────────────
  function addEntity() {
    const key = `entity_${entities.length + 1}`;
    setEntities([...entities, { key, name: `New Entity ${entities.length + 1}`, fields: [] }]);
    setEditingEntity(key);
    markDirty();
  }

  function removeEntity(key: string) {
    setEntities(entities.filter((e) => e.key !== key));
    setEvents(events.filter((ev) => !ev.startsWith(key + ".")));
    if (editingEntity === key) setEditingEntity(null);
    markDirty();
  }

  function updateEntity(key: string, updates: Partial<Entity>) {
    setEntities(entities.map((e) => (e.key === key ? { ...e, ...updates } : e)));
    markDirty();
  }

  function addField(entityKey: string) {
    const entity = entities.find((e) => e.key === entityKey);
    if (!entity) return;
    updateEntity(entityKey, {
      fields: [...entity.fields, { name: "", type: "string" }],
    });
  }

  function updateField(entityKey: string, fieldIdx: number, updates: Partial<FieldDef>) {
    const entity = entities.find((e) => e.key === entityKey);
    if (!entity) return;
    const fields = entity.fields.map((f, i) => (i === fieldIdx ? { ...f, ...updates } : f));
    updateEntity(entityKey, { fields });
  }

  function removeField(entityKey: string, fieldIdx: number) {
    const entity = entities.find((e) => e.key === entityKey);
    if (!entity) return;
    updateEntity(entityKey, { fields: entity.fields.filter((_, i) => i !== fieldIdx) });
  }

  // ─── Workflow Operations ──────────────────────────────────────────
  function addWorkflow() {
    setWorkflows([...workflows, { name: `New Workflow ${workflows.length + 1}`, steps: [] }]);
    setEditingWorkflow(workflows.length);
    markDirty();
  }

  function removeWorkflow(idx: number) {
    setWorkflows(workflows.filter((_, i) => i !== idx));
    if (editingWorkflow === idx) setEditingWorkflow(null);
    markDirty();
  }

  function updateWorkflow(idx: number, updates: Partial<Workflow>) {
    setWorkflows(workflows.map((w, i) => (i === idx ? { ...w, ...updates } : w)));
    markDirty();
  }

  function addStep(wfIdx: number) {
    const wf = workflows[wfIdx];
    updateWorkflow(wfIdx, { steps: [...wf.steps, { stepType: "notification" }] });
  }

  function removeStep(wfIdx: number, stepIdx: number) {
    const wf = workflows[wfIdx];
    updateWorkflow(wfIdx, { steps: wf.steps.filter((_, i) => i !== stepIdx) });
  }

  // ─── Events & Roles ──────────────────────────────────────────────
  function addEvent(event: string) {
    if (event.trim() && !events.includes(event.trim())) {
      setEvents([...events, event.trim()]);
      markDirty();
    }
  }

  function removeEvent(idx: number) {
    setEvents(events.filter((_, i) => i !== idx));
    markDirty();
  }

  function addRole(role: string) {
    if (role.trim() && !roles.includes(role.trim())) {
      setRoles([...roles, role.trim()]);
      markDirty();
    }
  }

  function removeRole(idx: number) {
    setRoles(roles.filter((_, i) => i !== idx));
    markDirty();
  }

  return (
    <div style={canvasWrap}>
      {/* Grid background pattern */}
      <div style={gridBg} />

      {/* Save bar */}
      <div style={saveBar(dirty)}>
        <span style={{ fontSize: "0.8rem", color: dirty ? "#e0b030" : "#555" }}>
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={saveBtnStyle(dirty)}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", position: "relative", zIndex: 1 }}>
        {/* Left: Entities */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <h3 style={sectionTitle}>Entities ({entities.length})</h3>
            <button onClick={addEntity} style={addBtnStyle}>+ Add Entity</button>
          </div>

          {entities.map((entity) => (
            <div key={entity.key} style={nodeCard(editingEntity === entity.key)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                  <NodeIcon type="entity" />
                  {editingEntity === entity.key ? (
                    <input
                      value={entity.name}
                      onChange={(e) => updateEntity(entity.key, { name: e.target.value })}
                      style={nodeInputStyle}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", color: "#e0e0f0" }} onClick={() => setEditingEntity(entity.key)}>
                      {entity.name}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => setEditingEntity(editingEntity === entity.key ? null : entity.key)} style={smallBtn}>{editingEntity === entity.key ? "Done" : "Edit"}</button>
                  <button onClick={() => removeEntity(entity.key)} style={{ ...smallBtn, color: "#ff4444" }}>x</button>
                </div>
              </div>

              <div style={{ fontSize: "0.72rem", color: "#666", marginTop: "0.25rem" }}>
                {entity.key} &middot; {entity.fields.length} fields
              </div>

              {/* Connector dots */}
              <div style={connectorDots}>
                {entity.fields.slice(0, 5).map((_, i) => (
                  <div key={i} style={connectorDot} />
                ))}
              </div>

              {/* Field editor */}
              {editingEntity === entity.key && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
                  {entity.fields.map((field, fi) => (
                    <div key={fi} style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem", alignItems: "center" }}>
                      <input
                        value={field.name}
                        onChange={(e) => updateField(entity.key, fi, { name: e.target.value })}
                        placeholder="Field name"
                        style={fieldInputStyle}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateField(entity.key, fi, { type: e.target.value })}
                        style={fieldSelectStyle}
                      >
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.15rem", color: "#888" }}>
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(e) => updateField(entity.key, fi, { required: e.target.checked })}
                        />
                        Req
                      </label>
                      <button onClick={() => removeField(entity.key, fi)} style={{ ...smallBtn, color: "#ff4444", padding: "0.15rem 0.3rem" }}>x</button>
                    </div>
                  ))}
                  <button onClick={() => addField(entity.key)} style={{ ...addBtnStyle, fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>+ Field</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Workflows */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <h3 style={sectionTitle}>Workflows ({workflows.length})</h3>
            <button onClick={addWorkflow} style={addBtnStyle}>+ Add Workflow</button>
          </div>

          {workflows.map((wf, wi) => (
            <div key={wi} style={nodeCard(editingWorkflow === wi)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                  <NodeIcon type="workflow" />
                  {editingWorkflow === wi ? (
                    <input
                      value={wf.name}
                      onChange={(e) => updateWorkflow(wi, { name: e.target.value })}
                      style={nodeInputStyle}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", color: "#e0e0f0" }} onClick={() => setEditingWorkflow(wi)}>
                      {wf.name}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => setEditingWorkflow(editingWorkflow === wi ? null : wi)} style={smallBtn}>{editingWorkflow === wi ? "Done" : "Edit"}</button>
                  <button onClick={() => removeWorkflow(wi)} style={{ ...smallBtn, color: "#ff4444" }}>x</button>
                </div>
              </div>

              <div style={{ fontSize: "0.72rem", color: "#666", marginTop: "0.25rem" }}>
                {wf.steps.length} steps{wf.triggerType ? ` \u00b7 trigger: ${wf.triggerType}` : ""}
              </div>

              {/* Step connector visualization */}
              {wf.steps.length > 0 && (
                <div style={stepFlow}>
                  {wf.steps.map((step, si) => (
                    <div key={si} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <div style={stepNode(step.stepType)}>{si + 1}</div>
                      {si < wf.steps.length - 1 && <div style={stepConnector} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Step editor */}
              {editingWorkflow === wi && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
                  {wf.steps.map((step, si) => (
                    <div key={si} style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.7rem", color: "#555", width: "20px" }}>{si + 1}</span>
                      <select
                        value={step.stepType}
                        onChange={(e) => {
                          const steps = wf.steps.map((s, i) => i === si ? { ...s, stepType: e.target.value } : s);
                          updateWorkflow(wi, { steps });
                        }}
                        style={fieldSelectStyle}
                      >
                        {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button onClick={() => removeStep(wi, si)} style={{ ...smallBtn, color: "#ff4444", padding: "0.15rem 0.3rem" }}>x</button>
                    </div>
                  ))}
                  <button onClick={() => addStep(wi)} style={{ ...addBtnStyle, fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>+ Step</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Events & Roles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem", position: "relative", zIndex: 1 }}>
        {/* Events */}
        <div style={bottomCard}>
          <h3 style={sectionTitle}>Events ({events.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
            {events.map((ev, i) => (
              <span key={i} style={eventTag}>
                <code style={{ fontSize: "0.72rem" }}>{ev}</code>
                <button onClick={() => removeEvent(i)} style={tagRemoveBtn}>x</button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addEvent(fd.get("event") as string);
              e.currentTarget.reset();
            }}
            style={{ display: "flex", gap: "0.25rem" }}
          >
            <input name="event" placeholder="e.g. employee.created" style={fieldInputStyle} />
            <button type="submit" style={addBtnStyle}>+</button>
          </form>
        </div>

        {/* Roles */}
        <div style={bottomCard}>
          <h3 style={sectionTitle}>Roles ({roles.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
            {roles.map((role, i) => (
              <span key={i} style={roleTag}>
                {role}
                <button onClick={() => removeRole(i)} style={tagRemoveBtn}>x</button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addRole(fd.get("role") as string);
              e.currentTarget.reset();
            }}
            style={{ display: "flex", gap: "0.25rem" }}
          >
            <input name="role" placeholder="e.g. manager" style={fieldInputStyle} />
            <button type="submit" style={addBtnStyle}>+</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function NodeIcon({ type }: { type: "entity" | "workflow" }) {
  const colors: Record<string, { bg: string; fg: string; label: string }> = {
    entity: { bg: "rgba(99,132,255,0.2)", fg: "#6384ff", label: "E" },
    workflow: { bg: "rgba(255,200,50,0.2)", fg: "#e0b030", label: "W" },
  };
  const c = colors[type];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "24px",
      height: "24px",
      borderRadius: "6px",
      background: c.bg,
      color: c.fg,
      fontWeight: 700,
      fontSize: "0.7rem",
      flexShrink: 0,
    }}>
      {c.label}
    </span>
  );
}

/* --- Styles --- */

const canvasWrap: React.CSSProperties = {
  position: "relative",
  minHeight: "100%",
};

const gridBg: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
  `,
  backgroundSize: "32px 32px",
  pointerEvents: "none",
  zIndex: 0,
};

function saveBar(dirty: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    padding: "0.5rem 0.75rem",
    background: dirty ? "rgba(255,200,50,0.08)" : "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    border: `1px solid ${dirty ? "rgba(255,200,50,0.2)" : "rgba(255,255,255,0.06)"}`,
    position: "relative",
    zIndex: 1,
  };
}

function saveBtnStyle(dirty: boolean): React.CSSProperties {
  return {
    padding: "0.35rem 0.75rem",
    borderRadius: "6px",
    border: "none",
    background: dirty ? "#6384ff" : "rgba(255,255,255,0.06)",
    color: dirty ? "#fff" : "#555",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: dirty ? "pointer" : "default",
    transition: "all 0.2s ease",
  };
}

function nodeCard(active: boolean): React.CSSProperties {
  return {
    background: active ? "rgba(99,132,255,0.06)" : "rgba(255,255,255,0.03)",
    borderRadius: "12px",
    border: `1px solid ${active ? "rgba(99,132,255,0.2)" : "rgba(255,255,255,0.06)"}`,
    boxShadow: active ? "0 4px 20px rgba(99,132,255,0.1)" : "0 2px 8px rgba(0,0,0,0.15)",
    padding: "0.75rem",
    marginBottom: "0.6rem",
    transition: "all 0.2s ease",
  };
}

const connectorDots: React.CSSProperties = {
  display: "flex",
  gap: "4px",
  marginTop: "0.4rem",
};

const connectorDot: React.CSSProperties = {
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  background: "rgba(99,132,255,0.4)",
};

const stepFlow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.15rem",
  marginTop: "0.4rem",
  padding: "0.3rem 0",
};

function stepNode(stepType: string): React.CSSProperties {
  const colors: Record<string, string> = {
    approval: "#6384ff",
    notification: "#28a745",
    assignment: "#e0b030",
    validation: "#ff6b6b",
    transformation: "#a855f7",
    escalation: "#ff4444",
  };
  return {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: `${colors[stepType] ?? "#555"}22`,
    border: `2px solid ${colors[stepType] ?? "#555"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.6rem",
    fontWeight: 700,
    color: colors[stepType] ?? "#555",
    flexShrink: 0,
  };
}

const stepConnector: React.CSSProperties = {
  width: "16px",
  height: "2px",
  background: "linear-gradient(90deg, rgba(99,132,255,0.3), rgba(99,132,255,0.15))",
  borderRadius: "1px",
};

const bottomCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: "0.75rem",
};

const eventTag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  padding: "0.2rem 0.5rem",
  background: "rgba(40,167,69,0.12)",
  borderRadius: "6px",
  color: "#28a745",
};

const roleTag: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
  padding: "0.2rem 0.5rem",
  background: "rgba(99,132,255,0.12)",
  borderRadius: "6px",
  fontSize: "0.75rem",
  color: "#6384ff",
};

const tagRemoveBtn: React.CSSProperties = {
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: "0.65rem",
  color: "#666",
  padding: 0,
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.82rem",
  fontWeight: 700,
  color: "#e0e0f0",
};

const addBtnStyle: React.CSSProperties = {
  padding: "0.25rem 0.6rem",
  borderRadius: "6px",
  border: "1px solid rgba(99,132,255,0.3)",
  background: "rgba(99,132,255,0.1)",
  color: "#6384ff",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 600,
  transition: "all 0.15s ease",
};

const smallBtn: React.CSSProperties = {
  padding: "0.15rem 0.4rem",
  borderRadius: "4px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#888",
  cursor: "pointer",
  fontSize: "0.7rem",
};

const nodeInputStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: "0.85rem",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "6px",
  padding: "0.2rem 0.4rem",
  flex: 1,
  background: "rgba(255,255,255,0.04)",
  color: "#e0e0f0",
  outline: "none",
};

const fieldInputStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.25rem 0.4rem",
  fontSize: "0.8rem",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.04)",
  color: "#e0e0f0",
  outline: "none",
};

const fieldSelectStyle: React.CSSProperties = {
  padding: "0.25rem 0.3rem",
  fontSize: "0.8rem",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.06)",
  color: "#e0e0f0",
};
