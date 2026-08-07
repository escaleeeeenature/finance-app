import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx", "pdfjs-dist"],
};

export default nextConfig;
