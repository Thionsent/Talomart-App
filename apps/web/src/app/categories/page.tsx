import Link from "next/link";

import { getCategories } from "@/lib/catalog-queries";

export const metadata = { title: "Product categories" };
export const revalidate = 60;

function categoryFallbackIcon(slug: string) {
  if (slug.includes("phone")) return "📱";
  if (slug.includes("audio") || slug.includes("ear") || slug.includes("head")) return "🎧";
  if (slug.includes("charg") || slug.includes("power")) return "🔋";
  if (slug.includes("stor") || slug.includes("memory") || slug.includes("flash")) return "💾";
  if (slug.includes("camera")) return "📷";

  return "⌚";
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-white p-8 shadow-sm">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
            BROWSE
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            Product categories
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Jump straight into the Talomart departments customers use most.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-green)] hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-20 w-24 overflow-hidden rounded-2xl bg-emerald-50 text-3xl">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-full place-items-center">
                      {categoryFallbackIcon(category.slug)}
                    </span>
                  )}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                  {category.count} products
                </span>
              </div>
              <h2 className="font-brand mt-6 text-2xl font-extrabold group-hover:text-[var(--color-green)]">
                {category.name}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {category.description ??
                  "Curated tech accessories selected for everyday reliability."}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
