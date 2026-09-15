import { describe, expect, it, vi } from "vitest";

import {
  getMpesaFallbackMatch,
  hasUnambiguousMpesaCandidate,
  mpesaCallbackMetadataValue,
  retryMpesaPersistence,
  type MpesaStkCallback
} from "./mpesa-reconciliation";

const successfulCallback: MpesaStkCallback = {
  MerchantRequestID: "merchant-test",
  CheckoutRequestID: "checkout-test",
  ResultCode: 0,
  ResultDesc: "Processed successfully",
  CallbackMetadata: {
    Item: [
      { Name: "Amount", Value: 5 },
      { Name: "MpesaReceiptNumber", Value: "TEST123" },
      { Name: "PhoneNumber", Value: 254712345678 }
    ]
  }
};

describe("M-Pesa callback reconciliation", () => {
  it("extracts callback metadata and a safe fallback match", () => {
    expect(
      mpesaCallbackMetadataValue(successfulCallback, "MpesaReceiptNumber")
    ).toBe("TEST123");
    expect(getMpesaFallbackMatch(successfulCallback)).toEqual({
      amountMinor: 500,
      phoneSuffix: "712345678"
    });
  });

  it("does not fallback-match a failed callback", () => {
    expect(
      getMpesaFallbackMatch({ ...successfulCallback, ResultCode: 1032 })
    ).toBeNull();
  });

  it("only accepts one unambiguous fallback candidate", () => {
    expect(hasUnambiguousMpesaCandidate([{ id: "one" }])).toEqual({ id: "one" });
    expect(hasUnambiguousMpesaCandidate([])).toBeNull();
    expect(hasUnambiguousMpesaCandidate([{ id: "one" }, { id: "two" }])).toBeNull();
  });

  it("retries a transient persistence failure", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue("saved");
    const delay = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await expect(
      retryMpesaPersistence(operation, { delay })
    ).resolves.toBe("saved");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(100);
  });
});
