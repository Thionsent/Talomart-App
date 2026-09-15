import Link from "next/link";

export const metadata = { title: "No admin permissions" };

export default function AdminNoAccessPage() {
  return (
    <section className="bg-[var(--color-cream)] py-16">
      <div className="page-shell max-w-2xl rounded-3xl bg-white p-10 text-center shadow-sm">
        <h1 className="font-brand text-3xl font-extrabold">No permissions assigned</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Your staff account is valid, but an administrator has not assigned an
          operations scope yet. Ask an administrator to review your access.
        </p>
        <Link
          href="/admin/sign-in"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
        >
          Return to sign in
        </Link>
      </div>
    </section>
  );
}
