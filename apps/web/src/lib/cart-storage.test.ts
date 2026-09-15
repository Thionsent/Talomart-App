import { describe, expect, it } from "vitest";

import type { StoreProduct } from "./catalog";
import {
  cartStorageKey,
  mergeLocalCarts,
  normalizeLocalCart
} from "./cart-storage";

const liveProduct: StoreProduct = {
  id: "a8098c1a-f86e-41da-8b7e-2f2c40d8793a",
  slug: "live-product",
  category: "Audio",
  name: "Live product",
  price: 1000,
  oldPrice: 1200,
  discount: 17,
  rating: 4.8,
  reviews: 0,
  stock: 5,
  image: "https://example.com/product.jpg"
};

describe("local cart normalization", () => {
  it("keeps live products and removes preview products", () => {
    expect(
      normalizeLocalCart([
        { product: liveProduct, quantity: 2 },
        {
          product: {
            ...liveProduct,
            id: "demo-airbeats-pro-earbuds",
            name: "Preview product"
          },
          quantity: 1
        }
      ])
    ).toEqual([{ product: liveProduct, quantity: 2 }]);
  });

  it("rejects malformed cart entries and caps quantities", () => {
    expect(
      normalizeLocalCart([
        null,
        { product: liveProduct, quantity: 500 },
        { product: liveProduct, quantity: 0 }
      ])
    ).toEqual([{ product: liveProduct, quantity: 99 }]);
  });

  it("uses separate guest and customer storage keys", () => {
    expect(cartStorageKey("guest")).toBe("talomart-production-cart:guest");
    expect(cartStorageKey("customer-abc")).toBe(
      "talomart-production-cart:customer-abc"
    );
  });

  it("merges a guest cart once while respecting available stock", () => {
    expect(
      mergeLocalCarts(
        [{ product: liveProduct, quantity: 2 }],
        [{ product: liveProduct, quantity: 4 }]
      )
    ).toEqual([{ product: liveProduct, quantity: 5 }]);
  });
});
