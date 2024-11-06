import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    proxyTimeout: 60000, // 60 seconds in milliseconds
  },
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '2mb'
    },
    externalResolver: true
  },
  httpAgentOptions: {
    keepAlive: true
  }
};

export default nextConfig;
