import { cookies } from "next/headers";

import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";
import { getServerCart, SERVER_CART_COOKIE } from "@/lib/server-cart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cookieStore = await cookies();
  const initialCart = await getServerCart(
    cookieStore.get(SERVER_CART_COOKIE)?.value
  );

  return <CheckoutPageClient initialCart={initialCart} />;
}
