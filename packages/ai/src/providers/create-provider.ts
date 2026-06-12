import { createAnthropicProvider } from "./anthropic.js";
import { createMockProvider } from "./mock.js";
import { type Provider } from "./provider.js";

/**
 * Returns the real Anthropic provider when ANTHROPIC_API_KEY is set in env,
 * or the static mock provider for local development without credentials.
 *
 * Call this once at startup and inject the result — do not call per-request.
 */
export function createProvider(): Provider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return createAnthropicProvider(apiKey);
  }
  return createMockProvider();
}
