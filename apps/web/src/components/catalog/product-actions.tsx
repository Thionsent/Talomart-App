"use client";

import { Heart, ShoppingBag } from "lucide-react";

import type { CatalogueProduct } from "@/lib/catalog-queries";
import { isUuidCartProductId } from "@/lib/cart-product-id";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function ProductActions({ product }: { product: CatalogueProduct }) {
  const { isSaved, toggle, ready, pendingIds } = useWishlist();
  const saved = isSaved(product.id);
  const pending = pendingIds.has(product.id);
  const purchasable = isUuidCartProductId(product.id);

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <form action="/api/cart" method="post">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="quantity" value="1" />
        <input type="hidden" name="next" value="/cart" />
        <button
          disabled={!purchasable || product.stock <= 0}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--color-green-dark)] disabled:opacity-50"
        >
          <ShoppingBag className="h-5 w-5" />
          {!purchasable
            ? "Temporarily unavailable"
            : product.stock > 0
              ? "Add to cart"
              : "Out of stock"}
        </button>
      </form>
      <form action="/api/cart" method="post">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="quantity" value="1" />
        <input type="hidden" name="next" value="/checkout" />
        <button
          disabled={!purchasable || product.stock <= 0}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-6 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {purchasable ? "Buy now" : "Preview only"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => void toggle(product.id)}
        disabled={!purchasable || !ready || pending}
        aria-pressed={saved}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border bg-white px-6 text-sm font-extrabold transition disabled:cursor-default disabled:opacity-60 ${
          saved
            ? "border-orange-200 bg-orange-50 text-[var(--color-orange)]"
            : "border-slate-200 text-[var(--color-navy)] hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]"
        }`}
      >
        <Heart className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        {pending ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
