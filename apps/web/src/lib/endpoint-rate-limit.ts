import { createHmac } from "node:crypto";

import { sql } from "@talomart/db";

import { env } from "./env";
import { logger } from "./logger";

export type EndpointRateLimitPolicy = {
  namespace: string;
  max: number;
  windowSeconds: number;
};

type EndpointRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export function configuredClientAddress(
  requestHeaders: Pick<Headers, "get">,
  headerName = env.RATE_LIMIT_IP_HEADER
) {
  const raw = requestHeaders.get(headerName) ?? "unknown";
  const address =
    headerName === "x-forwarded-for"
      ? raw.split(",")[0]?.trim()
      : raw.trim();

  return (address || "unknown").slice(0, 128);
}

export function endpointRateLimitKey(
  request: Request,
  policy: EndpointRateLimitPolicy,
  subject = ""
) {
  const principal = configuredClientAddress(request.headers);
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`${policy.namespace}:${principal}:${subject.slice(0, 128)}`)
    .digest("hex");
}

export async function consumeEndpointRateLimit(
  request: Request,
  policy: EndpointRateLimitPolicy,
  subject = ""
): Promise<EndpointRateLimitResult> {
  const keyHash = endpointRateLimitKey(request, policy, subject);
  const [record] = await sql<
    { attempts: number; windowStartedAt: Date }[]
  >`
    insert into endpoint_rate_limits (
      key_hash,
      attempts,
      window_started_at,
      updated_at
    )
    values (${keyHash}, 1, now(), now())
    on conflict (key_hash) do update
    set
      attempts = case
        when endpoint_rate_limits.window_started_at <=
          now() - (${policy.windowSeconds} * interval '1 second')
        then 1
        else endpoint_rate_limits.attempts + 1
      end,
      window_started_at = case
        when endpoint_rate_limits.window_started_at <=
          now() - (${policy.windowSeconds} * interval '1 second')
        then now()
        else endpoint_rate_limits.window_started_at
      end,
      updated_at = now()
    returning
      attempts,
      window_started_at as "windowStartedAt"
  `;

  if (!record) throw new Error("The rate-limit store returned no result.");

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(record.windowStartedAt).getTime()) / 1000)
  );
  return {
    allowed: record.attempts <= policy.max,
    limit: policy.max,
    remaining: Math.max(policy.max - record.attempts, 0),
    retryAfterSeconds: Math.max(policy.windowSeconds - elapsedSeconds, 1)
  };
}

export async function enforceEndpointRateLimit(
  request: Request,
  policy: EndpointRateLimitPolicy,
  subject = ""
) {
  let result: EndpointRateLimitResult;
  try {
    result = await consumeEndpointRateLimit(request, policy, subject);
  } catch (error) {
    logger.error(
      { error, namespace: policy.namespace },
      "Endpoint rate-limit store was unavailable"
    );
    return Response.json(
      { error: "This request is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Retry-After": "30" } }
    );
  }

  if (!result.allowed) {
    return Response.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  return null;
}

export const endpointRateLimitPolicies = {
  checkout: { namespace: "checkout", max: 8, windowSeconds: 60 },
  mpesaStatus: { namespace: "mpesa-status", max: 90, windowSeconds: 60 },
  mpesaResend: { namespace: "mpesa-resend", max: 5, windowSeconds: 600 },
  mpesaCallback: { namespace: "mpesa-callback", max: 300, windowSeconds: 60 },
  adminMutation: { namespace: "admin-mutation", max: 60, windowSeconds: 60 }
} satisfies Record<string, EndpointRateLimitPolicy>;
