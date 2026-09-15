import { requireAdminPermission } from "@/lib/admin-authorization";
import { specificationsToCsv, stringifyCsv } from "@/lib/product-bulk-csv";
import { sql } from "@talomart/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function money(minor: number | null) {
  if (!minor) return "";
  return String(Math.round(minor / 100));
}

export async function GET() {
  try {
    await requireAdminPermission("catalog.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await sql<
    {
      sku: string;
      name: string;
      slug: string;
      categorySlug: string;
      categoryName: string;
      priceMinor: number;
      compareAtPriceMinor: number | null;
      stockQuantity: number;
      reservedQuantity: number;
      lowStockThreshold: number;
      isActive: boolean;
      isFeatured: boolean;
      shortDescription: string | null;
      description: string | null;
      imageUrl: string | null;
      specifications: Record<string, string>;
    }[]
  >`
    select
      p.sku,
      p.name,
      p.slug,
      c.slug as "categorySlug",
      c.name as "categoryName",
      p.price_minor as "priceMinor",
      p.compare_at_price_minor as "compareAtPriceMinor",
      p.stock_quantity as "stockQuantity",
      p.reserved_quantity as "reservedQuantity",
      p.low_stock_threshold as "lowStockThreshold",
      p.is_active as "isActive",
      p.is_featured as "isFeatured",
      p.short_description as "shortDescription",
      p.description,
      p.specifications,
      (
        select pi.url
        from product_images pi
        where pi.product_id = p.id
        order by pi.sort_order asc, pi.created_at asc
        limit 1
      ) as "imageUrl"
    from products p
    inner join categories c on c.id = p.category_id
    order by c.sort_order asc, p.created_at desc
  `;

  const csv = stringifyCsv(
    products.map((product) => ({
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      categorySlug: product.categorySlug,
      categoryName: product.categoryName,
      price: money(product.priceMinor),
      compareAtPrice: money(product.compareAtPriceMinor),
      stockQuantity: product.stockQuantity,
      reservedQuantity: product.reservedQuantity,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      imageUrl: product.imageUrl ?? "",
      specifications: specificationsToCsv(product.specifications)
    }))
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="talomart-products-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`
    }
  });
}
