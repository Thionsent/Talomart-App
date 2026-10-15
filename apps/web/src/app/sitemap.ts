import type { MetadataRoute } from "next";
import { sql } from "@talomart/db";

import { hasConfiguredDatabase, logFallback, withTimeout } from "@/lib/database-resilience";
import { MPESA_SANDBOX_TEST_PRODUCT_SLUG } from "@/lib/payments/mpesa-sandbox-product";
import { absoluteUrl, isIndexableDeployment } from "@/lib/seo";

export const revalidate = 3600;

const staticPaths = [
  "/", "/products", "/categories", "/about", "/contact", "/help",
  "/shipping", "/returns", "/warranty", "/payments", "/privacy", "/terms"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexableDeployment) return [];

  const pages: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/" || path === "/products" ? "daily" : "monthly"
  }));

  if (!hasConfiguredDatabase()) return pages;

  try {
    const [categories, products] = await Promise.all([
      withTimeout(sql<{ slug: string }[]>`
        select slug from categories where is_active = true order by slug
      `, { label: "SEO categories" }),
      withTimeout(sql<{ slug: string; updatedAt: Date }[]>`
        select p.slug, p.updated_at as "updatedAt"
        from products p
        join categories c on c.id = p.category_id
        where p.is_active = true and c.is_active = true
          and p.slug <> ${MPESA_SANDBOX_TEST_PRODUCT_SLUG}
        order by p.id
        limit 49000
      `, { label: "SEO products" })
    ]);

    return [
      ...pages,
      ...categories.map(({ slug }) => ({
        url: absoluteUrl(`/categories/${encodeURIComponent(slug)}`),
        changeFrequency: "weekly" as const
      })),
      ...products.map(({ slug, updatedAt }) => ({
        url: absoluteUrl(`/products/${encodeURIComponent(slug)}`),
        lastModified: updatedAt,
        changeFrequency: "weekly" as const
      }))
    ];
  } catch (error) {
    logFallback("SEO sitemap catalogue is unavailable", error);
    return pages;
  }
}
