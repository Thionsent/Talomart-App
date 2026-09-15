import { describe, expect, it } from "vitest";

import {
  getMpesaCustomerState,
  getMpesaResendAvailability,
  MPESA_MAX_ATTEMPTS,
  type MpesaLifecycleSnapshot
} from "./mpesa-lifecycle";

const now = new Date("2026-08-20T12:10:00.000Z");

function snapshot(
  overrides: Partial<MpesaLifecycleSnapshot> = {}
): MpesaLifecycleSnapshot {
  return {
    orderStatus: "pending_payment",
    paymentStatus: "processing",
    attemptCount: 1,
    lastInitiatedAt: "2026-08-20T12:09:30.000Z",
    paymentUpdatedAt: "2026-08-20T12:09:30.000Z",
    providerQueryStatus: null,
    ...overrides
  };
}

describe("M-Pesa customer lifecycle", () => {
  it("keeps a recent attempt in processing", () => {
    expect(getMpesaCustomerState(snapshot(), now)).toBe("processing");
  });

  it("shows prompt timeout when sandbox cannot find an older request", () => {
    const missing = snapshot({
      lastInitiatedAt: "2026-08-20T12:09:00.000Z",
      providerQueryStatus: "not_found"
    });

    expect(getMpesaCustomerState(missing, now)).toBe("prompt_timeout");
    expect(getMpesaResendAvailability(missing, "sandbox", now).canResend).toBe(
      true
    );
    expect(
      getMpesaResendAvailability(missing, "production", now).canResend
    ).toBe(false);
  });

  it("does not offer resend while Daraja still reports processing", () => {
    const active = snapshot({
      lastInitiatedAt: "2026-08-20T12:08:00.000Z",
      providerQueryStatus: "processing"
    });

    expect(getMpesaCustomerState(active, now)).toBe("processing");
    expect(getMpesaResendAvailability(active, "sandbox", now).canResend).toBe(
      false
    );
  });

  it("offers resend after a terminal failure", () => {
    const failed = snapshot({
      paymentStatus: "failed",
      lastInitiatedAt: "2026-08-20T12:09:00.000Z"
    });

    expect(getMpesaCustomerState(failed, now)).toBe("failed");
    expect(getMpesaResendAvailability(failed, "production", now).canResend).toBe(
      true
    );
  });

  it("stops resends at the maximum attempt count", () => {
    const failed = snapshot({
      paymentStatus: "failed",
      attemptCount: MPESA_MAX_ATTEMPTS,
      lastInitiatedAt: "2026-08-20T12:09:00.000Z"
    });

    expect(getMpesaResendAvailability(failed, "sandbox", now).canResend).toBe(
      false
    );
  });

  it("marks a ten-minute pending request abandoned", () => {
    expect(
      getMpesaCustomerState(
        snapshot({ lastInitiatedAt: "2026-08-20T12:00:00.000Z" }),
        now
      )
    ).toBe("abandoned");
  });
});
