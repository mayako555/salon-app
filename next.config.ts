import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  serverExternalPackages: ['canvas'],
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      canvas: './empty-module.js',
    },
  },
};

export default nextConfig;
