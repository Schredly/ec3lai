import { z } from "zod";

/**
 * O48: Zod strict schema for runtime GraphPackage validation.
 * Rejects unknown fields from LLM output.
 */

const fieldDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "string",
    "number",
    "boolean",
    "reference",
    "choice",
    "text",
    "date",
    "datetime",
  ]),
  required: z.boolean().optional(),
});

const recordTypeNodeSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(fieldDefinitionSchema),
  baseType: z.string().optional(),
  projectId: z.string().optional(),
});

const workflowStepSchema = z.object({
  stepType: z.string().min(1),
  orderIndex: z.number(),
});

const workflowNodeSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  triggerType: z.string().optional(),
  steps: z.array(workflowStepSchema),
  projectId: z.string().optional(),
});

const formNodeSchema = z.object({
  key: z.string().min(1),
  recordTypeKey: z.string().min(1),
  layout: z.unknown().optional(),
});

const bindingSchema = z.object({
  sourceKey: z.string().min(1),
  targetKey: z.string().min(1),
  bindingType: z.string().min(1),
});

export const graphPackageSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  recordTypes: z.array(recordTypeNodeSchema),
  workflows: z.array(workflowNodeSchema).default([]),
  forms: z.array(formNodeSchema).optional(),
  bindings: z.array(bindingSchema).optional(),
});

export type ValidatedGraphPackage = z.infer<typeof graphPackageSchema>;

export function validateGraphPackage(
  data: unknown
): { success: true; data: ValidatedGraphPackage } | { success: false; errors: string[] } {
  const result = graphPackageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    ),
  };
}
