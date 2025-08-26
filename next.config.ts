import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "authium.ezerium.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.authium.ezerium.com",
        port: "",
        pathname: "/**",
      },
    ]
  },
  assetPrefix: isProd ? undefined : `http://${internalHost}:5167`,
};

export default nextConfig;