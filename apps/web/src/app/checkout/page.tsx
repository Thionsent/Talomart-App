import { cookies, headers } from "next/headers";

import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
import { auth } from "@/lib/auth";
import { getServerCart, SERVER_CART_COOKIE } from "@/lib/server-cart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const [initialCart, session] = await Promise.all([
    getServerCart(cookieStore.get(SERVER_CART_COOKIE)?.value),
    auth.api.getSession({ headers: requestHeaders }).catch(() => null)
  ]);
  const isAuthenticated =
    Boolean(session) &&
    (session?.user as { role?: string } | undefined)?.role === "customer";

  return (
    <CheckoutPageClient
      initialCart={initialCart}
      isAuthenticated={isAuthenticated}
    />
  );
}
