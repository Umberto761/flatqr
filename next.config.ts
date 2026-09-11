import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfkit", "swissqrbill", "@libsql/client"],
};

export default nextConfig;
