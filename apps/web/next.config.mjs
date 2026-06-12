import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@distribution-copilot/ui"],
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:3848"}/api/auth/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Only emit Sentry-related output during CI builds.
  silent: !process.env.CI,
  // Disable telemetry pings to Sentry.
  telemetry: false,
  // Source-map upload requires SENTRY_AUTH_TOKEN — skip in development.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Suppress the Sentry CLI progress output unless explicitly wanted.
  hideSourceMaps: true,
});
