import { createHmac } from "node:crypto";

export const GUEST_ACCOUNT_SCOPE = "guest";

export function deriveCustomerAccountScope(userId: string, secret: string) {
  if (!userId || !secret) throw new Error("Customer storage scope is unavailable.");

  const opaqueId = createHmac("sha256", secret)
    .update(`talomart:browser-account-scope:v1:${userId}`)
    .digest("hex")
    .slice(0, 24);

  return `customer-${opaqueId}`;
}
