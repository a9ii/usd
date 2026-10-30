
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages: static HTML/CSS/JS
  // VPS: preserve standalone mode when requested
  output:
    process.env.DEPLOY_TARGET === "vps"
      ? "standalone"
      : "export",
};

export default nextConfig;
