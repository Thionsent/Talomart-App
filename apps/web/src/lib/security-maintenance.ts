import { sql } from "@talomart/db";

const RETENTION_HOURS = 48;

export async function cleanExpiredSecurityRateLimits() {
  const authCutoff = Date.now() - RETENTION_HOURS * 60 * 60 * 1000;
  const [authRows, endpointRows, lookupRows] = await Promise.all([
    sql`delete from auth_rate_limits where last_request < ${authCutoff}`,
    sql`
      delete from endpoint_rate_limits
      where updated_at < now() - (${RETENTION_HOURS} * interval '1 hour')
    `,
    sql`
      delete from order_lookup_rate_limits
      where updated_at < now() - (${RETENTION_HOURS} * interval '1 hour')
    `
  ]);

  return {
    auth: authRows.count,
    endpoint: endpointRows.count,
    orderLookup: lookupRows.count
  };
}
