import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/storage/uploads/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    return [
      { source: '/lp/:slug', destination: '/landing/:slug' },
    ];
  },
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
