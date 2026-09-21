export const ADMIN_TOTP_CODE_LENGTH = 6;

export function sanitizeAdminTotpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, ADMIN_TOTP_CODE_LENGTH);
}

export function isValidAdminTotpCode(value: string) {
  return new RegExp(`^\\d{${ADMIN_TOTP_CODE_LENGTH}}$`).test(value);
}

export function adminMfaFailureMessage(options: {
  backupMode: boolean;
  status?: number;
}) {
  if (options.status === 429) {
    return "Too many attempts. This account is temporarily locked.";
  }

  if (options.backupMode) {
    return "That recovery code was not accepted. Check that it matches one unused Talomart Admin recovery code exactly, including capital letters and the hyphen.";
  }

  return "That code was not accepted. Wait for a new six-digit code from the Talomart Admin authenticator entry, check that your phone uses automatic date and time, then try again.";
}
