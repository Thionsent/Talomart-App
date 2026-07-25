import { describe, expect, it } from "vitest";

import {
  MAX_WISHLIST_ITEMS,
  normalizeWishlistIds,
  toggleWishlistId
} from "./wishlist-storage";

describe("wishlist storage", () => {
  it("normalizes, deduplicates and removes empty product ids", () => {
    expect(normalizeWishlistIds([" product-1 ", "", "product-1", null])).toEqual([
      "product-1"
    ]);
  });

  it("toggles a product without mutating the current collection", () => {
    const current = ["product-1"];
    expect(toggleWishlistId(current, "product-2")).toEqual([
      "product-1",
      "product-2"
    ]);
    expect(toggleWishlistId(current, "product-1")).toEqual([]);
    expect(current).toEqual(["product-1"]);
  });

  it("caps unusually large wishlists", () => {
    const ids = Array.from(
      { length: MAX_WISHLIST_ITEMS + 10 },
      (_, index) => `product-${index}`
    );
    expect(normalizeWishlistIds(ids)).toHaveLength(MAX_WISHLIST_ITEMS);
  });
});
