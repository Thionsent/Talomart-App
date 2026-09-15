import type { StoreProduct } from "./catalog";
import { isUuidCartProductId } from "./cart-product-id";

export interface LocalCartItem {
  product: StoreProduct;
  quantity: number;
}

export const LEGACY_CART_KEY = "talomart-production-cart";
export const CART_GUEST_KEY = "talomart-production-cart:guest";
export const CART_KEY = LEGACY_CART_KEY;

let serverCartSyncQueue: Promise<void> = Promise.resolve();

export type CartMutationIntent = "add" | "set" | "remove";

export interface CartMutation {
  productId: string;
  quantity?: number;
  intent?: CartMutationIntent;
}

export function currentCartStorageScope() {
  if (typeof document === "undefined") return "guest";
  return document.documentElement.dataset.cartScope || "guest";
}

export function cartStorageKey(scope = currentCartStorageScope()) {
  return scope === "guest"
    ? CART_GUEST_KEY
    : `talomart-production-cart:${scope}`;
}

export function normalizeLocalCart(value: unknown): LocalCartItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const candidate = item as Partial<LocalCartItem>;
      const product = candidate.product as Partial<StoreProduct> | undefined;
      const quantity = Number(candidate.quantity);

      if (
        !product ||
        !isUuidCartProductId(String(product.id ?? "")) ||
        typeof product.name !== "string" ||
        !Number.isFinite(product.price) ||
        !Number.isFinite(product.stock) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return null;
      }

      return {
        product: product as StoreProduct,
        quantity: Math.min(quantity, 99)
      };
    })
    .filter((item): item is LocalCartItem => item !== null);
}

export function readLocalCart(scope = currentCartStorageScope()): LocalCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const storageKey = cartStorageKey(scope);
    const scopedValue = window.localStorage.getItem(storageKey);
    const legacyValue =
      scope === "guest" ? window.localStorage.getItem(LEGACY_CART_KEY) : null;
    const stored = scopedValue ?? legacyValue ?? "[]";
    const normalized = normalizeLocalCart(JSON.parse(stored));
    const serialized = JSON.stringify(normalized);

    if (scopedValue !== serialized) {
      window.localStorage.setItem(storageKey, serialized);
    }
    if (scope === "guest" && legacyValue !== null) {
      window.localStorage.removeItem(LEGACY_CART_KEY);
    }

    return normalized;
  } catch {
    return [];
  }
}

export function writeLocalCart(
  cart: LocalCartItem[],
  scope = currentCartStorageScope()
) {
  const normalized = normalizeLocalCart(cart);
  window.localStorage.setItem(cartStorageKey(scope), JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent("talomart:cart-sync", {
      detail: { scope, items: normalized }
    })
  );
}

export function clearLocalCart(scope = currentCartStorageScope()) {
  writeLocalCart([], scope);
}

export function clearGuestLocalCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_GUEST_KEY);
  window.localStorage.removeItem(LEGACY_CART_KEY);
}

export function mergeLocalCarts(...carts: LocalCartItem[][]) {
  const merged = new Map<string, LocalCartItem>();

  for (const cart of carts) {
    for (const item of normalizeLocalCart(cart)) {
      const current = merged.get(item.product.id);
      merged.set(item.product.id, {
        product: item.product,
        quantity: Math.min(
          (current?.quantity ?? 0) + item.quantity,
          Math.max(item.product.stock, 0),
          99
        )
      });
    }
  }

  return [...merged.values()].filter((item) => item.quantity > 0);
}

export function addProductToLocalCart(product: StoreProduct) {
  const current = readLocalCart();
  if (!isUuidCartProductId(product.id)) return current;

  const existing = current.find((item) => item.product.id === product.id);
  const updated = existing
    ? current.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    : [...current, { product, quantity: 1 }];

  writeLocalCart(updated);
  return updated;
}

export function persistCartMutation({
  productId,
  quantity = 1,
  intent = "add"
}: CartMutation) {
  if (!isUuidCartProductId(productId)) {
    return Promise.reject(new Error("Only live catalogue products can be saved."));
  }

  const persist = async () => {
    const body = new FormData();
    body.set("productId", productId);
    body.set("quantity", String(quantity));
    body.set("intent", intent);
    body.set("next", "/cart");

    const response = await fetch("/api/cart", {
      method: "POST",
      body,
      redirect: "manual"
    });
    const isRedirect = response.status >= 300 && response.status < 400;

    if (
      response.type !== "opaqueredirect" &&
      !response.ok &&
      !isRedirect
    ) {
      throw new Error(`Cart sync failed with status ${response.status}.`);
    }
  };
  const pendingSync = serverCartSyncQueue.then(persist, persist);

  serverCartSyncQueue = pendingSync.catch(() => undefined);
  return pendingSync;
}

export function persistCartAddition(productId: string, quantity = 1) {
  return persistCartMutation({ productId, quantity, intent: "add" });
}

export function changeCartItemQuantity(
  cart: LocalCartItem[],
  productId: string,
  delta: number
) {
  return cart
    .map((item) =>
      item.product.id === productId
        ? {
            ...item,
            quantity: Math.min(
              Math.max(item.quantity + delta, 0),
              Math.max(item.product.stock, 0)
            )
          }
        : item
    )
    .filter((item) => item.quantity > 0);
}

export function updateLocalCartQuantity(productId: string, delta: number) {
  const updated = changeCartItemQuantity(readLocalCart(), productId, delta);

  writeLocalCart(updated);
  return updated;
}

export function removeProductFromCart(cart: LocalCartItem[], productId: string) {
  return cart.filter(
    (item) => item.product.id !== productId
  );
}

export function removeProductFromLocalCart(productId: string) {
  const updated = removeProductFromCart(readLocalCart(), productId);

  writeLocalCart(updated);
  return updated;
}
