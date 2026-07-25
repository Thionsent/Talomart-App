import { describe, expect, it } from "vitest";

import { safeCustomerDestination } from "./auth-redirect";

describe("customer authentication redirects", () => {
  it("preserves safe storefront destinations", () => {
    expect(safeCustomerDestination("/checkout")).toBe("/checkout");
    expect(safeCustomerDestination("/products/phone?q=green#details")).toBe(
      "/products/phone?q=green#details"
    );
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeCustomerDestination("https://malicious.example")).toBe("/account");
    expect(safeCustomerDestination("//malicious.example/path")).toBe("/account");
  });

  it("prevents customer authentication loops and admin redirects", () => {
    expect(safeCustomerDestination("/sign-in?next=/checkout")).toBe("/account");
    expect(safeCustomerDestination("/admin")).toBe("/account");
    expect(safeCustomerDestination("/api/auth/session")).toBe("/account");
  });
});
