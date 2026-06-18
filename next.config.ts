import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // CSV imports can exceed the 1 MB Server Action default.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
