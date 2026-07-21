import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductToolbar } from "@/components/catalog/product-toolbar";
import { getCategories, getProducts } from "@/lib/catalog-queries";

export const metadata = { title: "All products" };
export const revalidate = 60;

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({
  searchParams
}: ProductsPageProps) {
  const params = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({
      categorySlug: params.category || undefined,
      query: params.q || undefined,
      sort: params.sort || "featured"
    })
  ]);

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-[var(--color-navy)] p-8 text-white">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">
            CATALOGUE
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            Shop Talomart products
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
            Browse genuine phones, chargers, cameras, earpods, headphones,
            OTG hubs, storage devices, earphones and powerbanks.
          </p>
        </div>

        <ProductToolbar
          categories={categories}
          activeCategory={params.category}
          query={params.q}
          sort={params.sort}
        />
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
