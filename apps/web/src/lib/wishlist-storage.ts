export const WISHLIST_KEY = "talomart-production-wishlist";
export const WISHLIST_EVENT = "talomart:wishlist-change";
export const MAX_WISHLIST_ITEMS = 100;

export function normalizeWishlistIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  ].slice(0, MAX_WISHLIST_ITEMS);
}

export function readWishlistIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    return normalizeWishlistIds(
      JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]")
    );
  } catch {
    return [];
  }
}

export function writeWishlistIds(productIds: Iterable<string>) {
  if (typeof window === "undefined") return [];

  const normalized = normalizeWishlistIds([...productIds]);
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent(WISHLIST_EVENT, { detail: normalized })
  );

  return normalized;
}

export function toggleWishlistId(productIds: Iterable<string>, productId: string) {
  const next = new Set(normalizeWishlistIds([...productIds]));

  if (next.has(productId)) next.delete(productId);
  else next.add(productId);

  return normalizeWishlistIds([...next]);
}
