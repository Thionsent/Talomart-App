import { describe, expect, it } from "vitest";

import {
  createOrderEmail,
  createPasswordResetEmail,
  orderEmailDedupeKey,
  type OrderEmailModel
} from "./email";

describe("password reset email", () => {
  it("escapes customer-controlled HTML and includes the secure reset link", () => {
    const content = createPasswordResetEmail({
      name: "<script>alert('x')</script>",
      resetUrl:
        "https://shop.example.com/api/auth/reset-password/token?callbackURL=https%3A%2F%2Fshop.example.com%2Freset-password"
    });

    expect(content.html).not.toContain("<script>alert");
    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).toContain("https://shop.example.com/api/auth/reset-password");
    expect(content.text).toContain("expires in one hour");
  });

  it("rejects insecure non-local reset links", () => {
    expect(() =>
      createPasswordResetEmail({
        name: "Customer",
        resetUrl: "http://example.com/reset-password?token=secret"
      })
    ).toThrow("must use HTTPS");
  });
});

describe("order transactional email", () => {
  const order: OrderEmailModel = {
    orderNumber: "TLM-20260913-ABC12345",
    recipientName: "Amina <Customer>",
    email: "amina@example.com",
    totalMinor: 500,
    currency: "KES",
    paymentMethod: "mpesa",
    paymentStatus: "paid",
    courierName: "Talomart Rider",
    trackingNumber: "TRK-123",
    reason: null,
    items: [{ name: "Test product", quantity: 1 }]
  };

  it("renders each lifecycle email with safe customer content", () => {
    const dispatched = createOrderEmail("order_dispatched", order);
    expect(dispatched.subject).toContain(order.orderNumber);
    expect(dispatched.text).toContain("TRK-123");
    expect(dispatched.html).not.toContain("Amina <Customer>");
    expect(dispatched.html).toContain("Amina &lt;Customer&gt;");
  });

  it("uses one stable deduplication key for a logical order event", () => {
    expect(orderEmailDedupeKey("order-id", "payment_confirmed")).toBe(
      orderEmailDedupeKey("order-id", "payment_confirmed")
    );
    expect(orderEmailDedupeKey("order-id", "payment_confirmed")).not.toBe(
      orderEmailDedupeKey("order-id", "order_delivered")
    );
  });
});
