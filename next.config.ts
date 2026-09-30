import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/demo/:path*', headers: [
      { key: 'Content-Security-Policy', value: "connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; img-src 'self' data: blob:;" },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
    ] }];
  },
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
