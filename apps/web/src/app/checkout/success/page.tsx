import {
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Home,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Truck
} from "lucide-react";
import Link from "next/link";

import { PaymentStatusRefresh } from "@/components/checkout/payment-status-refresh";
import { env } from "@/lib/env";
import { resolveOrderAccess } from "@/lib/order-access-server";
import {
  getMpesaCustomerState,
  getMpesaResendAvailability,
  messageForMpesaState
} from "@/lib/payments/mpesa-lifecycle";
import { sql } from "@talomart/db";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Order placed successfully",
  robots: { index: false, follow: false }
};

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type SuccessOrder = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentMethod: "mpesa" | "cash_on_delivery";
  paymentStatus: string;
  attemptCount: number;
  lastInitiatedAt: string | null;
  paymentUpdatedAt: string;
  providerQueryStatus: string | null;
  subtotalMinor: number;
  deliveryMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  recipientName: string;
  county: string;
  town: string;
  placedAt: string;
  itemCount: number;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return typeof item === "string" ? item.trim() : "";
}

function label(text: string | null | undefined) {
  return (text ?? "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function money(minor: number, currency = "KES") {
  const amount = Math.round(minor / 100);
  const prefix = currency === "KES" ? "KSh" : currency;
  return `${prefix} ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

function dateLabel(valueToFormat: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(valueToFormat));
}

async function findOrder(orderId: string) {
  const [order] = await sql<SuccessOrder[]>`
    select
      o.id::text as "orderId",
      o.order_number as "orderNumber",
      o.status as "orderStatus",
      o.payment_method as "paymentMethod",
      coalesce(p.status, 'pending') as "paymentStatus",
      coalesce(p.attempt_count, 0)::int as "attemptCount",
      p.last_initiated_at::text as "lastInitiatedAt",
      coalesce(p.created_at, o.placed_at)::text as "paymentUpdatedAt",
      p.provider_query_status as "providerQueryStatus",
      o.subtotal_minor as "subtotalMinor",
      o.delivery_minor as "deliveryMinor",
      o.discount_minor as "discountMinor",
      o.total_minor as "totalMinor",
      o.currency,
      o.recipient_name as "recipientName",
      o.county,
      o.town,
      o.placed_at::text as "placedAt",
      coalesce(items.item_count, 0)::int as "itemCount"
    from orders o
    left join lateral (
      select
        status,
        attempt_count,
        last_initiated_at,
        created_at,
        provider_query_status
      from payments
      where order_id = o.id
      order by created_at desc
      limit 1
    ) p on true
    left join lateral (
      select sum(quantity) as item_count
      from order_items
      where order_id = o.id
    ) items on true
    where o.id = ${orderId}::uuid
    limit 1
  `;

  return order ?? null;
}

function DetailRow({
  label: rowLabel,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-semibold text-slate-500">{rowLabel}</dt>
      <dd
        className={`font-extrabold ${
          highlight ? "text-[var(--color-green)]" : "text-[var(--color-navy)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusPill({
  children,
  tone = "green"
}: {
  children: React.ReactNode;
  tone?: "green" | "orange" | "navy";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-50 text-[var(--color-orange)] ring-orange-100"
      : tone === "navy"
        ? "bg-blue-50 text-[var(--color-navy)] ring-blue-100"
        : "bg-emerald-50 text-[var(--color-green)] ring-emerald-100";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] ring-1 ${toneClass}`}
    >
      {children}
    </span>
  );
}

export default async function CheckoutSuccessPage({
  searchParams
}: SuccessPageProps) {
  const params = (await searchParams) ?? {};
  const orderNumber = value(params, "order");
  const access = await resolveOrderAccess(orderNumber);
  const order = access ? await findOrder(access.orderId) : null;

  if (!order) {
    return (
      <section className="bg-[var(--color-cream)] py-16">
        <div className="page-shell max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
          <ReceiptText className="mx-auto h-12 w-12 text-[var(--color-orange)]" />
          <h1 className="font-brand mt-5 text-3xl font-extrabold text-[var(--color-navy)]">
            We could not verify access to that order
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Sign in if the order belongs to your Talomart account. For a guest
            order, use the same browser that completed checkout.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/track"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
            >
              Track an order
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-extrabold text-[var(--color-navy)]"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const isCod = order.paymentMethod === "cash_on_delivery";
  const lifecycle = {
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    attemptCount: Math.max(order.attemptCount, 1),
    lastInitiatedAt: order.lastInitiatedAt,
    paymentUpdatedAt: order.paymentUpdatedAt,
    providerQueryStatus: order.providerQueryStatus
  };
  const mpesaState = getMpesaCustomerState(lifecycle);
  const resend = getMpesaResendAvailability(
    lifecycle,
    env.MPESA_ENVIRONMENT
  );
  const isMpesaProcessing =
    order.paymentMethod === "mpesa" && mpesaState === "processing";
  const isMpesaActionNeeded =
    order.paymentMethod === "mpesa" &&
    (mpesaState === "prompt_timeout" || mpesaState === "failed");
  const isMpesaAbandoned =
    order.paymentMethod === "mpesa" && mpesaState === "abandoned";
  const orderConfirmed = isCod || mpesaState === "confirmed";
  const paymentTone = order.paymentStatus === "paid" ? "green" : "orange";

  const heroLabel = isMpesaProcessing
    ? "PAYMENT PROCESSING"
    : isMpesaActionNeeded
      ? "PAYMENT ACTION NEEDED"
      : isMpesaAbandoned
        ? "PAYMENT REQUEST EXPIRED"
        : "ORDER CONFIRMED";
  const heroMessage = isMpesaProcessing
    ? "We sent the payment request and are checking Daraja automatically. Your order is reserved, but it is not confirmed until M-Pesa reports a successful payment."
    : isMpesaActionNeeded
      ? "The payment has not been confirmed. Check the status below or safely resend the STK Push when available."
      : isMpesaAbandoned
        ? "The payment window expired without confirmation. This order was cancelled and its reserved stock was released."
        : "Your Talomart order has been received. We’ve reserved the items and our team can now prepare the order for fulfillment.";

  return (
    <section className="bg-[var(--color-cream)] py-10 sm:py-14">
      <div className="page-shell">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="relative bg-[var(--color-navy)] px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full bg-[var(--color-green)]/20 blur-2xl sm:block" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--color-green)] shadow-sm">
                  {orderConfirmed ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <CreditCard className="h-8 w-8 text-[var(--color-orange)]" />
                  )}
                </div>
                <span className="mt-5 block text-xs font-extrabold tracking-[0.28em] text-[var(--color-orange)]">
                  {heroLabel}
                </span>
                <h1 className="font-brand mt-3 text-3xl font-extrabold sm:text-5xl">
                  Thank you, {order.recipientName.split(" ")[0]}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
                  {heroMessage}
                </p>
                {!isCod && (
                  <PaymentStatusRefresh
                    orderNumber={order.orderNumber}
                    initialStatus={{
                      state: mpesaState,
                      message: messageForMpesaState(mpesaState),
                      canResend: resend.canResend,
                      retryAfterSeconds: resend.retryAfterSeconds,
                      attemptsRemaining: resend.attemptsRemaining,
                      attemptCount: lifecycle.attemptCount
                    }}
                  />
                )}
              </div>

              <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                  Order number
                </span>
                <strong className="mt-2 block text-2xl text-white">
                  {order.orderNumber}
                </strong>
                <p className="mt-2 text-xs text-blue-100">
                  Placed {dateLabel(order.placedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-100">
                  <ClipboardCheck className="h-6 w-6 text-[var(--color-green)]" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Delivery status
                  </p>
                  <strong className="mt-1 block text-lg text-[var(--color-navy)]">
                    {label(order.orderStatus)}
                  </strong>
                </div>
                <div className="rounded-3xl bg-orange-50 p-5 ring-1 ring-orange-100">
                  <CreditCard className="h-6 w-6 text-[var(--color-orange)]" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Payment status
                  </p>
                  <strong className="mt-1 block text-lg text-[var(--color-navy)]">
                    {label(order.paymentStatus)}
                  </strong>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-slate-100">
                  <ShoppingBag className="h-6 w-6 text-[var(--color-navy)]" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    Order total
                  </p>
                  <strong className="mt-1 block text-lg text-[var(--color-navy)]">
                    {money(order.totalMinor, order.currency)}
                  </strong>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-green)]/10 text-[var(--color-green)]">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-brand text-2xl font-extrabold text-[var(--color-navy)]">
                      What happens next?
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Talomart will process, pack and prepare your order for
                      delivery. You can follow progress using the tracking page.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {[
                    ["Processing", "Your order is in the fulfillment queue."],
                    ["Packed", "The team prepares and checks the items."],
                    ["Out for delivery", "The order moves to customer delivery."]
                  ].map(([title, body]) => (
                    <div
                      key={title}
                      className="rounded-2xl bg-slate-50 p-4 text-sm leading-6"
                    >
                      <PackageCheck className="h-5 w-5 text-[var(--color-green)]" />
                      <strong className="mt-3 block text-[var(--color-navy)]">
                        {title}
                      </strong>
                      <span className="text-slate-500">{body}</span>
                    </div>
                  ))}
                </div>
              </div>

              {isCod && (
                <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6 text-sm leading-7 text-orange-900">
                  <StatusPill tone="orange">Cash on delivery</StatusPill>
                  <h2 className="font-brand mt-4 text-2xl font-extrabold text-[var(--color-navy)]">
                    Pay when your order arrives
                  </h2>
                  <p className="mt-2">
                    Your payment is currently pending because Cash on Delivery
                    was selected. Talomart will collect payment after delivery
                    or collection, then mark the order as paid.
                  </p>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-brand text-2xl font-extrabold text-[var(--color-navy)]">
                    Order summary
                  </h2>
                  <StatusPill tone={paymentTone}>{label(order.paymentStatus)}</StatusPill>
                </div>
                <dl className="mt-4">
                  <DetailRow
                    label="Payment method"
                    value={isCod ? "Cash on Delivery" : "M-Pesa"}
                  />
                  <DetailRow
                    label="Payment status"
                    value={label(order.paymentStatus)}
                  />
                  <DetailRow
                    label="Delivery status"
                    value={label(order.orderStatus)}
                  />
                  <DetailRow
                    label="Items"
                    value={`${order.itemCount} ${order.itemCount === 1 ? "item" : "items"}`}
                  />
                  <DetailRow
                    label="Order total"
                    value={money(order.totalMinor, order.currency)}
                    highlight
                  />
                </dl>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <MapPin className="h-7 w-7 text-[var(--color-green)]" />
                <h2 className="font-brand mt-4 text-2xl font-extrabold text-[var(--color-navy)]">
                  Delivery area
                </h2>
                <p className="mt-3 text-sm font-bold leading-7 text-[var(--color-navy)]">
                  {order.town}, {order.county}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Your full delivery details are kept private and are available
                  only to the fulfilment team.
                </p>
              </div>

              <div className="grid gap-3">
                <Link
                  href={`/track?order=${encodeURIComponent(order.orderNumber)}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white shadow-sm"
                >
                  <Truck className="h-4 w-4" />
                  Track order
                </Link>
                <Link
                  href="/products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-[var(--color-navy)]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Continue shopping
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-50 px-6 text-sm font-extrabold text-slate-600"
                >
                  <Home className="h-4 w-4" />
                  Back to homepage
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
