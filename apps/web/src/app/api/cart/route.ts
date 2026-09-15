import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  deriveCustomerAccountScope,
  GUEST_ACCOUNT_SCOPE
} from "@/lib/browser-account-scope";
import { env } from "@/lib/env";
import {
  LEGACY_SERVER_CART_COOKIE,
  parseServerCart,
  serverCartCookieName,
  serializeServerCart,
} from "@/lib/server-cart";
import { isUuidCartProductId } from "@/lib/cart-product-id";

function redirectUrl(request: Request, path: string) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  return new URL(path.startsWith("/") ? path : "/cart", `${protocol}://${host}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const nextPath = String(formData.get("next") ?? "/cart");
  const intent = String(formData.get("intent") ?? "add");

  if (!isUuidCartProductId(productId)) {
    return NextResponse.redirect(redirectUrl(request, "/products"));
  }

  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const session = await auth.api
    .getSession({ headers: requestHeaders })
    .catch(() => null);
  const isCustomer =
    Boolean(session) &&
    (session?.user as { role?: string } | undefined)?.role === "customer";
  const cartScope = isCustomer
    ? deriveCustomerAccountScope(session!.user.id, env.AUTH_SECRET)
    : GUEST_ACCOUNT_SCOPE;
  const cookieName = serverCartCookieName(cartScope);
  const current = parseServerCart(
    cookieStore.get(cookieName)?.value ??
      (cartScope === GUEST_ACCOUNT_SCOPE
        ? cookieStore.get(LEGACY_SERVER_CART_COOKIE)?.value
        : undefined)
  );
  const existing = current.find((item) => item.productId === productId);
  let next = current;

  if (intent === "remove" || (intent === "set" && quantity <= 0)) {
    next = current.filter((item) => item.productId !== productId);
  } else if (intent === "set") {
    const safeQuantity = Math.min(Math.max(quantity, 1), 99);
    next = existing
      ? current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: safeQuantity }
            : item
        )
      : [...current, { productId, quantity: safeQuantity }];
  } else {
    const safeQuantity = Math.min(Math.max(quantity, 1), 99);
    next = existing
      ? current.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + safeQuantity }
            : item
        )
      : [...current, { productId, quantity: safeQuantity }];
  }

  const response = NextResponse.redirect(redirectUrl(request, nextPath));
  response.cookies.set(cookieName, serializeServerCart(next), {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax"
  });
  if (cartScope === GUEST_ACCOUNT_SCOPE) {
    response.cookies.delete(LEGACY_SERVER_CART_COOKIE);
  }

  return response;
}
