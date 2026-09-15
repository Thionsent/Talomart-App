import { sql } from "@talomart/db";
import { headers } from "next/headers";

import type { AdminPrincipal } from "./admin-authorization";
import { env } from "./env";

type SqlRunner = typeof sql;

type AdminAuditEvent = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

function clientAddress(requestHeaders: Headers) {
  const raw = requestHeaders.get(env.RATE_LIMIT_IP_HEADER);
  if (!raw) return null;
  return (
    env.RATE_LIMIT_IP_HEADER === "x-forwarded-for"
      ? raw.split(",")[0]?.trim()
      : raw.trim()
  )?.slice(0, 128) ?? null;
}

export async function recordAdminAudit(
  runner: SqlRunner,
  principal: AdminPrincipal,
  event: AdminAuditEvent
) {
  const requestHeaders = await headers();
  const before = event.before ? JSON.stringify(event.before) : null;
  const after = event.after ? JSON.stringify(event.after) : null;

  await runner`
    insert into admin_audit_logs (
      actor_id,
      actor_role,
      action,
      resource_type,
      resource_id,
      summary,
      before,
      after,
      ip_address,
      user_agent
    )
    values (
      ${principal.id},
      ${principal.role},
      ${event.action},
      ${event.resourceType},
      ${event.resourceId ?? null},
      ${event.summary},
      ${before}::jsonb,
      ${after}::jsonb,
      ${clientAddress(requestHeaders)},
      ${requestHeaders.get("user-agent")?.slice(0, 500) ?? null}
    )
  `;
}
