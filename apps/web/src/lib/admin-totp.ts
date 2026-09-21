export const ADMIN_TOTP_CODE_LENGTH = 6;

export function sanitizeAdminTotpCode(value: string) {
  return value.replace(/\D/g, "").slice(0, ADMIN_TOTP_CODE_LENGTH);
}

export function isValidAdminTotpCode(value: string) {
  return new RegExp(`^\\d{${ADMIN_TOTP_CODE_LENGTH}}$`).test(value);
}
