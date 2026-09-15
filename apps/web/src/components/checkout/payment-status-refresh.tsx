"use client";

import { RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { MpesaCustomerState } from "@/lib/payments/mpesa-lifecycle";

type PaymentStatus = {
  state: MpesaCustomerState;
  message: string;
  canResend: boolean;
  retryAfterSeconds: number;
  attemptsRemaining: number;
  attemptCount: number;
};

export function PaymentStatusRefresh({
  orderNumber,
  initialStatus
}: {
  orderNumber: string;
  initialStatus: PaymentStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/payments/mpesa/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not check payment.");

      setStatus(payload as PaymentStatus);
      setError("");
      if (payload.state === "confirmed" || payload.state === "abandoned") {
        router.refresh();
      }
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "We could not refresh the payment status."
      );
    } finally {
      setChecking(false);
    }
  }, [orderNumber, router]);

  useEffect(() => {
    if (status.state === "confirmed" || status.state === "abandoned") return;

    const initial = window.setTimeout(() => void checkStatus(), 1_500);
    const interval = window.setInterval(() => void checkStatus(), 5_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [checkStatus, status.state]);

  async function resend() {
    setResending(true);
    setError("");
    try {
      const response = await fetch("/api/payments/mpesa/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not resend prompt.");

      setStatus((current) => ({
        ...current,
        ...payload,
        state: "processing",
        canResend: false
      }));
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "We could not resend the STK Push."
      );
      await checkStatus();
    } finally {
      setResending(false);
    }
  }

  const attention =
    status.state === "prompt_timeout" || status.state === "failed";
  const terminal =
    status.state === "confirmed" || status.state === "abandoned";
  const tone =
    status.state === "confirmed"
      ? "bg-emerald-50 text-emerald-950 ring-emerald-200"
      : status.state === "abandoned"
        ? "bg-slate-100 text-slate-900 ring-slate-200"
        : attention
          ? "bg-orange-50 text-orange-950 ring-orange-200"
          : "bg-blue-50 text-blue-950 ring-blue-200";

  return (
    <div className={`mt-5 rounded-2xl p-4 ring-1 ${tone}`} role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <strong className="block text-sm">
            {status.state === "prompt_timeout"
              ? "Prompt not received?"
              : status.state === "failed"
                ? "Payment not completed"
                : status.state === "confirmed"
                  ? "Payment confirmed"
                  : status.state === "abandoned"
                    ? "Payment request expired"
                    : "Waiting for M-Pesa"}
          </strong>
          <p className="mt-1 text-sm leading-6 opacity-85">{status.message}</p>
          {!terminal && (
            <p className="mt-2 text-xs font-semibold opacity-70">
              Attempt {status.attemptCount} of 3
            </p>
          )}
        </div>
        {checking && !terminal && (
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-label="Checking payment status" />
        )}
      </div>

      {error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}

      {attention && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {status.canResend ? (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resending || checking}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {resending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {resending ? "Sending…" : "Resend STK Push"}
            </button>
          ) : (
            <span className="text-xs font-semibold opacity-75">
              {status.attemptsRemaining === 0
                ? "The safe resend limit has been reached."
                : status.retryAfterSeconds > 0
                  ? `Resend available in ${status.retryAfterSeconds} seconds.`
                  : "We are verifying the previous request before allowing a resend."}
            </span>
          )}
          <button
            type="button"
            onClick={() => void checkStatus()}
            disabled={checking || resending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-current/20 px-4 text-sm font-extrabold disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Check status
          </button>
        </div>
      )}
    </div>
  );
}
