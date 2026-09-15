export const MPESA_PROMPT_TIMEOUT_SECONDS = 45;
export const MPESA_ABANDONMENT_SECONDS = 10 * 60;
export const MPESA_QUERY_COOLDOWN_SECONDS = 12;
export const MPESA_RESEND_COOLDOWN_SECONDS = 30;
export const MPESA_MAX_ATTEMPTS = 3;

export type MpesaCustomerState =
  | "processing"
  | "prompt_timeout"
  | "failed"
  | "confirmed"
  | "abandoned";

export type MpesaLifecycleSnapshot = {
  orderStatus: string;
  paymentStatus: string;
  attemptCount: number;
  lastInitiatedAt: string | null;
  paymentUpdatedAt: string;
  providerQueryStatus: string | null;
};

function secondsSince(value: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 1000));
}

export function mpesaAttemptAgeSeconds(
  snapshot: Pick<MpesaLifecycleSnapshot, "lastInitiatedAt" | "paymentUpdatedAt">,
  now = new Date()
) {
  return secondsSince(snapshot.lastInitiatedAt ?? snapshot.paymentUpdatedAt, now);
}

export function getMpesaCustomerState(
  snapshot: MpesaLifecycleSnapshot,
  now = new Date()
): MpesaCustomerState {
  if (
    snapshot.paymentStatus === "paid" ||
    snapshot.paymentStatus === "refunded" ||
    snapshot.orderStatus === "payment_confirmed"
  ) {
    return "confirmed";
  }

  if (snapshot.orderStatus === "cancelled") return "abandoned";

  const ageSeconds = mpesaAttemptAgeSeconds(snapshot, now);
  if (ageSeconds >= MPESA_ABANDONMENT_SECONDS) return "abandoned";

  if (
    snapshot.paymentStatus === "failed" ||
    snapshot.providerQueryStatus === "failed"
  ) {
    return "failed";
  }

  if (
    snapshot.providerQueryStatus === "not_found" &&
    ageSeconds >= MPESA_PROMPT_TIMEOUT_SECONDS
  ) {
    return "prompt_timeout";
  }

  return "processing";
}

export function getMpesaResendAvailability(
  snapshot: MpesaLifecycleSnapshot,
  environment: "sandbox" | "production",
  now = new Date()
) {
  const state = getMpesaCustomerState(snapshot, now);
  const ageSeconds = mpesaAttemptAgeSeconds(snapshot, now);
  const terminalFailure = state === "failed";
  const confirmedMissingSandboxRequest =
    environment === "sandbox" && state === "prompt_timeout";
  const eligibleState = terminalFailure || confirmedMissingSandboxRequest;
  const cooldownRemaining = Math.max(
    0,
    MPESA_RESEND_COOLDOWN_SECONDS - ageSeconds
  );

  return {
    canResend:
      snapshot.orderStatus === "pending_payment" &&
      snapshot.attemptCount < MPESA_MAX_ATTEMPTS &&
      eligibleState &&
      cooldownRemaining === 0,
    retryAfterSeconds: eligibleState ? cooldownRemaining : 0,
    attemptsRemaining: Math.max(
      0,
      MPESA_MAX_ATTEMPTS - snapshot.attemptCount
    )
  };
}

export function messageForMpesaState(state: MpesaCustomerState) {
  switch (state) {
    case "confirmed":
      return "Payment confirmed. Your order is now ready for fulfillment.";
    case "prompt_timeout":
      return "Prompt not received? We could not find the STK request after waiting. You can safely resend it.";
    case "failed":
      return "The M-Pesa request was not completed. You can resend the prompt if you still want to pay.";
    case "abandoned":
      return "This payment request expired. The order was cancelled and its reserved stock was released.";
    default:
      return "The STK Push is processing. Check your phone and enter your M-Pesa PIN when the prompt appears.";
  }
}
