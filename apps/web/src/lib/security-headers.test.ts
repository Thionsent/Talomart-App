import { describe, expect, it } from "vitest";

import {
  baselineSecurityHeaders,
  buildContentSecurityPolicy
} from "./security-headers";

describe("security headers", () => {
  it("builds a nonce-based production content security policy", () => {
    const policy = buildContentSecurityPolicy("known-nonce");

    expect(policy).toContain("script-src 'self' 'nonce-known-nonce' 'strict-dynamic'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("allows the Next.js development evaluator only in development", () => {
    expect(
      buildContentSecurityPolicy("dev-nonce", { development: true })
    ).toContain("'unsafe-eval'");
  });

  it("includes clickjacking, MIME and browser-feature protections", () => {
    const headers = new Map(
      baselineSecurityHeaders.map((header) => [header.key, header.value])
    );

    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
