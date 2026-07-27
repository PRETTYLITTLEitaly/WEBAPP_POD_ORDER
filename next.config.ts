import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "svg-to-pdfkit"]
};

export default nextConfig;
