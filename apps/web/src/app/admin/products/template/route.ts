import { auth } from "@/lib/auth";
import { stringifyCsv } from "@/lib/product-bulk-csv";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  const role = (session?.user as { role?: string } | undefined)?.role;

  return Boolean(session && (role === "admin" || role === "staff"));
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const csv = stringifyCsv([
    {
      sku: "TLM-SAMPLE-001",
      name: "Sample Fast Charger",
      slug: "sample-fast-charger",
      categorySlug: "charging",
      categoryName: "Charging",
      price: "1500",
      compareAtPrice: "2000",
      stockQuantity: "25",
      reservedQuantity: "",
      lowStockThreshold: "5",
      isActive: "true",
      isFeatured: "false",
      shortDescription: "Reliable fast charger for everyday use.",
      description: "Replace this row with real Talomart product information.",
      imageUrl: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=85",
      specifications: "{\"Warranty\":\"12 months\",\"Condition\":\"New\"}"
    }
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="talomart-product-import-template.csv"`
    }
  });
}
