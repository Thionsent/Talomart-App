import Link from "next/link";

import type { CatalogueCategory } from "@/lib/catalog-queries";

export function ProductToolbar({
  categories,
  activeCategory,
  query,
  sort
}: {
  categories: CatalogueCategory[];
  activeCategory?: string | undefined;
  query?: string | undefined;
  sort?: string | undefined;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form className="grid gap-3 md:grid-cols-[1fr_180px_150px_auto]">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search phones, chargers, powerbanks..."
          className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[var(--color-green)]"
        />
        <select
          name="category"
          defaultValue={activeCategory ?? ""}
          className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[var(--color-green)]"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort ?? "featured"}
          className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[var(--color-green)]"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
        </select>
        <button className="min-h-11 rounded-xl bg-[var(--color-navy)] px-5 text-sm font-extrabold text-white">
          Apply
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/products"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-[var(--color-green)] hover:text-[var(--color-green)]"
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-[var(--color-green)] hover:text-[var(--color-green)]"
          >
            {category.name} ({category.count})
          </Link>
        ))}
      </div>
    </div>
  );
}
