import { isUuidCartProductId } from "./cart-product-id";

export const LEGACY_WISHLIST_KEY = "talomart-production-wishlist";
export const WISHLIST_GUEST_KEY = "talomart-production-wishlist:guest";
export const WISHLIST_EVENT = "talomart:wishlist-change";
export const MAX_WISHLIST_ITEMS = 100;

export function wishlistStorageKey(scope = "guest") {
  return scope === "guest"
    ? WISHLIST_GUEST_KEY
    : `talomart-production-wishlist:${scope}`;
}

export function normalizeWishlistIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(isUuidCartProductId)
    )
  ].slice(0, MAX_WISHLIST_ITEMS);
}

export function readWishlistIds(scope = "guest"): string[] {
  if (typeof window === "undefined") return [];

  try {
    const storageKey = wishlistStorageKey(scope);
    const scopedValue = window.localStorage.getItem(storageKey);
    const legacyValue =
      scope === "guest"
        ? window.localStorage.getItem(LEGACY_WISHLIST_KEY)
        : null;
    const stored = scopedValue ?? legacyValue ?? "[]";
    const normalized = normalizeWishlistIds(JSON.parse(stored));
    const serialized = JSON.stringify(normalized);

    if (scopedValue !== serialized) {
      window.localStorage.setItem(storageKey, serialized);
    }
    if (scope === "guest" && legacyValue !== null) {
      window.localStorage.removeItem(LEGACY_WISHLIST_KEY);
    }

    return normalized;
  } catch {
    return [];
  }
}

export function writeWishlistIds(productIds: Iterable<string>, scope = "guest") {
  if (typeof window === "undefined") return [];

  const normalized = normalizeWishlistIds([...productIds]);
  window.localStorage.setItem(
    wishlistStorageKey(scope),
    JSON.stringify(normalized)
  );
  window.dispatchEvent(
    new CustomEvent(WISHLIST_EVENT, {
      detail: { scope, productIds: normalized }
    })
  );

  return normalized;
}

export function clearGuestWishlistIds() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(WISHLIST_GUEST_KEY);
  window.localStorage.removeItem(LEGACY_WISHLIST_KEY);
}

export function toggleWishlistId(productIds: Iterable<string>, productId: string) {
  const next = new Set(normalizeWishlistIds([...productIds]));

  if (next.has(productId)) next.delete(productId);
  else next.add(productId);

  return normalizeWishlistIds([...next]);
}
