"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  CART_KEY,
  type LocalCartItem,
  writeLocalCart
} from "@/lib/cart-storage";
const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

export function CartPageClient({
  initialCart = []
}: {
  initialCart?: LocalCartItem[];
}) {
  const [cart, setCart] = useState<LocalCartItem[]>(initialCart);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const localCart = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
        if (initialCart.length) {
          setCart(initialCart);
          writeLocalCart(initialCart);
        } else if (localCart.length) {
          setCart(localCart);
        }
      } catch {
        setCart([]);
      }
    });

    const cartSynced = (event: Event) => {
      setCart((event as CustomEvent<LocalCartItem[]>).detail);
    };

    window.addEventListener("talomart:cart-sync", cartSynced);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("talomart:cart-sync", cartSynced);
    };
  }, [initialCart]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cart]
  );
  const delivery = subtotal >= 5000 || subtotal === 0 ? 0 : 350;
  const total = subtotal + delivery;

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-white p-8 shadow-sm">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
            YOUR BASKET
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            Shopping cart
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Review your items, adjust quantities and continue to secure
            checkout.
          </p>
        </div>

        {!cart.length ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-12 w-12 text-[var(--color-green)]" />
            <h2 className="font-brand mt-4 text-2xl font-extrabold">
              Your cart is empty
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Good tech is waiting — start with today&apos;s Talomart picks.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {cart.map((item) => (
                <article
                  key={item.product.id}
                  className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="h-28 w-full rounded-2xl object-cover sm:w-28"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--color-green)]">
                      {item.product.category}
                    </span>
                    <h2 className="font-brand mt-1 text-lg font-extrabold">
                      {item.product.name}
                    </h2>
                    <p className="mt-2 text-sm font-bold">
                      KSh {formatPrice(item.product.price)}
                    </p>
                    <div className="mt-4 inline-flex items-center rounded-xl border border-slate-200">
                      <form action="/api/cart" method="post">
                        <input
                          type="hidden"
                          name="productId"
                          value={item.product.id}
                        />
                        <input type="hidden" name="intent" value="set" />
                        <input
                          type="hidden"
                          name="quantity"
                          value={Math.max(item.quantity - 1, 0)}
                        />
                        <input type="hidden" name="next" value="/cart" />
                        <button
                          className="p-3 text-[var(--color-navy)] transition hover:text-[var(--color-orange)]"
                          aria-label={`Decrease ${item.product.name} quantity`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </form>
                      <span className="min-w-10 text-center font-bold">
                        {item.quantity}
                      </span>
                      <form action="/api/cart" method="post">
                        <input
                          type="hidden"
                          name="productId"
                          value={item.product.id}
                        />
                        <input type="hidden" name="intent" value="set" />
                        <input
                          type="hidden"
                          name="quantity"
                          value={Math.min(item.quantity + 1, item.product.stock)}
                        />
                        <input type="hidden" name="next" value="/cart" />
                        <button
                          className="p-3 text-[var(--color-navy)] transition hover:text-[var(--color-green)] disabled:cursor-not-allowed disabled:opacity-35"
                          disabled={item.quantity >= item.product.stock}
                          aria-label={`Increase ${item.product.name} quantity`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                  <form
                    action="/api/cart"
                    method="post"
                    className="self-start"
                  >
                    <input
                      type="hidden"
                      name="productId"
                      value={item.product.id}
                    />
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="next" value="/cart" />
                    <button
                      className="rounded-xl border border-slate-200 p-3 text-slate-500 hover:border-red-200 hover:text-red-500"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="font-brand text-2xl font-extrabold">
                Order summary
              </h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>KSh {formatPrice(subtotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <strong>{delivery ? `KSh ${formatPrice(delivery)}` : "Free"}</strong>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <strong>KSh {formatPrice(total)}</strong>
                  </div>
                </div>
              </div>
              <Link
                href="/checkout"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--color-orange)] px-6 text-sm font-extrabold text-white"
              >
                Proceed to checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
