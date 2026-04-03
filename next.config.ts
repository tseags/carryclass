import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid dev-only asset blocking when the tab uses 127.0.0.1 vs localhost (or Cursor Simple Browser)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    // Force project root so / and other routes resolve (avoids wrong root when multiple lockfiles exist)
    root: process.cwd(),
  },
  // Do not bundle paapi5-nodejs-sdk; use Node require at runtime (avoids "Can't resolve ApiClient" in bundler)
  serverExternalPackages: ["paapi5-nodejs-sdk"],
};

export default nextConfig;
