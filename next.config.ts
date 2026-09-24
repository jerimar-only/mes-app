import type { NextConfig } from "next";
import os from "os";

const localIPs = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: localIPs,
};

export default nextConfig;