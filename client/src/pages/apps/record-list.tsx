import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";

interface Props {
  tenantSlug: string;
  appKey: string;
  recordTypeKey: string;
}

export default function RecordList({ tenantSlug, appKey, recordTypeKey }: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: recordType } = useQuery({
    queryKey: ["recordType", tenantSlug, recordTypeKey],
    queryFn: async () => {
      const res = await apiRequest(`/record-types/by-key/${recordTypeKey}`, {
        tenantSlug,
      });
      return res.json();
    },
  });

  const { data: instances, isLoading } = useQuery({
    queryKey: ["instances", tenantSlug, recordType?.id],
    queryFn: async () => {
      if (!recordType?.id) return [];
      const res = await apiRequest(
        `/record-instances/by-type/${recordType.id}`,
        { tenantSlug }
      );
      return res.json();
    },
    enabled: !!recordType?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("/record-instances", {
        method: "POST",
        tenantSlug,
        body: JSON.stringify({
          recordTypeId: recordType.id,
          data,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      setShowCreate(false);
    },
  });

  const fields = (recordType?.schema as any)?.fields ?? [];

  return (
    <div>
      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>
        {recordType?.name ?? recordTypeKey}
      </h1>

      <button onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? "Cancel" : "Create New"}
      </button>

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data: Record<string, unknown> = {};
            for (const field of fields) {
              data[field.name] = formData.get(field.name) ?? "";
            }
            createMutation.mutate(data);
          }}
          style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}
        >
          {fields.map((field: any) => (
            <div key={field.name} style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.25rem" }}>
                {field.name} ({field.type})
                {field.required && <span style={{ color: "red" }}> *</span>}
              </label>
              <input
                name={field.name}
                required={field.required}
                style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
              />
            </div>
          ))}
          <button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {isLoading && <p>Loading records...</p>}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
              ID
            </th>
            {fields.slice(0, 4).map((f: any) => (
              <th key={f.name} style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
                {f.name}
              </th>
            ))}
            <th style={{ textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem" }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {(instances ?? []).map((inst: any) => (
            <tr key={inst.id}>
              <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                <Link href={`/t/${tenantSlug}/apps/${appKey}/records/${recordTypeKey}/${inst.id}`}>
                  {inst.id.slice(0, 8)}...
                </Link>
              </td>
              {fields.slice(0, 4).map((f: any) => (
                <td key={f.name} style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                  {String(inst.data?.[f.name] ?? "")}
                </td>
              ))}
              <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                {inst.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(instances ?? []).length === 0 && !isLoading && (
        <p style={{ color: "#888" }}>No records yet. Create one to get started.</p>
      )}
    </div>
  );
}
