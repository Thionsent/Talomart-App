"use client";

import { CheckCircle2, Copy, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { FormEvent, useMemo, useState } from "react";

import { adminAuthClient } from "@/lib/auth-client";

type EnrollmentDetails = {
  totpURI: string;
  backupCodes: string[];
};

export function AdminMfaEnrollment() {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [details, setDetails] = useState<EnrollmentDetails | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const secret = useMemo(() => {
    if (!details) return "";
    try {
      return new URL(details.totpURI).searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  }, [details]);

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await adminAuthClient.twoFactor.enable({ password });
    setPending(false);

    if (result.error || !result.data) {
      setError("Your password could not be verified. Check it and try again.");
      return;
    }
    setDetails(result.data);
    setPassword("");
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await adminAuthClient.twoFactor.verifyTotp({
      code: code.replace(/\s/g, ""),
      trustDevice: false
    });

    if (result.error) {
      setError("That code is invalid or expired. Wait for a new code and retry.");
      setPending(false);
      return;
    }
    window.location.assign("/admin?notice=Multi-factor%20authentication%20is%20active.");
  }

  async function copyRecoveryCodes() {
    if (!details) return;
    await navigator.clipboard.writeText(details.backupCodes.join("\n"));
  }

  if (!details) {
    return (
      <form onSubmit={begin} className="mt-7 grid gap-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-950">
          <strong className="block font-extrabold">Why this is required</strong>
          Passwords can be stolen or reused. A rotating authenticator code keeps
          catalogue, customer and payment operations protected.
        </div>
        <label className="auth-field">
          <span>Confirm your admin password</span>
          <span className="auth-input-shell">
            <ShieldCheck aria-hidden="true" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </span>
        </label>
        {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "Preparing…" : "Set up authenticator"}
        </button>
      </form>
    );
  }

  return (
    <div className="mt-7 grid gap-6">
      <section className="grid gap-5 rounded-2xl border border-slate-200 p-5 sm:grid-cols-[180px_1fr]">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <QRCodeSVG value={details.totpURI} size={156} level="M" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold">1. Add Talomart Admin</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Scan the QR code with Google Authenticator, Microsoft Authenticator,
            1Password or another standards-based TOTP app.
          </p>
          {secret && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-extrabold text-[var(--color-green)]">
                Enter a setup key manually
              </summary>
              <code className="mt-2 block break-all rounded-lg bg-slate-100 p-3">
                {secret}
              </code>
            </details>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">2. Save recovery codes</h2>
          <button
            type="button"
            onClick={copyRecoveryCodes}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 text-xs font-extrabold ring-1 ring-orange-200"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Store these once in an approved password manager. Each code works only once.
        </p>
        <div className="mt-4 grid gap-2 font-mono text-sm sm:grid-cols-2">
          {details.backupCodes.map((backupCode) => (
            <code key={backupCode} className="rounded-lg bg-white px-3 py-2 ring-1 ring-orange-200">
              {backupCode}
            </code>
          ))}
        </div>
      </section>

      <form onSubmit={confirm} className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <h2 className="text-lg font-extrabold">3. Verify the setup</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the current six-digit code. MFA is not active until this succeeds.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={8}
            required
            className="min-h-12 flex-1 rounded-xl border border-green-200 bg-white px-4 font-mono text-lg tracking-[0.3em]"
            aria-label="Authenticator code"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white disabled:opacity-60"
          >
            <CheckCircle2 className="h-5 w-5" />
            {pending ? "Verifying…" : "Activate MFA"}
          </button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
      </form>
    </div>
  );
}
