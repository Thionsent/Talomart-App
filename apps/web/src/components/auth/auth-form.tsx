import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import {
  adminSignIn,
  customerSignIn,
  customerSignUp
} from "@/app/auth-actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";

type AuthMode = "sign-in" | "sign-up";
type AuthAudience = "customer" | "admin";

const errorMessages: Record<string, string> = {
  "account-exists": "An account already exists for that email. Please sign in.",
  "check-details": "Please check your details and try again.",
  "invalid-credentials": "Those login details did not work. Please try again.",
  "staff-account":
    "This is a staff account. Use the separate Talomart admin sign-in portal.",
  "staff-only":
    "That account is a customer account. Use a staff/admin account for the admin portal."
};

export function AuthForm({
  mode,
  audience = "customer",
  error
}: {
  mode: AuthMode;
  audience?: AuthAudience;
  error?: string | undefined;
}) {
  const isSignUp = mode === "sign-up";
  const isAdmin = audience === "admin";
  const action = isAdmin
    ? adminSignIn
    : isSignUp
      ? customerSignUp
      : customerSignIn;

  return (
    <form
      action={action}
      method="post"
      className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm"
    >
      <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
        {isAdmin ? "STAFF ACCESS" : isSignUp ? "CREATE ACCOUNT" : "WELCOME BACK"}
      </span>
      <h1 className="font-brand mt-3 text-3xl font-extrabold">
        {isAdmin
          ? "Admin sign in"
          : isSignUp
            ? "Join Talomart Stores"
            : "Sign in to Talomart"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        {isAdmin
          ? "This portal is only for approved Talomart staff and administrators."
          : isSignUp
            ? "Create a customer account to track orders, save addresses and checkout faster."
            : "Access your customer order history, saved details and Talomart account."}
      </p>

      {isAdmin && (
        <div className="mt-5 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-green)]" />
          <p>
            Staff accounts are created or promoted internally. Customers should
            use the normal Talomart sign-in page.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {isSignUp && !isAdmin && (
          <>
            <label className="block text-sm font-bold">
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-[var(--color-green)]"
              />
            </label>
            <label className="block text-sm font-bold">
              Phone number
              <input
                name="phone"
                autoComplete="tel"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-[var(--color-green)]"
              />
            </label>
          </>
        )}
        <label className="block text-sm font-bold">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-[var(--color-green)]"
          />
        </label>
        <label className="block text-sm font-bold">
          Password
          <input
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={8}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-4 font-normal outline-none focus:border-[var(--color-green)]"
          />
        </label>
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600"
          role="alert"
          aria-live="polite"
        >
          {errorMessages[error] ?? "Authentication failed. Please try again."}
        </p>
      )}

      <AuthSubmitButton
        label={
          isAdmin ? "Sign in to admin" : isSignUp ? "Create account" : "Sign in"
        }
        pendingLabel={
          isAdmin ? "Opening admin…" : isSignUp ? "Creating account…" : "Signing in…"
        }
      />

      {!isAdmin && (
        <p className="mt-5 text-center text-sm text-slate-500">
          {isSignUp ? "Already have an account?" : "New to Talomart?"}{" "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-extrabold text-[var(--color-green)]"
          >
            {isSignUp ? "Sign in" : "Create account"}
          </Link>
        </p>
      )}

      {isAdmin && (
        <p className="mt-5 text-center text-sm text-slate-500">
          Customer account?{" "}
          <Link href="/sign-in" className="font-extrabold text-[var(--color-green)]">
            Go to customer sign in
          </Link>
        </p>
      )}
    </form>
  );
}
