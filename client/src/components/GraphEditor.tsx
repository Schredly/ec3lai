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
    <div>
      {/* Save bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", padding: "0.5rem 0.75rem", background: dirty ? "#fff8e6" : "#f8f9fb", borderRadius: "6px", border: `1px solid ${dirty ? "#ffc107" : "#e5e7eb"}` }}>
        <span style={{ fontSize: "0.8rem", color: dirty ? "#856404" : "#888" }}>
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "5px",
            border: "none",
            background: dirty ? "#6384ff" : "#e5e7eb",
            color: dirty ? "#fff" : "#999",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: dirty ? "pointer" : "default",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Left: Entities */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={sectionTitle}>Entities ({entities.length})</h3>
            <button onClick={addEntity} style={addBtnStyle}>+ Add Entity</button>
          </div>

          {entities.map((entity) => (
            <div key={entity.key} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.5rem", background: editingEntity === entity.key ? "#fafbff" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                  <NodeIcon type="entity" />
                  {editingEntity === entity.key ? (
                    <input
                      value={entity.name}
                      onChange={(e) => updateEntity(entity.key, { name: e.target.value })}
                      style={{ fontWeight: 600, fontSize: "0.85rem", border: "1px solid #ddd", borderRadius: "4px", padding: "0.2rem 0.4rem", flex: 1 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }} onClick={() => setEditingEntity(entity.key)}>
                      {entity.name}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => setEditingEntity(editingEntity === entity.key ? null : entity.key)} style={smallBtn}>{editingEntity === entity.key ? "Done" : "Edit"}</button>
                  <button onClick={() => removeEntity(entity.key)} style={{ ...smallBtn, color: "#dc3545" }}>x</button>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                {entity.key} &middot; {entity.fields.length} fields
              </div>

              {/* Field editor */}
              {editingEntity === entity.key && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid #f0f0f0", paddingTop: "0.5rem" }}>
                  {entity.fields.map((field, fi) => (
                    <div key={fi} style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem", alignItems: "center" }}>
                      <input
                        value={field.name}
                        onChange={(e) => updateField(entity.key, fi, { name: e.target.value })}
                        placeholder="Field name"
                        style={{ flex: 1, padding: "0.25rem", fontSize: "0.8rem", border: "1px solid #ddd", borderRadius: "3px" }}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => updateField(entity.key, fi, { type: e.target.value })}
                        style={{ padding: "0.25rem", fontSize: "0.8rem", border: "1px solid #ddd", borderRadius: "3px" }}
                      >
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.15rem" }}>
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(e) => updateField(entity.key, fi, { required: e.target.checked })}
                        />
                        Req
                      </label>
                      <button onClick={() => removeField(entity.key, fi)} style={{ ...smallBtn, color: "#dc3545", padding: "0.15rem 0.3rem" }}>x</button>
                    </div>
                  ))}
                  <button onClick={() => addField(entity.key)} style={{ ...addBtnStyle, fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>+ Field</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Workflows */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h3 style={sectionTitle}>Workflows ({workflows.length})</h3>
            <button onClick={addWorkflow} style={addBtnStyle}>+ Add Workflow</button>
          </div>

          {workflows.map((wf, wi) => (
            <div key={wi} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.5rem", background: editingWorkflow === wi ? "#fafbff" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                  <NodeIcon type="workflow" />
                  {editingWorkflow === wi ? (
                    <input
                      value={wf.name}
                      onChange={(e) => updateWorkflow(wi, { name: e.target.value })}
                      style={{ fontWeight: 600, fontSize: "0.85rem", border: "1px solid #ddd", borderRadius: "4px", padding: "0.2rem 0.4rem", flex: 1 }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }} onClick={() => setEditingWorkflow(wi)}>
                      {wf.name}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button onClick={() => setEditingWorkflow(editingWorkflow === wi ? null : wi)} style={smallBtn}>{editingWorkflow === wi ? "Done" : "Edit"}</button>
                  <button onClick={() => removeWorkflow(wi)} style={{ ...smallBtn, color: "#dc3545" }}>x</button>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                {wf.steps.length} steps{wf.triggerType ? ` \u00b7 trigger: ${wf.triggerType}` : ""}
              </div>

              {/* Step editor */}
              {editingWorkflow === wi && (
                <div style={{ marginTop: "0.5rem", borderTop: "1px solid #f0f0f0", paddingTop: "0.5rem" }}>
                  {wf.steps.map((step, si) => (
                    <div key={si} style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.7rem", color: "#888", width: "20px" }}>{si + 1}</span>
                      <select
                        value={step.stepType}
                        onChange={(e) => {
                          const steps = wf.steps.map((s, i) => i === si ? { ...s, stepType: e.target.value } : s);
                          updateWorkflow(wi, { steps });
                        }}
                        style={{ flex: 1, padding: "0.25rem", fontSize: "0.8rem", border: "1px solid #ddd", borderRadius: "3px" }}
                      >
                        {STEP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button onClick={() => removeStep(wi, si)} style={{ ...smallBtn, color: "#dc3545", padding: "0.15rem 0.3rem" }}>x</button>
                    </div>
                  ))}
                  <button onClick={() => addStep(wi)} style={{ ...addBtnStyle, fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>+ Step</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Events & Roles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
        {/* Events */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem" }}>
          <h3 style={sectionTitle}>Events ({events.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem" }}>
            {events.map((ev, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.15rem 0.4rem", background: "#f0f0f0", borderRadius: "3px", fontSize: "0.75rem" }}>
                <code>{ev}</code>
                <button onClick={() => removeEvent(i)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "#999", padding: 0 }}>x</button>
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
            <input name="event" placeholder="e.g. employee.created" style={{ flex: 1, padding: "0.25rem", fontSize: "0.8rem", border: "1px solid #ddd", borderRadius: "3px" }} />
            <button type="submit" style={addBtnStyle}>+</button>
          </form>
        </div>

        {/* Roles */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem" }}>
          <h3 style={sectionTitle}>Roles ({roles.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.5rem" }}>
            {roles.map((role, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.15rem 0.4rem", background: "#e8f4fd", borderRadius: "3px", fontSize: "0.75rem", color: "#004085" }}>
                {role}
                <button onClick={() => removeRole(i)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "0.65rem", color: "#999", padding: 0 }}>x</button>
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
            <input name="role" placeholder="e.g. manager" style={{ flex: 1, padding: "0.25rem", fontSize: "0.8rem", border: "1px solid #ddd", borderRadius: "3px" }} />
            <button type="submit" style={addBtnStyle}>+</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function NodeIcon({ type }: { type: "entity" | "workflow" }) {
  const bg = type === "entity" ? "#e8f4fd" : "#fef3cd";
  const fg = type === "entity" ? "#004085" : "#856404";
  const label = type === "entity" ? "E" : "W";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "22px",
      height: "22px",
      borderRadius: "4px",
      background: bg,
      color: fg,
      fontWeight: 700,
      fontSize: "0.7rem",
    }}>
      {label}
    </span>
  );
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.8rem",
  fontWeight: 700,
  color: "#333",
};

const addBtnStyle: React.CSSProperties = {
  padding: "0.25rem 0.5rem",
  borderRadius: "4px",
  border: "1px solid #6384ff",
  background: "#fff",
  color: "#6384ff",
  cursor: "pointer",
  fontSize: "0.75rem",
  fontWeight: 600,
};

const smallBtn: React.CSSProperties = {
  padding: "0.15rem 0.4rem",
  borderRadius: "3px",
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.7rem",
};
