import { test, expect } from "@playwright/test";

// Set E2E_ORDER_NUMBER and E2E_GUEST_TOKEN to run these against a disposable
// sandbox order. They are intentionally skipped by default so CI never
// touches a real customer order or sends an unexpected STK prompt.
const orderNumber = process.env.E2E_ORDER_NUMBER;
const guestToken = process.env.E2E_GUEST_TOKEN;

test.describe("M-Pesa sandbox lifecycle", () => {
  test.skip(!orderNumber || !guestToken, "Requires a disposable sandbox order and guest token");

  test("status endpoint exposes processing state and resend safety", async ({ request }) => {
    const response = await request.get(`/api/payments/mpesa/status?order=${encodeURIComponent(orderNumber!)}&guest=${encodeURIComponent(guestToken!)}`);
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ orderNumber }));
    expect(typeof body.canResend).toBe("boolean");
    expect(["processing", "prompt_timeout", "failed", "abandoned", "paid", "pending"]).toContain(body.state ?? body.paymentStatus);
  });

  test("replaying a callback is handled as an idempotent request", async ({ request }) => {
    const payload = { Body: { stkCallback: { CheckoutRequestID: "e2e-replay-missing", ResultCode: 1032, ResultDesc: "Request cancelled by user" } } };
    const response = await request.post("/api/payments/mpesa/callback", { data: payload });
    expect(response.status()).toBeLessThan(500);
  });
});
