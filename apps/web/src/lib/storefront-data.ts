import { sql } from "@talomart/db";

import {
  storefrontCategories,
  storefrontProducts,
  type StoreCategory,
  type StoreProduct
} from "@/lib/catalog";
import {
  hasConfiguredDatabase,
  logFallback,
  withTimeout
} from "@/lib/database-resilience";

const categoryArt: Record<string, string> = {
  phones: "ðŸ“±",
  audio: "ðŸŽ§",
  charging: "ðŸ”‹",
  storage: "ðŸ’¾",
  cameras: "ðŸ“·",
  accessories: "âŒš"
};

const fallbackStorefrontData = {
  categories: storefrontCategories,
  products: storefrontProducts
};

export async function getStorefrontData(): Promise<{
  categories: StoreCategory[];
  products: StoreProduct[];
}> {
  if (!hasConfiguredDatabase()) {
    return fallbackStorefrontData;
  }

  try {
    const [categories, products] = await withTimeout(
      Promise.all([
        sql<
          {
            name: string;
            slug: string;
            count: number;
          }[]
        >`
          select
            c.name,
            c.slug,
            count(p.id)::int as count
          from categories c
          left join products p
            on p.category_id = c.id
            and p.is_active = true
          where c.is_active = true
          group by c.id
          order by c.sort_order asc, c.name asc
        `,
        sql<
          {
            id: string;
            slug: string;
            category: string;
            name: string;
            price: number;
            oldPrice: number | null;
            stock: number;
            image: string | null;
          }[]
        >`
          select
            p.id::text,
            p.slug,
            c.name as category,
            p.name,
            p.price_minor as price,
            p.compare_at_price_minor as "oldPrice",
            greatest(p.stock_quantity - p.reserved_quantity, 0)::int as stock,
            (
              select pi.url
              from product_images pi
              where pi.product_id = p.id
              order by pi.sort_order asc, pi.created_at asc
              limit 1
            ) as image
          from products p
          inner join categories c on c.id = p.category_id
          where p.is_active = true
            and c.is_active = true
          order by p.is_featured desc, p.created_at desc
          limit 24
        `
      ]),
      { label: "Storefront catalogue" }
    );

    if (!categories.length || !products.length) {
      logFallback(
        "Storefront catalogue returned no active categories or products",
        new Error("Empty catalogue result")
      );

      return fallbackStorefrontData;
    }

    return {
      categories: categories.map((category) => ({
        ...category,
        art: categoryArt[category.slug] ?? "âœ¨"
      })),
      products: products.map((product) => {
        const oldPrice = product.oldPrice ?? product.price;
        const discount =
          oldPrice > product.price
            ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
            : 0;

        return {
          id: product.id,
          slug: product.slug,
          category: product.category,
          name: product.name,
          price: Math.round(product.price / 100),
          oldPrice: Math.round(oldPrice / 100),
          discount,
          rating: 4.8,
          reviews: 0,
          stock: product.stock,
          image:
            product.image ??
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=85"
        };
      })
    };
  } catch (error) {
    logFallback("Storefront catalogue is unavailable", error);

    return fallbackStorefrontData;
  }
}
