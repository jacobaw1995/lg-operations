/** @type {import('next').NextConfig} */
import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config: NextConfig) => {
    // Alias canvas to false for both client and server builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      canvas: false, // Ensure canvas is aliased to false in all contexts
    };
    return config;
  },
};

export default nextConfig;