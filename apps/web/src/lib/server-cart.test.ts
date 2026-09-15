import { describe, expect, it } from "vitest";

import {
  mergeServerCartItems,
  serverCartCookieName
} from "./server-cart";

describe("scoped server cart", () => {
  const productId = "a8098c1a-f86e-41da-8b7e-2f2c40d8793a";

  it("uses separate guest and customer cookies", () => {
    expect(serverCartCookieName("guest")).toBe("talomart-cart-guest");
    expect(serverCartCookieName("customer-abc")).toBe(
      "talomart-cart-customer-abc"
    );
  });

  it("merges guest quantities into one customer cart", () => {
    expect(
      mergeServerCartItems(
        [{ productId, quantity: 2 }],
        [{ productId, quantity: 3 }]
      )
    ).toEqual([{ productId, quantity: 5 }]);
  });
});
