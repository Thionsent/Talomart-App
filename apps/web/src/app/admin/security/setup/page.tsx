import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { adminAuth } from "@/lib/auth";
import { AdminMfaEnrollment } from "@/components/auth/admin-mfa-enrollment";

export const metadata = { title: "Secure admin account" };

export default async function AdminSecuritySetupPage() {
  const session = await adminAuth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | {
        id: string;
        email: string;
        role?: string;
        twoFactorEnabled?: boolean;
      }
    | undefined;

  if (!session) redirect("/admin/sign-in");
  if (user?.role !== "admin" && user?.role !== "staff") redirect("/");
  if (user.twoFactorEnabled) redirect("/admin");

  return (
    <section className="bg-[var(--color-cream)] py-10 sm:py-16">
      <div className="page-shell max-w-3xl">
        <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-10">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
            REQUIRED SECURITY
          </span>
          <h1 className="font-brand mt-3 text-3xl font-extrabold sm:text-4xl">
            Protect your administrator account
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Multi-factor authentication is mandatory before this account can
            access Talomart operations.
          </p>
          <AdminMfaEnrollment />
        </div>
      </div>
    </section>
  );
}
