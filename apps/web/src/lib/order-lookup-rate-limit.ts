import { createHmac } from "node:crypto";

import { env } from "./env";
import { sql } from "@talomart/db";

export const ORDER_LOOKUP_RATE_LIMIT = 15;
export const ORDER_LOOKUP_WINDOW_SECONDS = 10 * 60;

type HeaderReader = Pick<Headers, "get">;

function firstHeaderAddress(value: string | null) {
  return value?.split(",", 1)[0]?.trim().slice(0, 200) || null;
}

export function getOrderLookupClientAddress(requestHeaders: HeaderReader) {
  return (
    firstHeaderAddress(requestHeaders.get("cf-connecting-ip")) ??
    firstHeaderAddress(requestHeaders.get("x-vercel-forwarded-for")) ??
    firstHeaderAddress(requestHeaders.get("x-real-ip")) ??
    firstHeaderAddress(requestHeaders.get("x-forwarded-for")) ??
    "unavailable"
  );
}

export function makeOrderLookupRateLimitKey(input: {
  requestHeaders: HeaderReader;
  sessionUserId?: string | null;
  secret: string;
}) {
  const principal = input.sessionUserId
    ? `user:${input.sessionUserId}`
    : [
        "anonymous",
        getOrderLookupClientAddress(input.requestHeaders),
        input.requestHeaders.get("user-agent")?.slice(0, 300) ?? "unknown-agent"
      ].join(":");

  return createHmac("sha256", input.secret)
    .update(`talomart:order-lookup-rate-limit:v1:${principal}`)
    .digest("hex");
}

export function isOrderLookupRateLimited(
  attempts: number,
  limit = ORDER_LOOKUP_RATE_LIMIT
) {
  return attempts > limit;
}

export async function consumeOrderLookupRateLimit(input: {
  requestHeaders: HeaderReader;
  sessionUserId?: string | null;
}) {
  const keyHash = makeOrderLookupRateLimitKey({
    ...input,
    secret: env.AUTH_SECRET
  });
  const [state] = await sql<
    { attempts: number; retryAfterSeconds: number }[]
  >`
    insert into order_lookup_rate_limits (
      key_hash,
      attempts,
      window_started_at,
      updated_at
    )
    values (${keyHash}, 1, now(), now())
    on conflict (key_hash) do update
    set
      attempts = case
        when order_lookup_rate_limits.window_started_at <=
          now() - (${ORDER_LOOKUP_WINDOW_SECONDS} * interval '1 second')
          then 1
        else order_lookup_rate_limits.attempts + 1
      end,
      window_started_at = case
        when order_lookup_rate_limits.window_started_at <=
          now() - (${ORDER_LOOKUP_WINDOW_SECONDS} * interval '1 second')
          then now()
        else order_lookup_rate_limits.window_started_at
      end,
      updated_at = now()
    returning
      attempts,
      greatest(
        0,
        ceil(
          extract(
            epoch from (
              window_started_at +
              (${ORDER_LOOKUP_WINDOW_SECONDS} * interval '1 second') -
              now()
            )
          )
        )
      )::int as "retryAfterSeconds"
  `;

  const attempts = state?.attempts ?? ORDER_LOOKUP_RATE_LIMIT + 1;
  return {
    allowed: !isOrderLookupRateLimited(attempts),
    remaining: Math.max(0, ORDER_LOOKUP_RATE_LIMIT - attempts),
    retryAfterSeconds: state?.retryAfterSeconds ?? ORDER_LOOKUP_WINDOW_SECONDS
  };
}
