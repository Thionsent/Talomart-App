import { sql } from "@talomart/db";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateStaffPermissions } from "./actions";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import {
  getAdminPrincipal,
  staffPermissionValues,
  type StaffPermission
} from "@/lib/admin-authorization";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin security" };

const permissionLabels: Record<StaffPermission, string> = {
  "catalog.manage": "Manage products and categories",
  "inventory.manage": "Adjust inventory",
  "orders.manage": "Manage orders, payment state and fulfilment",
  "customers.read": "View customer records",
  "analytics.read": "View sales analytics",
  "staff.manage": "Assign staff permissions",
  "audit.read": "Read administrator audit records"
};

type SecurityPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSecurityPage({ searchParams }: SecurityPageProps) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/sign-in");
  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) {
    redirect("/admin/security/setup");
  }
  if (!principal.can("staff.manage")) redirect("/admin/no-access");

  const params = (await searchParams) ?? {};
  const notice = typeof params.notice === "string" ? params.notice : "";
  const error = typeof params.error === "string" ? params.error : "";
  const staff = await sql<
    {
      id: string;
      name: string;
      email: string;
      twoFactorEnabled: boolean;
      permissions: StaffPermission[];
    }[]
  >`
    select
      u.id,
      u.name,
      u.email,
      u.two_factor_enabled as "twoFactorEnabled",
      coalesce(
        array_agg(sp.permission order by sp.permission)
          filter (where sp.permission is not null),
        array[]::staff_permission[]
      ) as permissions
    from "user" u
    left join staff_permissions sp on sp.user_id = u.id
    where u.role = 'staff'
    group by u.id
    order by u.name, u.email
  `;

  return (
    <AdminDashboardShell
      principal={principal}
      active="security"
      focus={{
        primary: `${staff.length} staff account${staff.length === 1 ? "" : "s"}`,
        secondary: "Review access and MFA before every release."
      }}
    >
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
              LEAST PRIVILEGE
            </span>
            <h1 className="font-brand mt-2 text-4xl font-extrabold">Staff security</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Give each staff member only the operations access their job requires.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/audit" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold">
              View audit log
            </Link>
          </div>
        </div>

        {notice && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-800">
            <CheckCircle2 className="h-5 w-5" /> {notice}
          </div>
        )}
        {error && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert">
            <XCircle className="h-5 w-5" /> {error}
          </div>
        )}

        <div className="mt-7 grid gap-5">
          {staff.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-10 w-10 text-[var(--color-green)]" />
              <h2 className="mt-4 text-xl font-extrabold">No staff accounts yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Promote a verified employee account with the admin CLI, then assign its permissions here.
              </p>
            </div>
          )}
          {staff.map((member) => (
            <form key={member.id} action={updateStaffPermissions} className="rounded-3xl bg-white p-6 shadow-sm">
              <input type="hidden" name="userId" value={member.id} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">{member.name}</h2>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${member.twoFactorEnabled ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                  {member.twoFactorEnabled ? "MFA active" : "MFA setup required"}
                </span>
              </div>
              <fieldset className="mt-5 grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Permissions for {member.name}</legend>
                {staffPermissionValues.map((permission) => (
                  <label key={permission} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission}
                      defaultChecked={member.permissions.includes(permission)}
                      className="mt-1 h-4 w-4 accent-[var(--color-green)]"
                    />
                    <span>{permissionLabels[permission]}</span>
                  </label>
                ))}
              </fieldset>
              <button type="submit" className="mt-5 min-h-11 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white">
                Save permissions
              </button>
            </form>
          ))}
        </div>
      </section>
    </AdminDashboardShell>
  );
}
