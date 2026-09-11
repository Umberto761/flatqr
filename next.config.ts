import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfkit", "swissqrbill", "@libsql/client"],
  // Avoid / ↔ / trailing-slash bounces behind SnapDeploy / other TLS proxies.
  skipTrailingSlashRedirect: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:43127",
        "*.containers.snapdeploy.app",
        "*.onrender.com",
        "*.trycloudflare.com",
      ],
    },
  },
};

export default nextConfig;
