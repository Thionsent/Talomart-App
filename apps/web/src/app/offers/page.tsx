import Link from "next/link";
import { ArrowRight, BadgePercent, SlidersHorizontal } from "lucide-react";

import { ProductGrid } from "@/components/catalog/product-grid";
import { getCategories, getProducts } from "@/lib/catalog-queries";
import { publicPageMetadata } from "@/lib/seo";

export const revalidate = 60;
export const metadata = publicPageMetadata(
  "Today's deals",
  "Shop current Talomart offers on phones, audio, chargers and accessories. See the live price and original price before you buy.",
  "/offers"
);

interface OffersPageProps {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}

const sorts = new Set(["savings", "newest", "price-low", "price-high"]);

export default async function OffersPage({ searchParams }: OffersPageProps) {
  const params = await searchParams;
  const sort = sorts.has(params.sort ?? "") ? params.sort : "savings";
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({
      dealsOnly: true,
      categorySlug: params.category || undefined,
      query: params.q || undefined,
      sort,
      limit: 120
    })
  ]);
  const hasFilters = Boolean(params.category || params.q);

  return (
    <main className="bg-[var(--color-cream)] py-8 sm:py-12">
      <div className="page-shell">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--color-navy)] px-6 py-10 text-white sm:px-10 sm:py-14">
          <div aria-hidden="true" className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[48px] border-[var(--color-orange)] opacity-15" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-200">
              <BadgePercent aria-hidden="true" className="h-4 w-4" /> Current offers
            </span>
            <h1 className="font-brand mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">Today&apos;s Deals</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
              Browse products currently priced below their original price. The price shown on each product is the price you pay at checkout.
            </p>
            <p className="mt-3 text-xs leading-5 text-blue-200">
              Prices and availability may change until checkout.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-green)]">Worth a look</p>
            <h2 className="font-brand mt-1 text-2xl font-extrabold text-[var(--color-navy)] sm:text-3xl">Shop current deals</h2>
            <p className="mt-1 text-sm text-slate-600">Only active, in-stock products with a lower current price appear here.</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-green)] hover:underline">
            Browse all products <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <form action="/offers" className="my-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px_170px_auto]" role="search">
          <label className="sr-only" htmlFor="deals-search">Search deals</label>
          <input id="deals-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Search deals" className="min-h-11 min-w-0 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[var(--color-green)]" />
          <label className="sr-only" htmlFor="deals-category">Category</label>
          <select id="deals-category" name="category" defaultValue={params.category ?? ""} className="min-h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-green)]">
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="deals-sort">Sort deals</label>
          <select id="deals-sort" name="sort" defaultValue={sort} className="min-h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[var(--color-green)]">
            <option value="savings">Biggest savings</option>
            <option value="newest">Newest products</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white hover:bg-[var(--color-green-dark)]">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Show deals
          </button>
        </form>

        {products.length ? (
          <>
            <p className="mb-4 text-sm font-semibold text-slate-600" aria-live="polite">Showing {products.length} {products.length === 1 ? "deal" : "deals"}</p>
            <ProductGrid products={products} />
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <BadgePercent aria-hidden="true" className="mx-auto h-10 w-10 text-[var(--color-green)]" />
            <h2 className="font-brand mt-4 text-2xl font-extrabold text-[var(--color-navy)]">{hasFilters ? "No deals match those filters" : "No deals available right now"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{hasFilters ? "Try another category or search, or explore the full catalogue." : "Check back for new offers, or browse the full catalogue in the meantime."}</p>
            <Link href={hasFilters ? "/offers" : "/products"} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white">
              {hasFilters ? "Clear filters" : "Shop all products"}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
