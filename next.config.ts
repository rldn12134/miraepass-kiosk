import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@miraepass/api-client"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
