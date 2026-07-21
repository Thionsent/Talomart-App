import { sql } from "@talomart/db";

import type { StoreProduct } from "@/lib/catalog";
import type { LocalCartItem } from "@/lib/cart-storage";
import { logFallback, withTimeout } from "@/lib/database-resilience";

export const SERVER_CART_COOKIE = "talomart-cart";

interface ServerCartItem {
  productId: string;
  quantity: number;
}

export function parseServerCart(value?: string): ServerCartItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        productId: String(item.productId ?? ""),
        quantity: Number(item.quantity ?? 0)
      }))
      .filter(
        (item) =>
          /^[0-9a-f-]{36}$/i.test(item.productId) &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

export function serializeServerCart(items: ServerCartItem[]) {
  return JSON.stringify(
    items.map((item) => ({
      productId: item.productId,
      quantity: Math.min(Math.max(item.quantity, 1), 99)
    }))
  );
}

export async function getServerCart(value?: string): Promise<LocalCartItem[]> {
  const cart = parseServerCart(value);
  if (!cart.length) return [];

  const productIds = cart.map((item) => item.productId);
  const rows = await withTimeout(
    sql<
      {
        id: string;
        slug: string;
        category: string;
        name: string;
        priceMinor: number;
        compareAtPriceMinor: number | null;
        stock: number;
        image: string | null;
      }[]
    >`
      select
        p.id::text,
        p.slug,
        c.name as category,
        p.name,
        p.price_minor as "priceMinor",
        p.compare_at_price_minor as "compareAtPriceMinor",
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
      where p.id = any(${productIds}::uuid[])
        and p.is_active = true
        and c.is_active = true
    `,
    { label: "Server cart", milliseconds: 4000 }
  ).catch((error) => {
    logFallback("Skipping server cart hydration", error);
    return [];
  });

  const productById = new Map(
    rows.map((row) => {
      const oldPriceMinor = row.compareAtPriceMinor ?? row.priceMinor;
      const product: StoreProduct = {
        id: row.id,
        slug: row.slug,
        category: row.category,
        name: row.name,
        price: Math.round(row.priceMinor / 100),
        oldPrice: Math.round(oldPriceMinor / 100),
        discount:
          oldPriceMinor > row.priceMinor
            ? Math.round(((oldPriceMinor - row.priceMinor) / oldPriceMinor) * 100)
            : 0,
        rating: 4.8,
        reviews: 0,
        stock: row.stock,
        image:
          row.image ??
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85"
      };

      return [row.id, product] as const;
    })
  );

  return cart
    .map((item) => {
      const product = productById.get(item.productId);
      if (!product) return null;

      return {
        product,
        quantity: Math.min(item.quantity, product.stock)
      };
    })
    .filter((item): item is LocalCartItem => Boolean(item));
}
