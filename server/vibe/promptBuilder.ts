/**
 * Structured prompt builders for JSON-only LLM output matching GraphPackage schema.
 */

export function buildGeneratePrompt(userPrompt: string): string {
  return `You are an enterprise app generator. Generate a JSON package definition based on the user's request.

The JSON must match this exact schema:
{
  "key": "unique-key-no-spaces",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "Brief description",
  "recordTypes": [
    {
      "key": "record_type_key",
      "name": "Record Type Name",
      "fields": [
        { "name": "field_name", "type": "string|number|boolean|reference|choice|text|date|datetime", "required": true|false }
      ]
    }
  ],
  "workflows": [
    {
      "key": "workflow_key",
      "name": "Workflow Name",
      "triggerType": "record_event",
      "steps": [
        { "stepType": "assignment|approval|notification|decision|record_mutation|record_lock", "orderIndex": 0 }
      ]
    }
  ]
}

Rules:
- All keys must be lowercase with underscores (snake_case)
- Every record type must have at least a "title" or "name" field
- Field types must be exactly one of: string, number, boolean, reference, choice, text, date, datetime
- Output ONLY valid JSON, no markdown, no explanation

User request: ${userPrompt}`;
}

export function buildRefinePrompt(
  existingPackage: unknown,
  refinement: string
): string {
  return `You are an enterprise app generator. Refine the existing package based on the user's request.

Current package:
${JSON.stringify(existingPackage, null, 2)}

Refinement request: ${refinement}

Rules:
- Preserve the existing package key and name unless explicitly asked to change
- Only modify what the user requested
- Output ONLY valid JSON matching the GraphPackage schema
- All keys must be snake_case
- Field types: string, number, boolean, reference, choice, text, date, datetime`;
}

export function buildRepairPrompt(
  originalPrompt: string,
  errors: string[]
): string {
  return `${originalPrompt}

IMPORTANT: The previous attempt had validation errors:
${errors.map((e) => `- ${e}`).join("\n")}

Please fix these errors and return valid JSON.`;
}
