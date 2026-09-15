import { describe, expect, it } from "vitest";

import {
  getOrderLookupClientAddress,
  isOrderLookupRateLimited,
  makeOrderLookupRateLimitKey,
  ORDER_LOOKUP_RATE_LIMIT
} from "./order-lookup-rate-limit";

const secret = "test-secret-with-at-least-thirty-two-characters";

describe("order lookup rate limiting", () => {
  it("uses the host-provided client address in priority order", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-real-ip": "203.0.113.20",
      "x-forwarded-for": "203.0.113.30, 10.0.0.1"
    });

    expect(getOrderLookupClientAddress(headers)).toBe("203.0.113.10");
    headers.delete("cf-connecting-ip");
    expect(getOrderLookupClientAddress(headers)).toBe("203.0.113.20");
    headers.delete("x-real-ip");
    expect(getOrderLookupClientAddress(headers)).toBe("203.0.113.30");
  });

  it("hashes anonymous client data before it becomes a database key", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.10",
      "user-agent": "Talomart test browser"
    });
    const key = makeOrderLookupRateLimitKey({
      requestHeaders: headers,
      secret
    });

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("203.0.113.10");
    expect(key).not.toContain("Talomart test browser");
  });

  it("uses the signed-in customer as the stable principal", () => {
    const first = makeOrderLookupRateLimitKey({
      requestHeaders: new Headers({ "x-real-ip": "203.0.113.10" }),
      sessionUserId: "customer-1",
      secret
    });
    const second = makeOrderLookupRateLimitKey({
      requestHeaders: new Headers({ "x-real-ip": "198.51.100.9" }),
      sessionUserId: "customer-1",
      secret
    });

    expect(first).toBe(second);
  });

  it("allows the configured number of attempts and blocks the next one", () => {
    expect(isOrderLookupRateLimited(ORDER_LOOKUP_RATE_LIMIT)).toBe(false);
    expect(isOrderLookupRateLimited(ORDER_LOOKUP_RATE_LIMIT + 1)).toBe(true);
  });
});
