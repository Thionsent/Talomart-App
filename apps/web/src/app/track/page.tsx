import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  Search,
  Truck
} from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

import { TrackingStatusRefresh } from "@/components/orders/tracking-status-refresh";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { resolveOrderAccess } from "@/lib/order-access-server";
import { consumeOrderLookupRateLimit } from "@/lib/order-lookup-rate-limit";
import {
  customerOrderStatusLabels,
  customerPaymentStatusLabel,
  type OrderStatus
} from "@/lib/order-status";
import { loadOrderTrackingState } from "@/lib/order-tracking-resilience";
import { sql } from "@talomart/db";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Track your order",
  robots: { index: false, follow: false }
};

type TrackPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TrackingEvent = {
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

type TrackedOrder = {
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  placedAt: string;
  updatedAt: string;
  latestFulfillmentStatus: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  history: TrackingEvent[];
};

type RecentOrder = {
  orderNumber: string;
  orderStatus: OrderStatus;
  placedAt: string;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return typeof item === "string" ? item.trim() : "";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function eventLabel(event: TrackingEvent) {
  const nextStatus = event.payload.nextStatus;
  if (
    event.type === "order_status_changed" &&
    typeof nextStatus === "string" &&
    nextStatus in customerOrderStatusLabels
  ) {
    return customerOrderStatusLabels[nextStatus as OrderStatus];
  }

  const fulfillmentStatus = event.payload.status;
  if (event.type === "fulfillment_updated" && typeof fulfillmentStatus === "string") {
    if (fulfillmentStatus === "shipped") return "Shipped";
    return fulfillmentStatus.replace(/_/g, " ");
  }
  if (event.type === "payment_status_changed") {
    return customerPaymentStatusLabel(
      String(event.payload.nextPaymentStatus ?? "pending")
    );
  }
  if (["payment_confirmed", "mpesa_payment_confirmed"].includes(event.type)) {
    return "Payment confirmed";
  }
  if (event.type === "order_cancelled") return "Order cancelled";
  if (event.type === "cod_payment_collected") return "Payment collected";
  return null;
}

async function findOrder(orderId: string) {
  const [order] = await sql<TrackedOrder[]>`
    select
      o.order_number as "orderNumber",
      o.status as "orderStatus",
      coalesce(p.status, 'pending') as "paymentStatus",
      o.payment_method as "paymentMethod",
      o.placed_at::text as "placedAt",
      o.updated_at::text as "updatedAt",
      f.status as "latestFulfillmentStatus",
      f.tracking_number as "trackingNumber",
      f.courier_name as "courierName",
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'type', history.type,
              'payload', history.payload,
              'createdAt', history.created_at::text
            )
            order by history.created_at asc
          )
          from (
            select
              'order_status_changed'::text as type,
              jsonb_build_object(
                'previousStatus', osh.previous_status,
                'nextStatus', osh.next_status,
                'source', osh.source,
                'reason', osh.reason
              ) as payload,
              osh.created_at
            from order_status_history osh
            where osh.order_id = o.id

            union all

            select type, payload, created_at
            from notification_events
            where order_id = o.id
              and audience = 'customer'
              and type in (
                'fulfillment_updated',
                'payment_status_changed',
                'payment_confirmed',
                'mpesa_payment_confirmed',
                'order_cancelled',
                'cod_payment_collected'
              )
            order by created_at desc
            limit 20
          ) history
        ),
        '[]'::jsonb
      ) as history
    from orders o
    left join lateral (
      select status
      from payments
      where order_id = o.id
      order by created_at desc
      limit 1
    ) p on true
    left join lateral (
      select courier_name, tracking_number, status
      from fulfillments
      where order_id = o.id
      order by created_at desc
      limit 1
    ) f on true
    where o.id = ${orderId}::uuid
    limit 1
  `;
  return order ?? null;
}

async function findRecentOrders(userId: string) {
  return sql<RecentOrder[]>`
    select
      order_number as "orderNumber",
      status as "orderStatus",
      placed_at::text as "placedAt"
    from orders
    where user_id = ${userId}
    order by placed_at desc
    limit 6
  `;
}

function Step({
  active,
  done,
  title,
  body
}: {
  active?: boolean;
  done?: boolean;
  title: string;
  body: string;
}) {
  const Icon = done ? CheckCircle2 : active ? Clock3 : PackageCheck;
  return (
    <div className={`rounded-2xl border p-4 ${done || active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <Icon className={`h-6 w-6 ${done || active ? "text-[var(--color-green)]" : "text-slate-300"}`} />
      <h3 className="font-brand mt-3 text-lg font-extrabold text-[var(--color-navy)]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export default async function TrackPage({ searchParams }: TrackPageProps) {
  const params = (await searchParams) ?? {};
  const orderNumber = value(params, "order");
  const requestHeaders = await headers();
  const session = await auth.api
    .getSession({ headers: requestHeaders })
    .catch(() => null);
  const sessionUserId = session?.user.id ?? null;
  const [trackingState, recentOrders] = await Promise.all([
    orderNumber
      ? loadOrderTrackingState({
          getSessionUserId: async () => sessionUserId,
          consumeRateLimit: () =>
            consumeOrderLookupRateLimit({ requestHeaders, sessionUserId }),
          resolveAccess: () =>
            resolveOrderAccess(orderNumber, { sessionUserId }),
          findOrder: (access) => findOrder(access.orderId)
        })
      : null,
    sessionUserId ? findRecentOrders(sessionUserId) : Promise.resolve([])
  ]);

  if (trackingState?.status === "unavailable") {
    logger.warn(
      { error: trackingState.error, stage: trackingState.stage },
      "Order tracking dependency unavailable"
    );
  }

  const order = trackingState?.status === "found" ? trackingState.order : null;
  const paid = order?.paymentStatus === "paid";
  const confirmed = [
    "payment_confirmed",
    "processing",
    "packed",
    "out_for_delivery",
    "delivered"
  ].includes(order?.orderStatus ?? "");
  const shipmentState =
    order?.latestFulfillmentStatus === "shipped"
      ? "out_for_delivery"
      : (order?.latestFulfillmentStatus ?? order?.orderStatus ?? "");
  const shipped = ["out_for_delivery", "delivered"].includes(shipmentState);
  const delivered =
    order?.orderStatus === "delivered" ||
    order?.latestFulfillmentStatus === "delivered";
  const visibleHistory = order?.history
    .map((event) => ({ ...event, label: eventLabel(event) }))
    .filter((event) => event.label) ?? [];

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-[var(--color-navy)] p-8 text-white">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">ORDER UPDATES</span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">Track your order</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
            {session
              ? `Signed in as ${session.user.name}. Track orders securely from your Talomart account.`
              : "Enter a guest order number using the same browser that completed checkout, or sign in to view account orders."}
          </p>
        </div>

        {order ? (
          <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Currently tracking</span>
              <p className="font-brand mt-1 text-xl font-extrabold text-[var(--color-navy)]">{order.orderNumber}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <TrackingStatusRefresh />
              <Link href="/track" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-[var(--color-navy)]">Track another order</Link>
              {session && (
                <Link href="/account#orders" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--color-green)] px-4 text-sm font-extrabold text-white">View all my orders</Link>
              )}
            </div>
          </div>
        ) : (
          <form className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
            <label className="grid gap-2 text-sm font-extrabold text-[var(--color-navy)] md:grid-cols-[1fr_auto] md:items-end">
              <span>
                Order number
                <input name="order" defaultValue={orderNumber} placeholder="TLM-20260720-ABC12345" autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 font-semibold outline-none focus:border-[var(--color-green)]" />
              </span>
              <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white">
                <Search className="h-4 w-4" /> Track
              </button>
            </label>
            {!session && (
              <p className="mt-3 text-xs leading-5 text-slate-500">An order number alone does not grant access. Guest tracking also requires the secure credential stored by this browser at checkout.</p>
            )}
          </form>
        )}

        {!orderNumber && session && recentOrders.length > 0 && (
          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-brand text-2xl font-extrabold text-[var(--color-navy)]">Your recent orders</h2>
            <p className="mt-2 text-sm text-slate-500">Select an order—there is no need to copy and re-enter its number.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {recentOrders.map((recentOrder) => (
                <Link key={recentOrder.orderNumber} href={`/track?order=${encodeURIComponent(recentOrder.orderNumber)}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50">
                  <span>
                    <strong className="block text-sm text-[var(--color-navy)]">{recentOrder.orderNumber}</strong>
                    <span className="mt-1 block text-xs text-slate-500">{dateLabel(recentOrder.placedAt)}</span>
                  </span>
                  <span className="text-right text-xs font-extrabold text-[var(--color-green)]">{customerOrderStatusLabels[recentOrder.orderStatus]}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {orderNumber && trackingState?.status === "unavailable" && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900" role="alert">
            <strong className="block text-base text-[var(--color-navy)]">Order tracking is temporarily unavailable</strong>
            We could not securely verify your order right now. Please try again shortly. Your order has not been changed.
          </div>
        )}
        {orderNumber && trackingState?.status === "rate_limited" && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">Too many tracking attempts were made from this browser. Please wait about {Math.max(1, Math.ceil(trackingState.rateLimit.retryAfterSeconds / 60))} minutes before trying again.</div>
        )}
        {orderNumber && trackingState?.status === "not_found" && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">
            {session
              ? "We could not verify that this order belongs to your account. Choose one of your account orders or check the number."
              : "We could not verify access to that order. Sign in if it belongs to your account, or use the browser that completed guest checkout."}
          </div>
        )}

        {order && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="border-b border-slate-100 pb-5">
                  <span className="text-xs font-extrabold tracking-[0.2em] text-[var(--color-green)]">{order.orderNumber}</span>
                  <h2 className="font-brand mt-2 text-3xl font-extrabold text-[var(--color-navy)]">{customerOrderStatusLabels[order.orderStatus]}</h2>
                  <p className="mt-2 text-sm text-slate-500">Placed {dateLabel(order.placedAt)} · Last updated {dateLabel(order.updatedAt)}</p>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <Step done={paid} active={!paid} title="Payment" body={order.paymentMethod === "cash_on_delivery" && !paid ? "Pay when delivered" : customerPaymentStatusLabel(order.paymentStatus)} />
                  <Step done={confirmed} active={paid && !confirmed} title="Confirmed" body="Order accepted by Talomart" />
                  <Step done={shipped} active={confirmed && !shipped} title="Fulfilment" body={order.latestFulfillmentStatus ? order.latestFulfillmentStatus.replace(/_/g, " ") : customerOrderStatusLabels[order.orderStatus]} />
                  <Step done={delivered} active={shipped && !delivered} title="Delivered" body="Completed delivery" />
                </div>
              </div>

              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="font-brand text-2xl font-extrabold text-[var(--color-navy)]">Progress history</h2>
                <div className="mt-5 grid gap-4 border-l-2 border-emerald-100 pl-5">
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-[var(--color-green)]" />
                    <strong className="text-sm text-[var(--color-navy)]">Order placed</strong>
                    <p className="mt-1 text-xs text-slate-500">{dateLabel(order.placedAt)}</p>
                  </div>
                  {visibleHistory.map((event, index) => (
                    <div key={`${event.type}-${event.createdAt}-${index}`} className="relative">
                      <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-[var(--color-green)]" />
                      <strong className="text-sm capitalize text-[var(--color-navy)]">{event.label}</strong>
                      <p className="mt-1 text-xs text-slate-500">{dateLabel(event.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
              <Truck className="h-8 w-8 text-[var(--color-green)]" />
              <h2 className="font-brand mt-4 text-2xl font-extrabold text-[var(--color-navy)]">Delivery snapshot</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Courier</dt><dd className="font-bold">{order.courierName ?? "Pending"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Tracking</dt><dd className="font-bold">{order.trackingNumber ?? "Not assigned"}</dd></div>
              </dl>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
