"use client";

import { Heart, ShoppingBag } from "lucide-react";

import type { CatalogueProduct } from "@/lib/catalog-queries";

export function ProductActions({ product }: { product: CatalogueProduct }) {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <form action="/api/cart" method="post">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="quantity" value="1" />
        <input type="hidden" name="next" value="/cart" />
        <button
          disabled={product.stock <= 0}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--color-green-dark)] disabled:opacity-50"
        >
          <ShoppingBag className="h-5 w-5" />
          {product.stock > 0 ? "Add to cart" : "Out of stock"}
        </button>
      </form>
      <form action="/api/cart" method="post">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="quantity" value="1" />
        <input type="hidden" name="next" value="/checkout" />
        <button
          disabled={product.stock <= 0}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-6 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          Buy now
        </button>
      </form>
      <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-[var(--color-navy)] transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]">
        <Heart className="h-5 w-5" />
        Save
      </button>
    </div>
  );
}
