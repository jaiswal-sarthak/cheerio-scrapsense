import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
} as NextConfig;

export default nextConfig;