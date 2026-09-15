import { createHmac, timingSafeEqual } from "node:crypto";

const GUEST_ACCESS_TOKEN_CONTEXT = "talomart:guest-order-access:v1";
const GUEST_ACCESS_HASH_CONTEXT = "talomart:guest-order-hash:v1";
const GUEST_ACCESS_COOKIE_CONTEXT = "talomart:guest-order-cookie:v1";

export const GUEST_ORDER_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function normalizeOrderNumber(orderNumber: string) {
  const normalized = orderNumber.trim().toUpperCase();
  return normalized.length > 0 && normalized.length <= 64 ? normalized : "";
}

export function deriveGuestOrderAccessToken(input: {
  checkoutIdempotencyKey: string;
  orderNumber: string;
  secret: string;
}) {
  const orderNumber = normalizeOrderNumber(input.orderNumber);
  if (!orderNumber || !input.checkoutIdempotencyKey) {
    throw new Error("A guest order access token requires checkout identity.");
  }

  return createHmac("sha256", input.secret)
    .update(
      `${GUEST_ACCESS_TOKEN_CONTEXT}:${input.checkoutIdempotencyKey}:${orderNumber}`
    )
    .digest("base64url");
}

export function hashGuestOrderAccessToken(token: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${GUEST_ACCESS_HASH_CONTEXT}:${token}`)
    .digest("hex");
}

export function guestOrderAccessCookieName(orderNumber: string, secret: string) {
  const normalized = normalizeOrderNumber(orderNumber);
  const suffix = createHmac("sha256", secret)
    .update(`${GUEST_ACCESS_COOKIE_CONTEXT}:${normalized}`)
    .digest("hex")
    .slice(0, 24);

  return `talomart-order-access-${suffix}`;
}

function hashesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function canAccessOrder(input: {
  orderUserId: string | null;
  sessionUserId: string | null;
  guestAccessTokenHash: string | null;
  guestAccessExpiresAt: Date | string | null;
  presentedGuestToken: string | null;
  secret: string;
  now?: Date;
}) {
  if (input.orderUserId) {
    return input.sessionUserId === input.orderUserId;
  }

  if (
    !input.guestAccessTokenHash ||
    !input.guestAccessExpiresAt ||
    !input.presentedGuestToken
  ) {
    return false;
  }

  const expiresAt = new Date(input.guestAccessExpiresAt);
  const now = input.now ?? new Date();
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
    return false;
  }

  const presentedHash = hashGuestOrderAccessToken(
    input.presentedGuestToken,
    input.secret
  );
  return hashesMatch(input.guestAccessTokenHash, presentedHash);
}
