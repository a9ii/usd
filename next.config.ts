import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DEPLOY_TARGET === "vps"
    ? { output: "standalone" as const }
    : {}),
};

export default nextConfig;
