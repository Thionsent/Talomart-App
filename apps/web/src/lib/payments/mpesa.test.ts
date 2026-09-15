import { describe, expect, it } from "vitest";

import {
  classifyMpesaStkQueryResponse,
  getMpesaConfigurationStatus,
  normalizeMpesaPhone
} from "./mpesa";

const completeSandboxConfiguration = {
  MPESA_ENVIRONMENT: "sandbox" as const,
  MPESA_CONSUMER_KEY: "sandbox-consumer-key",
  MPESA_CONSUMER_SECRET: "sandbox-consumer-secret",
  MPESA_SHORTCODE: "sandbox-shortcode",
  MPESA_PASSKEY: "sandbox-passkey",
  MPESA_CALLBACK_URL: "https://sandbox.example.com/api/payments/mpesa/callback"
};

describe("M-Pesa configuration", () => {
  it("accepts a complete sandbox configuration with a public HTTPS callback", () => {
    expect(getMpesaConfigurationStatus(completeSandboxConfiguration)).toEqual({
      environment: "sandbox",
      configured: true,
      reason: null
    });
  });

  it("rejects a localhost callback", () => {
    const result = getMpesaConfigurationStatus({
      ...completeSandboxConfiguration,
      MPESA_CALLBACK_URL: "http://localhost:3000/api/payments/mpesa/callback"
    });

    expect(result.configured).toBe(false);
    expect(result.reason).toContain("public HTTPS");
  });

  it("reports missing credentials", () => {
    const result = getMpesaConfigurationStatus({
      ...completeSandboxConfiguration,
      MPESA_CONSUMER_KEY: "",
      MPESA_PASSKEY: ""
    });

    expect(result.configured).toBe(false);
    expect(result.reason).toContain("consumer key");
    expect(result.reason).toContain("passkey");
  });
});

describe("M-Pesa STK query classification", () => {
  it("recognizes a confirmed payment", () => {
    expect(
      classifyMpesaStkQueryResponse(200, {
        ResponseCode: "0",
        ResultCode: "0",
        ResultDesc: "The service request is processed successfully."
      }).status
    ).toBe("paid");
  });

  it("recognizes terminal customer cancellation", () => {
    const result = classifyMpesaStkQueryResponse(200, {
      ResponseCode: "0",
      ResultCode: "1032",
      ResultDesc: "Request cancelled by user"
    });

    expect(result.status).toBe("failed");
    expect(result.resultCode).toBe(1032);
  });

  it("recognizes a phantom sandbox acceptance", () => {
    expect(
      classifyMpesaStkQueryResponse(500, {
        errorCode: "500.001.1001",
        errorMessage: "The transaction does not Exist"
      }).status
    ).toBe("not_found");
  });

  it("keeps an in-flight transaction processing", () => {
    expect(
      classifyMpesaStkQueryResponse(500, {
        errorMessage: "The transaction is being processed"
      }).status
    ).toBe("processing");
  });
});

describe("M-Pesa phone normalization", () => {
  it.each([
    ["0712 345 678", "254712345678"],
    ["+254 712 345 678", "254712345678"],
    ["712345678", "254712345678"],
    ["0112 345 678", "254112345678"]
  ])("normalizes %s", (input, expected) => {
    expect(normalizeMpesaPhone(input)).toBe(expected);
  });

  it("rejects a non-Kenyan mobile number", () => {
    expect(() => normalizeMpesaPhone("12345")).toThrow(
      "Enter a valid Kenyan M-Pesa phone number."
    );
  });
});
