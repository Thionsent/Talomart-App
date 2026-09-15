"use client";

import { ArrowLeft, CheckCircle2, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (result.error) {
        setError(
          result.error.status === 429
            ? "Too many reset attempts. Please wait a minute and try again."
            : "We could not process that request. Please try again shortly."
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError("We could not reach Talomart. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--color-green)]" />
        <h1 className="font-brand mt-5 text-3xl font-extrabold text-[var(--color-navy)]">
          Check your email
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
          If a customer account exists for that address, we sent a secure reset
          link. It expires in one hour and can only be used once.
        </p>
        <Link
          href="/sign-in"
          className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-extrabold text-[var(--color-navy)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
    >
      <span className="inline-flex items-center gap-2 text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
        <ShieldCheck className="h-4 w-4" /> SECURE RECOVERY
      </span>
      <h1 className="font-brand mt-4 text-3xl font-extrabold text-[var(--color-navy)]">
        Reset your password
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Enter the email used for your customer account. For your privacy, the
        result is the same whether or not the address is registered.
      </p>

      <label className="mt-7 block text-sm font-bold text-[var(--color-navy)]">
        Email address
        <span className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-[var(--color-green)] focus-within:ring-4 focus-within:ring-emerald-50">
          <Mail className="h-5 w-5 text-slate-400" />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm font-normal outline-none"
          />
        </span>
      </label>

      {error && (
        <p
          className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting}
        className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-70"
      >
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {submitting ? "Preparing secure link..." : "Send reset link"}
      </button>

      <Link
        href="/sign-in"
        className="mt-5 flex items-center justify-center gap-2 text-sm font-extrabold text-[var(--color-green)]"
      >
        <ArrowLeft className="h-4 w-4" /> Return to sign in
      </Link>
    </form>
  );
}
