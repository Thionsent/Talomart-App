"use client";

import { Check, Eye, EyeOff, KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  isAcceptableResetPassword,
  passwordResetChecks,
  passwordResetMaximumLength,
  passwordResetMinimumLength
} from "@/lib/password-reset";

export function ResetPasswordForm({
  token,
  invalidToken = false
}: {
  token: string;
  invalidToken?: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = useMemo(() => passwordResetChecks(password), [password]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || invalidToken || !token) return;

    if (!isAcceptableResetPassword(password)) {
      setError("Use at least eight characters with at least one letter and one number.");
      return;
    }

    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token
      });

      if (result.error) {
        setError(
          result.error.code === "INVALID_TOKEN"
            ? "This reset link is invalid, expired or has already been used."
            : "We could not update your password. Please request a new reset link."
        );
        return;
      }

      router.replace("/sign-in?notice=password-reset");
    } catch {
      setError("We could not reach Talomart. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (invalidToken || !token) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <ShieldAlert className="mx-auto h-12 w-12 text-[var(--color-orange)]" />
        <h1 className="font-brand mt-5 text-3xl font-extrabold text-[var(--color-navy)]">
          Reset link unavailable
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          This link is invalid, expired or has already been used. Request a new
          one to continue securely.
        </p>
        <Link
          href="/forgot-password"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
        >
          Request another link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
    >
      <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
        SECURE PASSWORD UPDATE
      </span>
      <h1 className="font-brand mt-4 text-3xl font-extrabold text-[var(--color-navy)]">
        Choose a new password
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Completing this reset signs out existing customer sessions to protect
        your account.
      </p>

      <div className="mt-7 grid gap-5">
        <label className="text-sm font-bold text-[var(--color-navy)]">
          New password
          <span className="mt-2 flex min-h-12 items-center rounded-xl border border-slate-200 px-4 focus-within:border-[var(--color-green)] focus-within:ring-4 focus-within:ring-emerald-50">
            <KeyRound className="mr-3 h-5 w-5 text-slate-400" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={passwordResetMinimumLength}
              maxLength={passwordResetMaximumLength}
              required
              className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm font-normal outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-[var(--color-green)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <label className="text-sm font-bold text-[var(--color-navy)]">
          Confirm new password
          <span className="mt-2 flex min-h-12 items-center rounded-xl border border-slate-200 px-4 focus-within:border-[var(--color-green)] focus-within:ring-4 focus-within:ring-emerald-50">
            <KeyRound className="mr-3 h-5 w-5 text-slate-400" />
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={passwordResetMinimumLength}
              maxLength={passwordResetMaximumLength}
              required
              className="h-11 min-w-0 flex-1 border-0 bg-transparent text-sm font-normal outline-none"
            />
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Password requirements">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
              check.passed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Check className="h-3 w-3" /> {check.label}
          </span>
        ))}
      </div>

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
        {submitting ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}
