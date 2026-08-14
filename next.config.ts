import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones/tablets on the same LAN load the dev server (`next dev -H 0.0.0.0`)
  // without Next.js blocking the cross-origin dev asset requests. Covers the common
  // private network ranges; add your device's exact IP here too if it's outside these.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.16.*.*"],
};

export default nextConfig;
