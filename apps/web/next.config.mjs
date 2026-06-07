/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Internal workspace packages ship pre-compiled JS, but listing the UI
  // package here keeps things working if it ever ships untranspiled source.
  transpilePackages: ["@distribution-copilot/ui"],
};

export default nextConfig;
