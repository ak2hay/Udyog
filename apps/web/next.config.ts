import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rkyves/db", "@rkyves/shared"],
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
