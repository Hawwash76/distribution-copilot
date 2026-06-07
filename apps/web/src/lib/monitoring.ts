/**
 * Monitoring placeholders (Sentry + PostHog).
 *
 * Nothing is initialized automatically — these are opt-in helpers that no-op
 * until the relevant environment variables are set. Wire them into a client
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

// Sentry placeholder:
// Configure via `@sentry/nextjs` (instrumentation.ts + sentry.*.config.ts)
// once NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN are provided.
