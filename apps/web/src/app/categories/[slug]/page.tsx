import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductToolbar } from "@/components/catalog/product-toolbar";
import { getCategories, getProducts } from "@/lib/catalog-queries";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function CategoryPage({
  params,
  searchParams
}: CategoryPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const categories = await getCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const products = await getProducts({
    categorySlug: slug,
    query: query.q,
    sort: query.sort ?? "featured"
  });

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-[var(--color-navy)] p-8 text-white">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">
            CATEGORY
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            {category.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
            {category.description ??
              "Explore trusted Talomart accessories in this department."}
          </p>
        </div>

        <ProductToolbar
          categories={categories}
          activeCategory={slug}
          query={query.q}
          sort={query.sort}
        />
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
