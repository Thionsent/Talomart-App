import { describe, expect, it } from "vitest";

import {
  isAcceptableResetPassword,
  passwordResetChecks,
  passwordResetMaximumLength
} from "./password-reset";

describe("password reset validation", () => {
  it("requires sufficient length, a letter and a number", () => {
    expect(isAcceptableResetPassword("Talomart8")).toBe(true);
    expect(isAcceptableResetPassword("short1")).toBe(false);
    expect(isAcceptableResetPassword("onlyletters")).toBe(false);
    expect(isAcceptableResetPassword("12345678")).toBe(false);
  });

  it("rejects passwords above the Better Auth maximum", () => {
    expect(
      isAcceptableResetPassword(`A1${"x".repeat(passwordResetMaximumLength)}`)
    ).toBe(false);
  });

  it("reports each requirement independently", () => {
    expect(passwordResetChecks("12345678")).toEqual([
      { label: "At least 8 characters", passed: true },
      { label: "One letter", passed: false },
      { label: "One number", passed: true }
    ]);
  });
});
