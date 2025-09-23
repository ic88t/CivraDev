/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Load environment variables from parent directory
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  experimental: {
    serverComponentsExternalPackages: ['@daytonaio/sdk'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;