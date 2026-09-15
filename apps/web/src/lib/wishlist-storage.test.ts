import { describe, expect, it } from "vitest";

import {
  MAX_WISHLIST_ITEMS,
  normalizeWishlistIds,
  toggleWishlistId,
  wishlistStorageKey
} from "./wishlist-storage";

describe("wishlist storage", () => {
  const productOne = "a8098c1a-f86e-41da-8b7e-2f2c40d8793a";
  const productTwo = "b8098c1a-f86e-41da-8b7e-2f2c40d8793b";

  it("normalizes, deduplicates and removes non-database product ids", () => {
    expect(
      normalizeWishlistIds([
        ` ${productOne} `,
        "",
        productOne,
        "demo-samsung-galaxy-a15",
        null
      ])
    ).toEqual([productOne]);
  });

  it("toggles a product without mutating the current collection", () => {
    const current = [productOne];
    expect(toggleWishlistId(current, productTwo)).toEqual([
      productOne,
      productTwo
    ]);
    expect(toggleWishlistId(current, productOne)).toEqual([]);
    expect(current).toEqual([productOne]);
  });

  it("caps unusually large wishlists", () => {
    const ids = Array.from(
      { length: MAX_WISHLIST_ITEMS + 10 },
      (_, index) =>
        `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
    );
    expect(normalizeWishlistIds(ids)).toHaveLength(MAX_WISHLIST_ITEMS);
  });

  it("uses separate guest and customer storage keys", () => {
    expect(wishlistStorageKey()).toBe("talomart-production-wishlist:guest");
    expect(wishlistStorageKey("customer-abc")).toBe(
      "talomart-production-wishlist:customer-abc"
    );
  });
});
