import { describe, expect, it } from "vitest";

import {
  ADMIN_TOTP_CODE_LENGTH,
  adminMfaFailureMessage,
  isValidAdminTotpCode,
  sanitizeAdminTotpCode
} from "./admin-totp";

describe("admin authenticator codes", () => {
  it("uses the six-digit format configured by the admin auth provider", () => {
    expect(ADMIN_TOTP_CODE_LENGTH).toBe(6);
    expect(isValidAdminTotpCode("012345")).toBe(true);
  });

  it("rejects incomplete, eight-digit and non-numeric codes", () => {
    expect(isValidAdminTotpCode("12345")).toBe(false);
    expect(isValidAdminTotpCode("12345678")).toBe(false);
    expect(isValidAdminTotpCode("12A456")).toBe(false);
  });

  it("removes formatting and limits pasted values to six digits", () => {
    expect(sanitizeAdminTotpCode("12 34-56")).toBe("123456");
    expect(sanitizeAdminTotpCode("92918155")).toBe("929181");
  });

  it("provides mode-specific verification guidance", () => {
    expect(adminMfaFailureMessage({ backupMode: true })).toContain(
      "recovery code"
    );
    expect(adminMfaFailureMessage({ backupMode: false })).toContain(
      "six-digit code"
    );
    expect(
      adminMfaFailureMessage({ backupMode: true, status: 429 })
    ).toContain("temporarily locked");
  });
});
