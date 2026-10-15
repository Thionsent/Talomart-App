import { sql } from "@talomart/db";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getAdminPrincipal } from "@/lib/admin-authorization";
import { env } from "@/lib/env";

import { ProductImageBatch } from "./product-image-batch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk product images" };

export default async function ProductImagesPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/sign-in");
  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) redirect("/admin/security/setup");
  if (!principal.can("catalog.manage")) redirect("/admin/no-access");

  const products = await sql<{ sku: string; name: string; imageUrl: string | null }[]>`
    select p.sku, p.name,
      (select pi.url from product_images pi where pi.product_id = p.id
       order by pi.sort_order, pi.created_at limit 1) as "imageUrl"
    from products p order by p.sku
  `;

  return (
    <AdminDashboardShell principal={principal} active="products">
      <div className="space-y-6">
        <div>
          <Link href="/admin?view=products#products" className="text-sm font-bold text-[var(--color-green)]">
            ← Back to products
          </Link>
          <h1 className="mt-3 font-brand text-3xl font-extrabold text-[var(--color-navy)]">
            Bulk product images
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Review each image-to-SKU match before uploading. Products must exist first;
            use the CSV import for their names, categories, prices and stock. This upload
            adds or replaces only the primary image and leaves other product details untouched.
          </p>
        </div>
        {products.length ? (
          <ProductImageBatch products={products} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            No products are in the catalogue yet. Import products before uploading images.
          </div>
        )}
      </div>
    </AdminDashboardShell>
  );
}
