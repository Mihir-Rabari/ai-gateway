import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/console",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
