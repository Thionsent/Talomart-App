import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogueProduct } from "@/lib/catalog-queries";

export function ProductGrid({ products }: { products: CatalogueProduct[] }) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="font-brand text-2xl font-extrabold">
          No products found
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Try a different category, search term or sort option.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
