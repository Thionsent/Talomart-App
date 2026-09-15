export const passwordResetMinimumLength = 8;
export const passwordResetMaximumLength = 128;

export function passwordResetChecks(password: string) {
  return [
    {
      label: `At least ${passwordResetMinimumLength} characters`,
      passed: password.length >= passwordResetMinimumLength
    },
    {
      label: "One letter",
      passed: /[A-Za-z]/.test(password)
    },
    {
      label: "One number",
      passed: /\d/.test(password)
    }
  ];
}

export function isAcceptableResetPassword(password: string) {
  return (
    password.length <= passwordResetMaximumLength &&
    passwordResetChecks(password).every((check) => check.passed)
  );
}
