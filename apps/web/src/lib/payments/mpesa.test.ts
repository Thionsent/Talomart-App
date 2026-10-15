import { describe, expect, it } from "vitest";

import {
  buildStkPushRequest,
  classifyMpesaStkQueryResponse,
  formatDarajaTimestamp,
  getMpesaConfigurationStatus,
  normalizeMpesaPhone
} from "./mpesa";

const completeSandboxConfiguration = {
  MPESA_ENVIRONMENT: "sandbox" as const,
  MPESA_TRANSACTION_TYPE: "CustomerPayBillOnline" as const,
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

  it("accepts a production Till with the neutral callback route", () => {
    expect(getMpesaConfigurationStatus({
      ...completeSandboxConfiguration,
      MPESA_ENVIRONMENT: "production",
      MPESA_LIVE_ENABLED: true,
      MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline",
      MPESA_CALLBACK_URL: "https://shop.example.com/api/payments/notify"
    }).configured).toBe(true);
  });

  it("rejects the legacy callback path in production", () => {
    const status = getMpesaConfigurationStatus({
      ...completeSandboxConfiguration,
      MPESA_ENVIRONMENT: "production",
      MPESA_LIVE_ENABLED: true,
      MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline"
    });
    expect(status.configured).toBe(false);
    expect(status.reason).toContain("/api/payments/notify");
  });

  it("rejects PayBill requests for Talomart's production Till", () => {
    const status = getMpesaConfigurationStatus({
      ...completeSandboxConfiguration,
      MPESA_ENVIRONMENT: "production",
      MPESA_LIVE_ENABLED: true,
      MPESA_CALLBACK_URL: "https://shop.example.com/api/payments/notify"
    });
    expect(status.configured).toBe(false);
    expect(status.reason).toContain("Buy Goods");
  });

  it("rejects a callback to a different host than the live app", () => {
    const status = getMpesaConfigurationStatus({
      ...completeSandboxConfiguration,
      NEXT_PUBLIC_APP_URL: "https://shop.example.com",
      MPESA_ENVIRONMENT: "production",
      MPESA_LIVE_ENABLED: true,
      MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline",
      MPESA_CALLBACK_URL: "https://other.example.com/api/payments/notify"
    });
    expect(status.configured).toBe(false);
    expect(status.reason).toContain("public origin");
  });

  it("keeps live STK requests disabled by default even with credentials present", () => {
    const configuration = {
      ...completeSandboxConfiguration,
      MPESA_ENVIRONMENT: "production",
      MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline",
      MPESA_CALLBACK_URL: "https://shop.example.com/api/payments/notify"
    } as const;
    const status = getMpesaConfigurationStatus(configuration);
    expect(status.configured).toBe(false);
    expect(status.reason).toContain("disabled");
    expect(getMpesaConfigurationStatus(configuration, { allowDisabledLive: true }).configured).toBe(true);
  });
});

describe("Daraja timestamp", () => {
  it("formats UTC time using the Nairobi business clock", () => {
    expect(formatDarajaTimestamp(new Date("2026-10-14T21:05:07.000Z"))).toBe("20261015000507");
  });
});

describe("live Till STK request", () => {
  it("sends Buy Goods to the approved Till and neutral callback", () => {
    const payload = buildStkPushRequest(
      { phone: "0712 345 678", amountKes: 250, orderNumber: "TLM-1001" },
      {
        ...completeSandboxConfiguration,
        MPESA_ENVIRONMENT: "production",
        MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline",
        MPESA_SHORTCODE: "123456",
        MPESA_CALLBACK_URL: "https://shop.example.com/api/payments/notify"
      },
      "20261014120000"
    );
    expect(payload).toMatchObject({
      TransactionType: "CustomerBuyGoodsOnline",
      BusinessShortCode: "123456",
      PartyB: "123456",
      PartyA: "254712345678",
      PhoneNumber: "254712345678",
      Amount: 250,
      CallBackURL: "https://shop.example.com/api/payments/notify"
    });
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

  it("does not trust a successful-looking result in a failed HTTP response", () => {
    expect(classifyMpesaStkQueryResponse(500, { ResultCode: 0 }).status).toBe("unavailable");
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
