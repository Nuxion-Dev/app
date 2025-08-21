import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
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
  }
};

export default nextConfig;