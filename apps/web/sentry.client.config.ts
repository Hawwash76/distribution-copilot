import * as Sentry from "@sentry/nextjs";

// Only initialise when a DSN is configured — safe to leave empty in development.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Capture 10% of traces for performance monitoring.
    tracesSampleRate: 0.1,
    // Disable the Sentry debug logger in production.
    debug: false,
    // Do not send PII (user email, IP address) in error reports.
    sendDefaultPii: false,
  });
}
