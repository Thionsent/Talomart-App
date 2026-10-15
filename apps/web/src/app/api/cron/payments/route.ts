import { timingSafeEqual } from "node:crypto";

import { sql } from "@talomart/db";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { queryStkPush } from "@/lib/payments/mpesa";
import {
  claimMpesaStatusQuery,
  confirmMpesaPaymentFromQuery,
  expireStaleMpesaOrders,
  recordMpesaQueryResult
} from "@/lib/payments/mpesa-order-service";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  if (!env.CRON_SECRET) return false;
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const pending = await sql<{
    orderId: string;
    paymentId: string;
    checkoutRequestId: string;
  }[]>`
    select
      o.id::text as "orderId",
      p.id::text as "paymentId",
      p.checkout_request_id as "checkoutRequestId"
    from payments p
    inner join orders o on o.id = p.order_id
    where p.method = 'mpesa'
      and p.status in ('pending', 'processing')
      and o.status = 'pending_payment'
      and p.checkout_request_id is not null
      and (p.provider_queried_at is null or p.provider_queried_at < now() - interval '12 seconds')
    order by p.created_at asc
    limit 5
  `;

  const outcomes = await Promise.all(pending.map(async (payment) => {
    if (!(await claimMpesaStatusQuery(payment.paymentId))) return "skipped";
    try {
      const query = await queryStkPush(payment.checkoutRequestId);
      if (query.status === "paid") {
        await confirmMpesaPaymentFromQuery({ ...payment, query });
      } else {
        await recordMpesaQueryResult(payment.paymentId, query);
      }
      return query.status;
    } catch (error) {
      logger.warn(
        { error, paymentId: payment.paymentId },
        "Scheduled M-Pesa status query failed"
      );
      return "unavailable";
    }
  }));

  const expired = await expireStaleMpesaOrders(20);
  return Response.json({
    ok: true,
    checked: outcomes.filter((outcome) => outcome !== "skipped").length,
    confirmed: outcomes.filter((outcome) => outcome === "paid").length,
    expired,
    unavailable: outcomes.filter((outcome) => outcome === "unavailable").length
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = run;
export const POST = run;
