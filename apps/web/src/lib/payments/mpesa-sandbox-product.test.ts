import { describe, expect, it } from "vitest";

import {
  isMpesaSandboxTestCart,
  isMpesaSandboxTestSku,
  MPESA_SANDBOX_TEST_PRODUCT_SLUG
} from "./mpesa-sandbox-product";

describe("M-Pesa sandbox test product", () => {
  it("recognizes the sandbox SKU", () => {
    expect(isMpesaSandboxTestSku("TLM-SBX-MPESA-5")).toBe(true);
    expect(isMpesaSandboxTestSku("TLM-ACC-USBC-6IN1")).toBe(false);
  });

  it("requires a non-empty cart containing only the sandbox product", () => {
    expect(isMpesaSandboxTestCart([])).toBe(false);
    expect(
      isMpesaSandboxTestCart([{ slug: MPESA_SANDBOX_TEST_PRODUCT_SLUG }])
    ).toBe(true);
    expect(
      isMpesaSandboxTestCart([
        { slug: MPESA_SANDBOX_TEST_PRODUCT_SLUG },
        { slug: "airbeats-pro-earbuds" }
      ])
    ).toBe(false);
  });
});
