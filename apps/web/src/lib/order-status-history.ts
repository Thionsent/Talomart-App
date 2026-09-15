import { sql } from "@talomart/db";

import type { OrderStatus } from "./order-status";

type SqlRunner = typeof sql;

export async function recordOrderStatusTransition(
  runner: SqlRunner,
  input: {
    orderId: string;
    previousStatus: OrderStatus | null;
    nextStatus: OrderStatus;
    source: "checkout" | "admin" | "fulfillment" | "daraja" | "system";
    reason?: string | null;
    actorId?: string | null;
  }
) {
  if (input.previousStatus === input.nextStatus) return;

  await runner`
    insert into order_status_history (
      order_id,
      previous_status,
      next_status,
      source,
      reason,
      actor_id
    ) values (
      ${input.orderId}::uuid,
      ${input.previousStatus},
      ${input.nextStatus},
      ${input.source},
      ${input.reason ?? null},
      ${input.actorId ?? null}
    )
  `;
}
