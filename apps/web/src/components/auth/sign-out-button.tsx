"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useActionState } from "react";

import {
  adminSignOut,
  customerSignOut,
  type SignOutState
} from "@/app/auth-actions";

const initialState: SignOutState = {};

export function SignOutButton({
  audience = "customer",
  variant = "default"
}: {
  audience?: "customer" | "admin";
  variant?: "default" | "menu" | "admin";
}) {
  const action = audience === "admin" ? adminSignOut : customerSignOut;
  const [state, formAction, pending] = useActionState(action, initialState);

  const className =
    variant === "menu"
      ? "account-signout-button"
      : variant === "admin"
        ? "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-extrabold text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-70"
        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-[var(--color-navy)] hover:border-red-200 hover:text-red-600 disabled:cursor-wait disabled:opacity-70";

  return (
    <form action={formAction} className="signout-form">
      <button
        type="submit"
        className={className}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state.error && (
        <p className="signout-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      )}
    </form>
  );
}
