import { describe, expect, it } from "vitest";

import {
  configuredClientAddress,
  endpointRateLimitKey,
  endpointRateLimitPolicies
} from "./endpoint-rate-limit";

describe("endpoint rate limiting", () => {
  it("uses the configured forwarded address without including proxy hops", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.4, 10.0.0.8"
    });

    expect(configuredClientAddress(headers, "x-forwarded-for")).toBe(
      "203.0.113.4"
    );
  });

  it("hashes the client address and endpoint subject", () => {
    const request = new Request("http://localhost/api/checkout", {
      headers: { "x-forwarded-for": "203.0.113.4" }
    });
    const key = endpointRateLimitKey(
      request,
      endpointRateLimitPolicies.checkout,
      "customer-123"
    );

    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain("203.0.113.4");
    expect(key).not.toContain("customer-123");
  });

  it("keeps payment status polling separate from STK resend limits", () => {
    expect(endpointRateLimitPolicies.mpesaStatus.max).toBeGreaterThan(
      endpointRateLimitPolicies.mpesaResend.max
    );
    expect(endpointRateLimitPolicies.mpesaResend.windowSeconds).toBeGreaterThan(
      endpointRateLimitPolicies.mpesaStatus.windowSeconds
    );
  });
});
