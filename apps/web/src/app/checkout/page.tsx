import { cookies, headers } from "next/headers";

import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
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

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const session = await auth.api
    .getSession({ headers: requestHeaders })
    .catch(() => null);
  const isAuthenticated =
    Boolean(session) &&
    (session?.user as { role?: string } | undefined)?.role === "customer";
  const cartScope = isAuthenticated
    ? deriveCustomerAccountScope(session!.user.id, env.AUTH_SECRET)
    : GUEST_ACCOUNT_SCOPE;
  const scopedCartValue = cookieStore.get(
    serverCartCookieName(cartScope)
  )?.value;
  const initialCart = await getServerCart(
    scopedCartValue ??
      (cartScope === GUEST_ACCOUNT_SCOPE
        ? cookieStore.get(LEGACY_SERVER_CART_COOKIE)?.value
        : undefined)
  );
  const mpesa = getMpesaConfigurationStatus();

  return (
    <CheckoutPageClient
      cartScope={cartScope}
      initialCart={initialCart}
      isAuthenticated={isAuthenticated}
      initialEmail={isAuthenticated ? session!.user.email : ""}
      mpesaAvailable={mpesa.configured}
      mpesaEnvironment={mpesa.environment}
      mpesaUnavailableReason={mpesa.reason}
    />
  );
}
