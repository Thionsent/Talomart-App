import { describe, expect, it } from "vitest";

import { getCheckoutErrorMessage } from "./checkout-error";

describe("checkout error messages", () => {
  it("explains an unavailable cart product", () => {
    expect(
      getCheckoutErrorMessage({
        error: "Invalid checkout details.",
        issues: [
          {
            path: ["items", 0, "productId"],
            message: "Invalid product."
          }
        ]
      })
    ).toContain("unavailable product");
  });

  it("labels invalid delivery fields", () => {
    expect(
      getCheckoutErrorMessage({
        issues: [
          {
            path: ["delivery", "phone"],
            message: "Enter a valid phone number."
          }
        ]
      })
    ).toBe("Phone number: Enter a valid phone number.");
  });

  it("uses the API error when no structured issue exists", () => {
    expect(getCheckoutErrorMessage({ error: "Payment service unavailable." })).toBe(
      "Payment service unavailable."
    );
  });
});

