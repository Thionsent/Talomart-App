import type { StoreProduct } from "@/lib/catalog";

export interface LocalCartItem {
  product: StoreProduct;
  quantity: number;
}

export const CART_KEY = "talomart-production-cart";

export function readLocalCart(): LocalCartItem[] {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function writeLocalCart(cart: LocalCartItem[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(
    new CustomEvent("talomart:cart-sync", { detail: cart })
  );
}

export function addProductToLocalCart(product: StoreProduct) {
  const current = readLocalCart();
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
