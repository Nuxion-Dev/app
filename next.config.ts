import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',

  env: {
    NEXT_PUBLIC_AUTH_TOKEN: process.env.AUTH_TOKEN,
    NEXT_PUBLIC_API_TOKEN: process.env.API_TOKEN,
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    NEXT_PUBLIC_DISCORD_INVITE: process.env.DISCORD_INVITE,
    NEXT_PUBLIC_GOOGLE_ADSENSE_ID: process.env.GOOGLE_ADSENSE_ID,
    NEXT_PUBLIC_API_URL: process.env.API_URL,
    NEXT_PUBLIC_WS_URL: process.env.WS_URL,
  }
};

export default nextConfig;