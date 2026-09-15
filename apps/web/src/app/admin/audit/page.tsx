import { sql } from "@talomart/db";
import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { getAdminPrincipal } from "@/lib/admin-authorization";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administrator audit log" };

type AuditRow = {
  id: string;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  summary: string;
  createdAt: string;
};

export default async function AdminAuditPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/sign-in");
  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) {
    redirect("/admin/security/setup");
  }
  if (!principal.can("audit.read")) redirect("/admin/no-access");

  const events = await sql<AuditRow[]>`
    select
      aal.id::text,
      u.email as "actorEmail",
      aal.actor_role as "actorRole",
      aal.action,
      aal.resource_type as "resourceType",
      aal.resource_id as "resourceId",
      aal.summary,
      aal.created_at::text as "createdAt"
    from admin_audit_logs aal
    left join "user" u on u.id = aal.actor_id
    order by aal.created_at desc
    limit 200
  `;

  return (
    <AdminDashboardShell
      principal={principal}
      active="audit"
      focus={{
        primary: `${events.length} recent audit event${events.length === 1 ? "" : "s"}`,
        secondary: "The audit trail is append-only and security sensitive."
      }}
    >
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
              IMMUTABLE RECORD
            </span>
            <h1 className="font-brand mt-2 text-4xl font-extrabold">Administrator audit log</h1>
            <p className="mt-2 text-sm text-slate-600">The newest 200 security-sensitive changes are shown.</p>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Time</th>
                  <th className="px-5 py-4">Actor</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Record</th>
                  <th className="px-5 py-4">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(event.createdAt).toLocaleString("en-KE")}</td>
                    <td className="px-5 py-4"><strong className="block">{event.actorEmail ?? "Removed account"}</strong><span className="text-xs capitalize text-slate-500">{event.actorRole}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs">{event.action}</td>
                    <td className="px-5 py-4 text-slate-600">{event.resourceType}{event.resourceId ? ` · ${event.resourceId.slice(0, 8)}` : ""}</td>
                    <td className="min-w-64 px-5 py-4">{event.summary}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">No administrator changes have been recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdminDashboardShell>
  );
}
