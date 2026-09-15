import { sql } from "@talomart/db";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getAdminPrincipal } from "@/lib/admin-authorization";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email delivery monitoring" };

type EmailEvent = {
  id: string;
  orderNumber: string | null;
  type: string;
  status: string;
  recipientEmail: string | null;
  attemptCount: number;
  providerMessageId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type StatusCount = { status: string; count: number };

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-700";
  if (["failed", "bounced", "complained", "suppressed"].includes(status)) {
    return "bg-red-50 text-red-700";
  }
  if (["retrying", "delayed"].includes(status)) return "bg-amber-50 text-amber-800";
  return "bg-blue-50 text-blue-700";
}

export default async function AdminNotificationsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/sign-in");
  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) {
    redirect("/admin/security/setup");
  }
  if (!principal.can("orders.manage")) redirect("/admin/no-access");

  const [events, counts] = await Promise.all([
    sql<EmailEvent[]>`
      select
        ne.id::text,
        o.order_number as "orderNumber",
        ne.type,
        ne.status,
        ne.recipient_email as "recipientEmail",
        ne.attempt_count as "attemptCount",
        ne.provider_message_id as "providerMessageId",
        ne.last_error as "lastError",
        ne.created_at::text as "createdAt",
        ne.updated_at::text as "updatedAt"
      from notification_events ne
      left join orders o on o.id = ne.order_id
      where ne.channel = 'email'
      order by ne.created_at desc
      limit 200
    `,
    sql<StatusCount[]>`
      select status, count(*)::int as count
      from notification_events
      where channel = 'email'
      group by status
      order by status
    `
  ]);
  const attention = counts
    .filter((row) => ["failed", "bounced", "complained", "suppressed", "delayed"].includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);

  return (
    <AdminDashboardShell
      principal={principal}
      active="notifications"
      focus={{
        primary: attention ? `${attention} email${attention === 1 ? "" : "s"} need attention` : "Email delivery is healthy",
        secondary: "Resend webhooks keep delivery and bounce outcomes current."
      }}
    >
      <section>
        <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
          CUSTOMER COMMUNICATION
        </span>
        <h1 className="font-brand mt-2 text-4xl font-extrabold">Email delivery</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          The newest 200 transactional messages are shown. Pending and retrying messages are handled automatically; permanent failures require investigation.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {counts.map((row) => (
            <div key={row.status} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label(row.status)}</p>
              <p className="font-brand mt-2 text-3xl font-black text-[var(--color-navy)]">{row.count}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Message</th>
                  <th className="px-5 py-4">Recipient</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Attempts</th>
                  <th className="px-5 py-4">Provider / error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {new Date(event.createdAt).toLocaleString("en-KE")}
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block">{label(event.type)}</strong>
                      {event.orderNumber && (
                        <Link
                          href={`/admin?view=orders&oq=${encodeURIComponent(event.orderNumber)}`}
                          className="mt-1 block font-mono text-xs text-[var(--color-green)] hover:underline"
                        >
                          {event.orderNumber}
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-4">{event.recipientEmail ?? "No address"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(event.status)}`}>
                        {label(event.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">{event.attemptCount}</td>
                    <td className="max-w-sm px-5 py-4 text-xs text-slate-500">
                      {event.lastError ?? event.providerMessageId ?? "Waiting to send"}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      No transactional emails have been queued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminDashboardShell>
  );
}
