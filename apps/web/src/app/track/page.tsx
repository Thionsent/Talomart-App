import { CheckCircle2, Clock3, PackageCheck, Search, Truck } from "lucide-react";

import { sql } from "@talomart/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track your order" };

type TrackPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type TrackedOrder = {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  totalMinor: number;
  recipientName: string;
  town: string;
  county: string;
  placedAt: string;
  latestFulfillmentStatus: string | null;
  trackingNumber: string | null;
  courierName: string | null;
};

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return typeof item === "string" ? item.trim() : "";
}

function label(text: string | null | undefined) {
  return (text ?? "pending").replace(/_/g, " ");
}

function formatMoney(minor: number) {
  return `KSh ${new Intl.NumberFormat("en-KE").format(Math.round(minor / 100))}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function findOrder(orderNumber: string) {
  if (!orderNumber) return null;

  const [order] = await sql<TrackedOrder[]>`
    select
      o.order_number as "orderNumber",
      o.status as "orderStatus",
      coalesce(p.status, 'pending') as "paymentStatus",
      o.payment_method as "paymentMethod",
      o.total_minor as "totalMinor",
      o.recipient_name as "recipientName",
      o.town,
      o.county,
      o.placed_at::text as "placedAt",
      f.status as "latestFulfillmentStatus",
      f.tracking_number as "trackingNumber",
      f.courier_name as "courierName"
    from orders o
    left join payments p on p.order_id = o.id
    left join lateral (
      select courier_name, tracking_number, status
      from fulfillments
      where order_id = o.id
      order by created_at desc
      limit 1
    ) f on true
    where lower(o.order_number) = lower(${orderNumber})
    limit 1
  `;

  return order ?? null;
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
    <div
      className={`rounded-2xl border p-4 ${
        done || active
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <Icon
        className={`h-6 w-6 ${
          done || active ? "text-[var(--color-green)]" : "text-slate-300"
        }`}
      />
      <h3 className="font-brand mt-3 text-lg font-extrabold text-[var(--color-navy)]">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
    </div>
  );
}

export default async function TrackPage({ searchParams }: TrackPageProps) {
  const params = (await searchParams) ?? {};
  const orderNumber = value(params, "order");
  const order = await findOrder(orderNumber);
  const paid = order?.paymentStatus === "paid";
  const confirmed = [
    "payment_confirmed",
    "processing",
    "packed",
    "out_for_delivery",
    "delivered"
  ].includes(order?.orderStatus ?? "");
  const shipped = ["out_for_delivery", "delivered"].includes(
    order?.latestFulfillmentStatus ?? order?.orderStatus ?? ""
  );
  const delivered =
    order?.orderStatus === "delivered" ||
    order?.latestFulfillmentStatus === "delivered";

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 rounded-3xl bg-[var(--color-navy)] p-8 text-white">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">
            ORDER UPDATES
          </span>
          <h1 className="font-brand mt-3 text-4xl font-extrabold">
            Track your order
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
            Enter your Talomart order number to see payment, fulfillment and
            delivery progress.
          </p>
        </div>

        <form className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <label className="grid gap-2 text-sm font-extrabold text-[var(--color-navy)] md:grid-cols-[1fr_auto] md:items-end">
            <span>
              Order number
              <input
                name="order"
                defaultValue={orderNumber}
                placeholder="TLM-20260720-ABC12345"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 font-semibold outline-none focus:border-[var(--color-green)]"
              />
            </span>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white">
              <Search className="h-4 w-4" />
              Track
            </button>
          </label>
        </form>

        {orderNumber && !order && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">
            We could not find that order number. Please confirm the code from
            your checkout confirmation and try again.
          </div>
        )}

        {order && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="text-xs font-extrabold tracking-[0.2em] text-[var(--color-green)]">
                    {order.orderNumber}
                  </span>
                  <h2 className="font-brand mt-2 text-3xl font-extrabold text-[var(--color-navy)]">
                    {label(order.orderStatus)}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Placed {dateLabel(order.placedAt)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-right">
                  <span className="text-xs font-bold text-slate-500">Total</span>
                  <strong className="block text-xl text-[var(--color-navy)]">
                    {formatMoney(order.totalMinor)}
                  </strong>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Step
                  done={paid || confirmed}
                  active={!paid && order.paymentMethod === "mpesa"}
                  title="Payment"
                  body={label(order.paymentStatus)}
                />
                <Step
                  done={confirmed}
                  active={paid && !confirmed}
                  title="Confirmed"
                  body="Order accepted by Talomart"
                />
                <Step
                  done={shipped}
                  active={confirmed && !shipped}
                  title="Fulfillment"
                  body={label(order.latestFulfillmentStatus ?? order.orderStatus)}
                />
                <Step
                  done={delivered}
                  active={shipped && !delivered}
                  title="Delivered"
                  body="Completed delivery"
                />
              </div>
            </div>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
              <Truck className="h-8 w-8 text-[var(--color-green)]" />
              <h2 className="font-brand mt-4 text-2xl font-extrabold text-[var(--color-navy)]">
                Delivery snapshot
              </h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Recipient</dt>
                  <dd className="font-bold">{order.recipientName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Location</dt>
                  <dd className="font-bold">
                    {order.town}, {order.county}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Courier</dt>
                  <dd className="font-bold">{order.courierName ?? "Pending"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Tracking</dt>
                  <dd className="font-bold">
                    {order.trackingNumber ?? "Not assigned"}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
