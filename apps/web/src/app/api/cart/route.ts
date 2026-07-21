import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseServerCart,
  serializeServerCart,
  SERVER_CART_COOKIE
} from "@/lib/server-cart";

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

  if (!/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.redirect(redirectUrl(request, "/products"));
  }

  const cookieStore = await cookies();
  const current = parseServerCart(
    cookieStore.get(SERVER_CART_COOKIE)?.value
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
  response.cookies.set(SERVER_CART_COOKIE, serializeServerCart(next), {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax"
  });

  return response;
}
