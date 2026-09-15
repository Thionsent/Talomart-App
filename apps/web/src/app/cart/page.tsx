import { cookies, headers } from "next/headers";

import { CartPageClient } from "@/components/cart/cart-page-client";
import { auth } from "@/lib/auth";
import {
  deriveCustomerAccountScope,
  GUEST_ACCOUNT_SCOPE
} from "@/lib/browser-account-scope";
import { env } from "@/lib/env";
import { getMpesaConfigurationStatus } from "@/lib/payments/mpesa";
import {
  getServerCart,
  LEGACY_SERVER_CART_COOKIE,
  serverCartCookieName
} from "@/lib/server-cart";

export const metadata = { title: "Shopping cart" };

export default async function CartPage() {
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
  const scopedValue = cookieStore.get(serverCartCookieName(cartScope))?.value;
  const initialCart = await getServerCart(
    scopedValue ??
      (cartScope === GUEST_ACCOUNT_SCOPE
        ? cookieStore.get(LEGACY_SERVER_CART_COOKIE)?.value
        : undefined)
  );
  const mpesa = getMpesaConfigurationStatus();

  return (
    <CartPageClient
      cartScope={cartScope}
      initialCart={initialCart}
      mpesaSandbox={mpesa.environment === "sandbox"}
    />
  );
}
