"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  changeCartItemQuantity,
  persistCartMutation,
  readLocalCart,
  removeProductFromCart,
  type LocalCartItem,
  writeLocalCart
} from "@/lib/cart-storage";
import { isMpesaSandboxTestCart } from "@/lib/payments/mpesa-sandbox-product";
const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

export function CartPageClient({
  cartScope,
  initialCart = [],
  mpesaSandbox = false
}: {
  cartScope: string;
  initialCart?: LocalCartItem[];
  mpesaSandbox?: boolean;
}) {
  const [cart, setCart] = useState<LocalCartItem[]>(initialCart);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const localCart = readLocalCart(cartScope);
      if (initialCart.length) {
        setCart(initialCart);
        writeLocalCart(initialCart, cartScope);
      } else {
        setCart(localCart);
        writeLocalCart(localCart, cartScope);
      }
    });

    const cartSynced = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!detail || typeof detail !== "object") return;
      const change = detail as { scope?: unknown; items?: unknown };
      if (change.scope !== cartScope || !Array.isArray(change.items)) return;
      setCart(change.items as LocalCartItem[]);
    };

    window.addEventListener("talomart:cart-sync", cartSynced);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("talomart:cart-sync", cartSynced);
    };
  }, [cartScope, initialCart]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cart]
  );
  const sandboxTestCart =
    mpesaSandbox &&
    isMpesaSandboxTestCart(cart.map((item) => item.product));
  const delivery =
    sandboxTestCart || subtotal >= 5000 || subtotal === 0 ? 0 : 350;
  const total = subtotal + delivery;

  function syncCartMutation(
    productId: string,
    intent: "set" | "remove",
    quantity = 0
  ) {
    setSyncError("");
    void persistCartMutation({ productId, intent, quantity }).catch(() => {
      setSyncError(
        "Your cart is saved on this device, but server synchronization failed."
      );
    });
  }

  function updateQuantity(productId: string, delta: number) {
    const updated = changeCartItemQuantity(cart, productId, delta);
    const updatedItem = updated.find((item) => item.product.id === productId);

    setCart(updated);
    writeLocalCart(updated, cartScope);
    syncCartMutation(
      productId,
      updatedItem ? "set" : "remove",
      updatedItem?.quantity ?? 0
    );
  }

  function removeItem(productId: string) {
    const updated = removeProductFromCart(cart, productId);

    setCart(updated);
    writeLocalCart(updated, cartScope);
    syncCartMutation(productId, "remove");
  }

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

        {syncError && (
          <p
            className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800"
            role="alert"
          >
            {syncError}
          </p>
        )}

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
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-3 text-[var(--color-navy)] transition hover:text-[var(--color-orange)]"
                        aria-label={`Decrease ${item.product.name} quantity`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-10 text-center font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-3 text-[var(--color-navy)] transition hover:text-[var(--color-green)] disabled:cursor-not-allowed disabled:opacity-35"
                        disabled={item.quantity >= item.product.stock}
                        aria-label={`Increase ${item.product.name} quantity`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id)}
                    className="self-start rounded-xl border border-slate-200 p-3 text-slate-500 hover:border-red-200 hover:text-red-500"
                    aria-label={`Remove ${item.product.name} from cart`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
