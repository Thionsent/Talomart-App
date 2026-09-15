"use client";

import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

import { adminAuthClient } from "@/lib/auth-client";

export function AdminTwoFactorChallenge() {
  const [code, setCode] = useState("");
  const [backupMode, setBackupMode] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const result = backupMode
      ? await adminAuthClient.twoFactor.verifyBackupCode({ code })
      : await adminAuthClient.twoFactor.verifyTotp({
          code: code.replace(/\s/g, ""),
          trustDevice: false
        });

    if (result.error) {
      setError(
        result.error.status === 429
          ? "Too many attempts. This account is temporarily locked."
          : "That verification code is invalid or expired."
      );
      setPending(false);
      return;
    }

    window.location.assign("/admin");
  }

  return (
    <form
      onSubmit={verify}
      className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-sm sm:p-8"
    >
      <ShieldCheck className="h-10 w-10 text-[var(--color-green)]" />
      <span className="mt-5 block text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">
        SECOND FACTOR
      </span>
      <h1 className="font-brand mt-3 text-3xl font-extrabold">
        Verify it is you
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        {backupMode
          ? "Enter one unused recovery code. It will be invalidated after use."
          : "Enter the six-digit code from your authenticator app."}
      </p>

      <label className="auth-field mt-6">
        <span>{backupMode ? "Recovery code" : "Authenticator code"}</span>
        <span className="auth-input-shell">
          <ShieldCheck aria-hidden="true" />
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode={backupMode ? "text" : "numeric"}
            autoComplete="one-time-code"
            minLength={backupMode ? 4 : 6}
            maxLength={backupMode ? 64 : 8}
            required
            autoFocus
          />
        </span>
      </label>

      {error && (
        <div
          className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 min-h-12 w-full rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {pending ? "Verifying…" : "Verify and open admin"}
      </button>
      <button
        type="button"
        onClick={() => {
          setBackupMode((current) => !current);
          setCode("");
          setError("");
        }}
        className="mt-4 min-h-11 w-full text-sm font-extrabold text-[var(--color-green)]"
      >
        {backupMode ? "Use authenticator code" : "Use a recovery code"}
      </button>
    </form>
  );
}
