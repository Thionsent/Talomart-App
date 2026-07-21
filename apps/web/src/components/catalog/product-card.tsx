"use client";

import { Heart, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";

import type { CatalogueProduct } from "@/lib/catalog-queries";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

export function ProductCard({ product }: { product: CatalogueProduct }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[var(--color-green)] hover:shadow-xl">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {product.discount > 0 && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[var(--color-orange)] px-3 py-1 text-xs font-extrabold text-white">
              -{product.discount}%
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[var(--color-green)]">
            {product.category}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
            <Star className="h-3.5 w-3.5 fill-current" /> 4.8
          </span>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="block min-h-12 font-brand text-base font-extrabold leading-snug text-[var(--color-navy)] hover:text-[var(--color-green)]"
        >
          {product.name}
        </Link>
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
          {product.shortDescription ?? product.description}
        </p>
        <div>
          <strong className="text-xl text-[var(--color-navy)]">
            KSh {formatPrice(product.price)}
          </strong>
          {product.oldPrice > product.price && (
            <del className="ml-2 text-sm text-slate-400">
              KSh {formatPrice(product.oldPrice)}
            </del>
          )}
        </div>
        <p className="text-xs font-bold text-slate-500">
          {product.stock > 0
            ? `${product.stock} units available`
            : "Out of stock"}
        </p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <form action="/api/cart" method="post">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value="1" />
            <input type="hidden" name="next" value="/cart" />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--color-green-dark)] disabled:opacity-50"
              disabled={product.stock <= 0}
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </button>
          </form>
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-[var(--color-navy)] transition hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]">
            <Heart className="h-4 w-4" />
          </button>
          <form action="/api/cart" method="post" className="col-span-2">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="quantity" value="1" />
            <input type="hidden" name="next" value="/checkout" />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--color-orange)] bg-orange-50 px-4 text-sm font-extrabold text-[var(--color-orange)] transition hover:bg-[var(--color-orange)] hover:text-white disabled:opacity-50"
              disabled={product.stock <= 0}
            >
              Buy now
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
