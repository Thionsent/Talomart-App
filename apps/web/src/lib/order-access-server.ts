import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  canAccessOrder,
  guestOrderAccessCookieName,
  normalizeOrderNumber
} from "@/lib/order-access";
import { sql } from "@talomart/db";
import { cookies, headers } from "next/headers";

type OrderAccessRecord = {
  orderId: string;
  orderNumber: string;
  userId: string | null;
  guestAccessTokenHash: string | null;
  guestAccessExpiresAt: string | null;
};

export type AuthorizedOrderAccess = {
  orderId: string;
  orderNumber: string;
  accessType: "customer" | "guest";
};

export async function resolveOrderAccess(
  requestedOrderNumber: string,
  options?: { sessionUserId: string | null }
): Promise<AuthorizedOrderAccess | null> {
  const orderNumber = normalizeOrderNumber(requestedOrderNumber);
  if (!orderNumber) return null;

  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies()
  ]);
  const sessionUserId =
    options !== undefined
      ? options.sessionUserId
      : (
          await auth.api
            .getSession({ headers: requestHeaders })
            .catch(() => null)
        )?.user.id ?? null;

  const [record] = await sql<OrderAccessRecord[]>`
    select
      id::text as "orderId",
      order_number as "orderNumber",
      user_id as "userId",
      guest_access_token_hash as "guestAccessTokenHash",
      guest_access_expires_at::text as "guestAccessExpiresAt"
    from orders
    where lower(order_number) = lower(${orderNumber})
    limit 1
  `;

  if (!record) return null;

  const presentedGuestToken = cookieStore.get(
    guestOrderAccessCookieName(record.orderNumber, env.AUTH_SECRET)
  )?.value;
  const authorized = canAccessOrder({
    orderUserId: record.userId,
    sessionUserId,
    guestAccessTokenHash: record.guestAccessTokenHash,
    guestAccessExpiresAt: record.guestAccessExpiresAt,
    presentedGuestToken: presentedGuestToken ?? null,
    secret: env.AUTH_SECRET
  });

  if (!authorized) return null;

  return {
    orderId: record.orderId,
    orderNumber: record.orderNumber,
    accessType: record.userId ? "customer" : "guest"
  };
}
