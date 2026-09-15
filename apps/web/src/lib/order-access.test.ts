import { describe, expect, it } from "vitest";

import {
  canAccessOrder,
  deriveGuestOrderAccessToken,
  guestOrderAccessCookieName,
  hashGuestOrderAccessToken,
  normalizeOrderNumber
} from "./order-access";

const secret = "test-secret-with-at-least-thirty-two-characters";
const orderNumber = "TLM-20260820-ABC12345";
const idempotencyKey = "032fbf1f-8b4c-4c16-8e29-40bff4f620cb";

describe("guest order access", () => {
  it("derives a stable high-entropy token without exposing checkout inputs", () => {
    const first = deriveGuestOrderAccessToken({
      checkoutIdempotencyKey: idempotencyKey,
      orderNumber,
      secret
    });
    const second = deriveGuestOrderAccessToken({
      checkoutIdempotencyKey: idempotencyKey,
      orderNumber: orderNumber.toLowerCase(),
      secret
    });

    expect(first).toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(first).not.toContain(orderNumber);
    expect(first).not.toContain(idempotencyKey);
    expect(
      deriveGuestOrderAccessToken({
        checkoutIdempotencyKey: idempotencyKey,
        orderNumber: "TLM-20260820-DIFFERENT",
        secret
      })
    ).not.toBe(first);
  });

  it("authorizes only the customer who owns an account order", () => {
    const base = {
      orderUserId: "customer-a",
      guestAccessTokenHash: null,
      guestAccessExpiresAt: null,
      presentedGuestToken: null,
      secret
    };

    expect(canAccessOrder({ ...base, sessionUserId: "customer-a" })).toBe(true);
    expect(canAccessOrder({ ...base, sessionUserId: "customer-b" })).toBe(false);
    expect(canAccessOrder({ ...base, sessionUserId: null })).toBe(false);
  });

  it("authorizes an unexpired guest credential and rejects invalid credentials", () => {
    const token = deriveGuestOrderAccessToken({
      checkoutIdempotencyKey: idempotencyKey,
      orderNumber,
      secret
    });
    const base = {
      orderUserId: null,
      sessionUserId: null,
      guestAccessTokenHash: hashGuestOrderAccessToken(token, secret),
      guestAccessExpiresAt: "2026-09-20T00:00:00.000Z",
      secret,
      now: new Date("2026-08-20T00:00:00.000Z")
    };

    expect(canAccessOrder({ ...base, presentedGuestToken: token })).toBe(true);
    expect(canAccessOrder({ ...base, presentedGuestToken: "wrong-token" })).toBe(
      false
    );
    expect(canAccessOrder({ ...base, presentedGuestToken: null })).toBe(false);
  });

  it("rejects expired guest credentials", () => {
    const token = deriveGuestOrderAccessToken({
      checkoutIdempotencyKey: idempotencyKey,
      orderNumber,
      secret
    });

    expect(
      canAccessOrder({
        orderUserId: null,
        sessionUserId: null,
        guestAccessTokenHash: hashGuestOrderAccessToken(token, secret),
        guestAccessExpiresAt: "2026-08-19T23:59:59.000Z",
        presentedGuestToken: token,
        secret,
        now: new Date("2026-08-20T00:00:00.000Z")
      })
    ).toBe(false);
  });

  it("uses a safe order-specific cookie name", () => {
    const name = guestOrderAccessCookieName(orderNumber, secret);

    expect(name).toMatch(/^talomart-order-access-[a-f0-9]{24}$/);
    expect(name).not.toContain(orderNumber);
    expect(guestOrderAccessCookieName(orderNumber, secret)).toBe(name);
    expect(guestOrderAccessCookieName("TLM-OTHER", secret)).not.toBe(name);
  });

  it("normalizes bounded order numbers", () => {
    expect(normalizeOrderNumber(`  ${orderNumber.toLowerCase()}  `)).toBe(
      orderNumber
    );
    expect(normalizeOrderNumber("x".repeat(65))).toBe("");
  });
});
