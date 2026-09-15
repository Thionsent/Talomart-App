import { describe, expect, it } from "vitest";

import { deriveCustomerAccountScope } from "./browser-account-scope";

describe("browser account scope", () => {
  const secret = "a-production-length-test-secret-that-is-not-real";

  it("is stable for the same customer without exposing the customer id", () => {
    const userId = "customer-123";
    const scope = deriveCustomerAccountScope(userId, secret);

    expect(scope).toBe(deriveCustomerAccountScope(userId, secret));
    expect(scope).not.toContain(userId);
    expect(scope).toMatch(/^customer-[a-f0-9]{24}$/);
  });

  it("isolates different customers", () => {
    expect(deriveCustomerAccountScope("customer-a", secret)).not.toBe(
      deriveCustomerAccountScope("customer-b", secret)
    );
  });
});
