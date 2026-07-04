/**
 * Monitoring placeholder (PostHog).
 *
 * Nothing is initialized automatically — this is an opt-in helper that no-ops
 * until the relevant environment variable is set. Wire it into a client
 * provider / instrumentation hook when monitoring is actually turned on.
 */
import posthog from "posthog-js";

/** Initialize PostHog product analytics (browser only, key-gated). */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
  });
}
