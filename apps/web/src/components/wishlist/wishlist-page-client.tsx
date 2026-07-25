"use client";

import { Heart, LogIn, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { ProductGrid } from "@/components/catalog/product-grid";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import type { CatalogueProduct } from "@/lib/catalog-queries";
import { customerAuthHref } from "@/lib/auth-redirect";

export function WishlistPageClient({
  products
}: {
  products: CatalogueProduct[];
}) {
  const { authenticated, ids, count, ready, clear } = useWishlist();
  const savedProducts = useMemo(
    () => products.filter((product) => ids.has(product.id)),
    [ids, products]
  );
  const unavailableCount = Math.max(count - savedProducts.length, 0);

  async function clearWishlist() {
    if (
      window.confirm(
        "Clear every product from your Talomart wishlist? This action cannot be undone."
      )
    ) {
      await clear();
    }
  }

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <header className="rounded-3xl bg-[var(--color-navy)] p-7 text-white shadow-sm sm:p-9">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">
                SAVED FOR LATER
              </span>
              <h1 className="font-brand mt-3 text-4xl font-extrabold">
                Your wishlist
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
                Keep the Talomart products you love together, compare them and
                move them to your cart when you are ready.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
              <Heart className="h-5 w-5 text-[var(--color-orange)]" />
              <span>
                <strong className="block text-lg leading-none">{count}</strong>
                <small className="text-blue-100">
                  saved product{count === 1 ? "" : "s"}
                </small>
              </span>
            </div>
          </div>
        </header>

        {!authenticated && ready && count > 0 && (
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-950 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="font-brand text-lg">Keep your wishlist across devices</strong>
              <p className="mt-1 text-sm text-blue-700">
                These products are safely stored in this browser. Sign in to
                synchronize them with your Talomart account.
              </p>
            </div>
            <Link
              href={customerAuthHref("/sign-in", "/wishlist")}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </div>
        )}

        {!ready ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading wishlist">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-24 rounded bg-slate-100" />
                  <div className="h-5 w-full rounded bg-slate-100" />
                  <div className="h-11 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : !count ? (
          <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[var(--color-orange)]">
              <Heart className="h-8 w-8" />
            </span>
            <h2 className="font-brand mt-5 text-2xl font-extrabold text-[var(--color-navy)]">
              Your wishlist is ready for something great
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Select the heart on any product to save it here. Your choices
              will stay available while you continue shopping.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              Explore products
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-7 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-brand text-2xl font-extrabold text-[var(--color-navy)]">
                  Saved products
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Prices and stock are refreshed from the current catalogue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void clearWishlist()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-extrabold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear wishlist
              </button>
            </div>

            {unavailableCount > 0 && (
              <p className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                {unavailableCount} saved product{unavailableCount === 1 ? " is" : "s are"}
                currently archived or unavailable and cannot be displayed.
              </p>
            )}

            <ProductGrid products={savedProducts} />
          </>
        )}
      </div>
    </section>
  );
}
