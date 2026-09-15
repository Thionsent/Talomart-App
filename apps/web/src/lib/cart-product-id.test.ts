import { describe, expect, it } from "vitest";

import {
  isDemoCartProductId,
  isSupportedCartProductId,
  isUuidCartProductId
} from "./cart-product-id";

describe("cart product identifiers", () => {
  const productUuid = "a8098c1a-f86e-41da-8b7e-2f2c40d8793a";

  it("accepts database UUIDs", () => {
    expect(isUuidCartProductId(productUuid)).toBe(true);
    expect(isSupportedCartProductId(productUuid)).toBe(true);
  });

  it("recognizes but does not accept fallback catalogue identifiers", () => {
    expect(isDemoCartProductId("demo-samsung-galaxy-a15")).toBe(true);
    expect(isSupportedCartProductId("demo-samsung-galaxy-a15")).toBe(false);
  });

  it.each([
    "",
    "product-123",
    "demo-../../admin",
    "demo-with spaces",
    `demo-${"a".repeat(124)}`,
    "a8098c1a-f86e-01da-7b7e-2f2c40d8793a"
  ])("rejects unsupported product identifier %s", (productId) => {
    expect(isSupportedCartProductId(productId)).toBe(false);
  });
});
