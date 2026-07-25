"use client";

import { CreditCard, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CART_KEY, type LocalCartItem } from "@/lib/cart-storage";
const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

export function CheckoutPageClient({
  initialCart = [],
  isAuthenticated = false
}: {
  initialCart?: LocalCartItem[];
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<LocalCartItem[]>(initialCart);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash_on_delivery" | "mpesa"
  >("cash_on_delivery");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const localCart = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
        if (initialCart.length) {
          setCart(initialCart);
          localStorage.setItem(CART_KEY, JSON.stringify(initialCart));
        } else if (localCart.length) {
          setCart(localCart);
        }
      } catch {
        setCart([]);
      }
    });

    return () => window.cancelAnimationFrame(frame);
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

  async function submitCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          delivery: {
            recipientName: String(formData.get("recipientName") ?? ""),
            phone: String(formData.get("phone") ?? ""),
            county: String(formData.get("county") ?? ""),
            town: String(formData.get("town") ?? ""),
            deliveryAddress: String(formData.get("address") ?? ""),
            customerNote: String(formData.get("note") ?? "")
          },
          paymentMethod
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Checkout failed. Please try again.");
        return;
      }

      setCart([]);
      localStorage.removeItem(CART_KEY);
      window.dispatchEvent(
        new CustomEvent("talomart:cart-sync", { detail: [] })
      );
      router.push(
        `/checkout/success?order=${encodeURIComponent(payload.order.orderNumber)}`
      );
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-[var(--color-navy)] p-8 text-white">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">
            SECURE CHECKOUT
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            Complete your order
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
            Add delivery details and choose how you want to pay.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form
            className="rounded-3xl bg-white p-6 shadow-sm"
            onSubmit={submitCheckout}
          >
            {!isAuthenticated && (
              <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-sm text-[var(--color-navy)]">
                    Have a Talomart account?
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Sign in and return here, or continue below as a guest.
                  </p>
                </div>
                <Link
                  href="/sign-in?next=%2Fcheckout"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-navy)] px-5 text-xs font-extrabold text-white"
                >
                  Sign in
                </Link>
              </div>
            )}
            <h2 className="font-brand text-2xl font-extrabold">
              Delivery details
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ["recipientName", "Recipient name"],
                ["phone", "Phone number"],
                ["county", "County"],
                ["town", "Town / Estate"]
              ].map(([name, label]) => (
                <label key={name} className="text-sm font-bold">
                  {label}
                  <input
                    name={name}
                    required
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-[var(--color-green)]"
                  />
                </label>
              ))}
              <label className="text-sm font-bold md:col-span-2">
                Delivery address
                <input
                  name="address"
                  required
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-[var(--color-green)]"
                />
              </label>
              <label className="text-sm font-bold md:col-span-2">
                Customer note
                <textarea
                  name="note"
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-[var(--color-green)]"
                />
              </label>
            </div>

            <h2 className="font-brand mt-8 text-2xl font-extrabold">
              Payment method
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cash on Delivery is active now. M-Pesa STK Push will become the
              recommended option once Daraja production approval is complete.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                  paymentMethod === "cash_on_delivery"
                    ? "border-[var(--color-green)] bg-emerald-50 shadow-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash_on_delivery"
                  checked={paymentMethod === "cash_on_delivery"}
                  onChange={() => setPaymentMethod("cash_on_delivery")}
                />
                <span>
                  <strong className="flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Cash on delivery
                  </strong>
                  <small className="text-slate-500">
                    Ready now · pay when delivered
                  </small>
                </span>
              </label>
              <label
                className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                  paymentMethod === "mpesa"
                    ? "border-[var(--color-orange)] bg-orange-50 shadow-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mpesa"
                  checked={paymentMethod === "mpesa"}
                  onChange={() => setPaymentMethod("mpesa")}
                />
                <span>
                  <strong className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> M-Pesa
                  </strong>
                  <small className="text-slate-500">
                    STK Push · pending Daraja go-live
                  </small>
                </span>
              </label>
            </div>

            {error && (
              <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                {error}
              </p>
            )}

            <button
              className="mt-8 min-h-12 w-full rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white disabled:opacity-50"
              disabled={!cart.length || submitting}
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </form>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-brand text-2xl font-extrabold">
              Order summary
            </h2>
            <div className="mt-5 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 border-b border-slate-100 pb-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.image}
                    alt=""
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="line-clamp-2 text-sm font-bold">
                      {item.product.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <strong className="text-sm">
                    KSh {formatPrice(item.product.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <strong>KSh {formatPrice(subtotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <strong>{delivery ? `KSh ${formatPrice(delivery)}` : "Free"}</strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
                <span className="font-bold">Total</span>
                <strong>KSh {formatPrice(total)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
