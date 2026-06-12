import Anthropic from "@anthropic-ai/sdk";
import { type z } from "@distribution-copilot/shared";

import { AI_MODELS } from "../models.js";
import { type JsonCompletion, type Provider } from "./provider.js";

/**
 * Strips markdown code fences that the model occasionally wraps JSON in.
 * Returns the raw JSON string ready for JSON.parse().
 */
function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(text);
  if (fenced?.[1]) return fenced[1].trim();
  return text.trim();
}

/**
 * Real Anthropic API provider.
 *
 * Uses Haiku by default (fast, cheap structured extraction) with per-call
 * model overrides for capabilities that need stronger reasoning (replies,
 * product profile). Retries once on JSON parse failure before throwing.
 *
 * Vendor SDK is imported ONLY here — no other file in the codebase touches
 * @anthropic-ai/sdk directly.
 */
export function createAnthropicProvider(apiKey: string): Provider {
  const client = new Anthropic({ apiKey });

  return {
    async completeJson<T>(
      system: string,
      user: string,
      schema: z.ZodType<T>,
      model: string = AI_MODELS.SCORING,
    ): Promise<JsonCompletion<T>> {
      const systemPrompt = `${system}\n\nRespond with valid JSON only. No markdown code fences, no prose — raw JSON matching the described schema exactly.`;

      let lastError: unknown;

      for (let attempt = 1; attempt <= 2; attempt++) {
        const message = await client.messages.create({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: user }],
        });

        const textBlock = message.content.find((block) => block.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          throw new Error(`[ai] no text content in response (model=${model})`);
        }

        try {
          const raw = JSON.parse(extractJson(textBlock.text)) as unknown;
          const data = schema.parse(raw);
          return { data, model: message.model };
        } catch (err) {
          lastError = err;
          if (attempt < 2) {
            await new Promise<void>((resolve) => setTimeout(resolve, 600));
          }
        }
      }

      throw new Error(
        `[ai] output validation failed after 2 attempts (model=${model}): ${String(lastError)}`,
      );
    },
  };
}
