import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";

interface Props {
  tenantSlug: string;
  recordId: string;
}

export default function RecordDetail({ tenantSlug, recordId }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: instance, isLoading } = useQuery({
    queryKey: ["instance", tenantSlug, recordId],
    queryFn: async () => {
      const res = await apiRequest(`/record-instances/${recordId}`, {
        tenantSlug,
      });
      return res.json();
    },
  });

  const { data: recordType } = useQuery({
    queryKey: ["recordType", tenantSlug, instance?.recordTypeId],
    queryFn: async () => {
      if (!instance?.recordTypeId) return null;
      const res = await apiRequest(
        `/record-types/${instance.recordTypeId}`,
        { tenantSlug }
      );
      return res.json();
    },
    enabled: !!instance?.recordTypeId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest(`/record-instances/${recordId}`, {
        method: "PATCH",
        tenantSlug,
        body: JSON.stringify({ data }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instance", tenantSlug, recordId] });
      setEditing(false);
    },
  });

  const fields = (recordType?.schema as any)?.fields ?? [];

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading...</div>;
  if (!instance) return <div style={{ padding: "2rem" }}>Record not found.</div>;

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>
        Record {recordId.slice(0, 8)}...
      </h1>
      <p style={{ color: "#666" }}>
        Type: {recordType?.name ?? instance.recordTypeId} &middot; Status:{" "}
        <strong>{instance.status}</strong>
      </p>

      <button onClick={() => setEditing(!editing)} style={{ marginBottom: "1rem" }}>
        {editing ? "Cancel" : "Edit"}
      </button>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: Record<string, unknown> = {};
            for (const field of fields) {
              data[field.name] = formData.get(field.name) ?? "";
            }
            updateMutation.mutate(data);
          }}
          style={{
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          {fields.map((field: any) => (
            <div key={field.name} style={{ marginBottom: "0.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginBottom: "0.25rem",
                }}
              >
                {field.name} ({field.type})
                {field.required && <span style={{ color: "red" }}> *</span>}
              </label>
              <input
                name={field.name}
                defaultValue={String(instance.data?.[field.name] ?? "")}
                required={field.required}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          <button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        </form>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "1rem",
          }}
        >
          <tbody>
            {fields.map((field: any) => (
              <tr key={field.name}>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    fontWeight: "bold",
                    width: "30%",
                  }}
                >
                  {field.name}
                </td>
                <td
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  {String(instance.data?.[field.name] ?? "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "2rem", color: "#999", fontSize: "0.75rem" }}>
        <p>Created: {instance.createdAt}</p>
        <p>Updated: {instance.updatedAt}</p>
      </div>
    </div>
  );
}
