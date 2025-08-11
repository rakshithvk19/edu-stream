import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'videodelivery.net',
      },
    ],
  },
};

export default nextConfig;
