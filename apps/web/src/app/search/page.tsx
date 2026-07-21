import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductToolbar } from "@/components/catalog/product-toolbar";
import { getCategories, getProducts } from "@/lib/catalog-queries";

export const metadata = { title: "Search" };
export const revalidate = 60;

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({
      query: params.q,
      categorySlug: params.category,
      sort: params.sort
    })
  ]);

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-white p-8 shadow-sm">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
            SEARCH
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            {params.q ? `Results for “${params.q}”` : "Search Talomart"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Find phones, chargers, headphones, cameras, storage and accessories
            across the live catalogue.
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
