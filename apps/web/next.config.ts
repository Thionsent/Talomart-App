import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { baselineSecurityHeaders } from "./src/lib/security-headers";

// The monorepo keeps local development credentials at its root, while Next
// resolves this config from apps/web. Deployed environment variables win.
const rootEnvironmentFile = resolve(process.cwd(), "../../.env");
if (!process.env.SUPABASE_URL && existsSync(rootEnvironmentFile)) {
  process.loadEnvFile(rootEnvironmentFile);
}

const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
let storageImageHost = "";
try {
  const storageUrl = new URL(process.env.SUPABASE_URL || "");
  if (storageUrl.protocol === "https:") storageImageHost = storageUrl.hostname;
} catch {
  // A missing storage URL leaves externally hosted images unoptimized.
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.100.16"],
  transpilePackages: ["@talomart/db", "@talomart/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      ...(storageImageHost
        ? [{
            protocol: "https" as const,
            hostname: storageImageHost,
            pathname: `/storage/v1/object/public/${storageBucket}/**`
          }]
        : [])
    ],
    formats: ["image/avif", "image/webp"]
  },
  env: {
    NEXT_PUBLIC_SUPABASE_IMAGE_HOST: storageImageHost,
    NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: storageBucket
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Admin image uploads are validated to 5MB by supabase-storage.ts.
      // Leave a small allowance for multipart form fields and boundaries.
      bodySizeLimit: "6mb"
    }
  },
  async headers() {
    return [
      ...["/checkout/success", "/track"].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0"
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive"
          }
        ]
      })),
      {
        source: "/:path*",
        headers: [
          ...baselineSecurityHeaders,
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload"
                }
              ]
            : [])
        ]
      }
    ];
  }
};

export default nextConfig;
