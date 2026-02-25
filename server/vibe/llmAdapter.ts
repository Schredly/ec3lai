/**
 * O54: LLM adapter interface — returns `unknown` for untrusted-output contract.
 * Implementations: Anthropic, OpenAI, Stub.
 * Uses native fetch (no SDK dependencies).
 */

export interface LlmAdapter {
  generate(prompt: string): Promise<unknown>;
  repair(prompt: string, errors: string[]): Promise<unknown>;
  refine(prompt: string, existingPackage: unknown, refinement: string): Promise<unknown>;
}

export class StubLlmAdapter implements LlmAdapter {
  async generate(_prompt: string): Promise<unknown> {
    return {
      key: "stub-app",
      name: "Stub App",
      version: "1.0.0",
      recordTypes: [
        {
          key: "stub_record",
          name: "Stub Record",
          fields: [
            { name: "title", type: "string", required: true },
            { name: "status", type: "choice" },
          ],
        },
      ],
      workflows: [],
    };
  }

  async repair(_prompt: string, _errors: string[]): Promise<unknown> {
    return this.generate(_prompt);
  }

  async refine(
    _prompt: string,
    existingPackage: unknown,
    _refinement: string
  ): Promise<unknown> {
    return existingPackage;
  }
}

export class AnthropicLlmAdapter implements LlmAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string): Promise<unknown> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = (await response.json()) as any;
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  }

  async repair(prompt: string, errors: string[]): Promise<unknown> {
    const errorContext = `Previous attempt had these errors:\n${errors.join("\n")}\n\nPlease fix them.\n\n${prompt}`;
    return this.generate(errorContext);
  }

  async refine(
    prompt: string,
    existingPackage: unknown,
    refinement: string
  ): Promise<unknown> {
    const refinePrompt = `Here is the existing package:\n${JSON.stringify(existingPackage, null, 2)}\n\nRefinement request: ${refinement}\n\n${prompt}`;
    return this.generate(refinePrompt);
  }
}

export class OpenAILlmAdapter implements LlmAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string): Promise<unknown> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    });

    const data = (await response.json()) as any;
    const text = data.choices?.[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  }

  async repair(prompt: string, errors: string[]): Promise<unknown> {
    const errorContext = `Previous attempt had these errors:\n${errors.join("\n")}\n\nPlease fix them.\n\n${prompt}`;
    return this.generate(errorContext);
  }

  async refine(
    prompt: string,
    existingPackage: unknown,
    refinement: string
  ): Promise<unknown> {
    const refinePrompt = `Here is the existing package:\n${JSON.stringify(existingPackage, null, 2)}\n\nRefinement request: ${refinement}\n\n${prompt}`;
    return this.generate(refinePrompt);
  }
}

export function createLlmAdapter(): LlmAdapter {
  const provider = process.env.VIBE_LLM_PROVIDER || "stub";
  switch (provider) {
    case "anthropic":
      return new AnthropicLlmAdapter(process.env.ANTHROPIC_API_KEY || "");
    case "openai":
      return new OpenAILlmAdapter(process.env.OPENAI_API_KEY || "");
    default:
      return new StubLlmAdapter();
  }
}
