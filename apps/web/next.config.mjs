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

export default nextConfig;
