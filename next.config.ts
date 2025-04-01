/** @type {import('next').NextConfig} */
import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config: NextConfig, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      // Alias canvas to false to prevent it from being resolved during the build
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false, // Added to ignore the canvas module
      };
    }
    return config;
  },
};

export default nextConfig;