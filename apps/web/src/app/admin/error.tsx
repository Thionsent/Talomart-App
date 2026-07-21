"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="bg-[var(--color-cream)] py-16">
      <div className="page-shell max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
        <span className="text-xs font-extrabold tracking-[0.25em] text-red-500">
          ADMIN SAFETY NET
        </span>
        <h1 className="font-brand mt-3 text-3xl font-extrabold text-[var(--color-navy)]">
          Something interrupted the admin console
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
          The operation did not complete cleanly. Please retry, and if it keeps
          happening, check the form values or database connection.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
            Error reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
          >
            Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-6 text-sm font-extrabold text-[var(--color-navy)]"
          >
            Back to overview
          </Link>
        </div>
      </div>
    </section>
  );
}
