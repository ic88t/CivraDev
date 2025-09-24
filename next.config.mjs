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
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    if (isServer) {
      // Handle the specific ES module issue with untildify
      config.externals = config.externals || [];

      // Add untildify as external to prevent server-side bundling issues
      config.externals.push({
        'untildify': 'commonjs untildify'
      });

      // Alternative: disable untildify entirely for server-side
      config.resolve.alias = {
        ...config.resolve.alias,
        'untildify': false,
      };
    }

    return config;
  },
};

export default nextConfig;