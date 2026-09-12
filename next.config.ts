import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfkit", "swissqrbill", "@libsql/client"],
  // Behind SnapDeploy/Cloudflare, Next's slash + proxy URL normalize 308s
  // /health (and sometimes /) to the same HTTPS URL. Disable both.
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
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
