import { PackageCheck, ShieldCheck, Truck, UserRound } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";
import { sql } from "@talomart/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account" };

type AccountOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalMinor: number;
  placedAt: string;
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
              href="/sign-in"
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-6 text-sm font-extrabold"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const orders = await sql<AccountOrder[]>`
    select
      o.order_number as "orderNumber",
      o.status,
      coalesce(p.status, 'pending') as "paymentStatus",
      o.payment_method as "paymentMethod",
      o.total_minor as "totalMinor",
      o.placed_at::text as "placedAt"
    from orders o
    left join payments p on p.order_id = o.id
    where o.user_id = ${session.user.id}
    order by o.placed_at desc
    limit 8
  `;

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
              title: "Orders",
              body: `${orders.length} recent order${orders.length === 1 ? "" : "s"} in your account.`
            },
            {
              icon: Truck,
              title: "Delivery addresses",
              body: "Save Nairobi, county and town delivery details for faster checkout."
            },
            {
              icon: ShieldCheck,
              title: "Account security",
              body: "Your session is stored securely in Supabase PostgreSQL through Better Auth."
            }
          ].map((item) => (
            <article key={item.title} className="rounded-3xl bg-white p-6 shadow-sm">
              <item.icon className="h-8 w-8 text-[var(--color-green)]" />
              <h2 className="font-brand mt-5 text-xl font-extrabold">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
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
                      {label(order.status)}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      {label(order.paymentStatus)}
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
