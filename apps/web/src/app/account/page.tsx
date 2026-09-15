import { Heart, PackageCheck, UserRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";
import { customerAuthHref } from "@/lib/auth-redirect";
import {
  customerOrderStatusLabels,
  customerPaymentStatusLabel,
  type OrderStatus
} from "@/lib/order-status";
import { sql } from "@talomart/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

type AccountOrder = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  totalMinor: number;
  placedAt: string;
};

type AccountStatistics = {
  totalOrders: number;
  lifetimeSpendMinor: number;
  savedProducts: number;
};

function label(value: string) {
  return value.replace(/_/g, " ");
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

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return (
      <section className="bg-[var(--color-cream)] py-16">
        <div className="page-shell max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
          <UserRound className="mx-auto h-12 w-12 text-[var(--color-green)]" />
          <h1 className="font-brand mt-4 text-3xl font-extrabold">
            Sign in to your Talomart account
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Track orders, manage delivery details and checkout faster.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={customerAuthHref("/sign-in", "/account")}
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
            >
              Sign in
            </Link>
            <Link
              href={customerAuthHref("/sign-up", "/account")}
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-6 text-sm font-extrabold"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const [orders, statisticsRows] = await Promise.all([
    sql<AccountOrder[]>`
      select
        o.order_number as "orderNumber",
        o.status,
        coalesce(p.status, 'pending') as "paymentStatus",
        o.payment_method as "paymentMethod",
        o.total_minor as "totalMinor",
        o.placed_at::text as "placedAt"
      from orders o
      left join lateral (
        select status
        from payments
        where order_id = o.id
        order by created_at desc
        limit 1
      ) p on true
      where o.user_id = ${session.user.id}
      order by o.placed_at desc
      limit 8
    `,
    sql<AccountStatistics[]>`
      select
        (
          select count(*)::int
          from orders
          where user_id = ${session.user.id}
        ) as "totalOrders",
        (
          select coalesce(sum(o.total_minor), 0)::float8
          from orders o
          where o.user_id = ${session.user.id}
            and o.status not in ('cancelled', 'returned')
            and (
              o.status = 'delivered'
              or exists (
                select 1
                from payments p
                where p.order_id = o.id
                  and p.status = 'paid'
              )
            )
        ) as "lifetimeSpendMinor",
        (
          select count(*)::int
          from wishlist_items wi
          inner join wishlists w on w.id = wi.wishlist_id
          inner join products p on p.id = wi.product_id
          inner join categories c on c.id = p.category_id
          where w.user_id = ${session.user.id}
            and p.is_active = true
            and c.is_active = true
        ) as "savedProducts"
    `
  ]);
  const statistics = statisticsRows[0] ?? {
    totalOrders: 0,
    lifetimeSpendMinor: 0,
    savedProducts: 0
  };

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <div className="page-shell">
        <div className="mb-7 flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
              MY TALOMART
            </span>
            <h1 className="font-brand mt-3 text-4xl font-extrabold">
              Welcome, {session.user.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {session.user.email}
            </p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: PackageCheck,
              title: "Total orders",
              value: new Intl.NumberFormat("en-KE").format(statistics.totalOrders),
              body: "Every order placed while signed in.",
              href: "/account#orders"
            },
            {
              icon: WalletCards,
              title: "Lifetime spend",
              value: formatMoney(statistics.lifetimeSpendMinor),
              body: "Paid purchases and successfully delivered orders.",
              href: "/account#orders"
            },
            {
              icon: Heart,
              title: "Saved products",
              value: new Intl.NumberFormat("en-KE").format(statistics.savedProducts),
              body: "Available products saved to your synced wishlist.",
              href: "/wishlist"
            }
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-3xl border border-transparent bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <item.icon className="h-8 w-8 text-[var(--color-green)]" />
                <span className="text-xs font-extrabold text-slate-400 transition group-hover:text-[var(--color-green)]">
                  View
                </span>
              </div>
              <p className="font-brand mt-5 text-3xl font-extrabold text-[var(--color-navy)]">
                {item.value}
              </p>
              <h2 className="mt-2 text-sm font-extrabold text-[var(--color-navy)]">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.body}</p>
            </Link>
          ))}
        </div>

        <section id="orders" className="mt-7 scroll-mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
                ORDER HISTORY
              </span>
              <h2 className="font-brand mt-2 text-3xl font-extrabold text-[var(--color-navy)]">
                Your Talomart orders
              </h2>
            </div>
            <Link
              href="/track"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-[var(--color-navy)]"
            >
              Track another order
            </Link>
          </div>

          {!orders.length ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <PackageCheck className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="font-brand mt-3 text-xl font-extrabold text-[var(--color-navy)]">
                No orders yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Once you checkout while signed in, your order history will
                appear here.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {orders.map((order) => (
                <article
                  key={order.orderNumber}
                  className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <Link
                      href={`/track?order=${encodeURIComponent(order.orderNumber)}`}
                      className="font-brand text-lg font-extrabold text-[var(--color-navy)] hover:text-[var(--color-green)]"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      {dateLabel(order.placedAt)} · {label(order.paymentMethod)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-extrabold">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                      {customerOrderStatusLabels[order.status]}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      {customerPaymentStatusLabel(order.paymentStatus)}
                    </span>
                  </div>
                  <strong className="text-[var(--color-navy)]">
                    {formatMoney(order.totalMinor)}
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
