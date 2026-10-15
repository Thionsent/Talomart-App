import type { MetadataRoute } from "next";

import { isIndexableDeployment, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/api", "/account", "/cart", "/checkout",
        "/wishlist", "/sign-in", "/sign-up", "/forgot-password",
        "/reset-password", "/track", "/search"
      ]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
