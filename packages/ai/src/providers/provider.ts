import { type z } from "@distribution-copilot/shared";

/**
 * Result of a structured JSON completion, including the model that produced it
 * so callers can record which model generated the output.
 */
export interface JsonCompletion<T> {
  data: T;
  model: string;
}

/**
 * Minimal provider interface for AI completions.
 * Concrete implementations (e.g. AnthropicProvider) live in this folder and
 * are the only place vendor SDKs are imported. Callers program to this interface.
 */
export interface Provider {
  /**
   * Request a structured JSON response validated against a Zod schema.
   * Throws if the model returns unparseable JSON or output fails validation.
   *
   * @param model - Override the default model for this call.
   */
  completeJson<T>(
    system: string,
    user: string,
    schema: z.ZodType<T>,
    model?: string,
  ): Promise<JsonCompletion<T>>;
}
