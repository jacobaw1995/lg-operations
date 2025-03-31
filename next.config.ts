/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Mock the 'canvas' module for server-side builds
    if (isServer) {
      config.resolve.alias['canvas'] = false;
    }
    return config;
  },
};

module.exports = nextConfig;