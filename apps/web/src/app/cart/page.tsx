import { cookies } from "next/headers";

import { CartPageClient } from "@/components/cart/cart-page-client";
import { getServerCart, SERVER_CART_COOKIE } from "@/lib/server-cart";

export const metadata = { title: "Shopping cart" };

export default async function CartPage() {
  const cookieStore = await cookies();
  const initialCart = await getServerCart(
    cookieStore.get(SERVER_CART_COOKIE)?.value
  );

  return <CartPageClient initialCart={initialCart} />;
}
