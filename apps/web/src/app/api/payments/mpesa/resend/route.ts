import { env } from "@/lib/env";
import {
  endpointRateLimitPolicies,
  enforceEndpointRateLimit
} from "@/lib/endpoint-rate-limit";
import { logger } from "@/lib/logger";
import { resolveOrderAccess } from "@/lib/order-access-server";
import {
  getMpesaResendAvailability,
  type MpesaLifecycleSnapshot
} from "@/lib/payments/mpesa-lifecycle";
import {
  findMpesaOrderPayment,
  persistAcceptedMpesaStkPush
} from "@/lib/payments/mpesa-order-service";
import { initiateStkPush } from "@/lib/payments/mpesa";
import { sql } from "@talomart/db";
import { z } from "zod";

const resendSchema = z.object({
  orderNumber: z.string().trim().min(8).max(64)
});

export async function POST(request: Request) {
  const rateLimitResponse = await enforceEndpointRateLimit(
    request,
    endpointRateLimitPolicies.mpesaResend
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = resendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid order details." }, { status: 400 });
  }

  const access = await resolveOrderAccess(parsed.data.orderNumber);
  if (!access) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const payment = await findMpesaOrderPayment(access.orderId);
  if (!payment) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const lifecycle: MpesaLifecycleSnapshot = {
    orderStatus: payment.orderStatus,
    paymentStatus: payment.paymentStatus,
    attemptCount: Math.max(
      payment.attemptCount,
      payment.checkoutRequestId ? 1 : 0
    ),
    lastInitiatedAt: payment.lastInitiatedAt,
    paymentUpdatedAt: payment.paymentUpdatedAt,
    providerQueryStatus: payment.providerQueryStatus
  };
  const availability = getMpesaResendAvailability(
    lifecycle,
    env.MPESA_ENVIRONMENT
  );

  if (!availability.canResend) {
    return Response.json(
      {
        error:
          availability.retryAfterSeconds > 0
            ? `Please wait ${availability.retryAfterSeconds} seconds before resending.`
            : "This M-Pesa request cannot be safely resent yet. We are still checking its status."
      },
      { status: 409 }
    );
  }

  const [claimed] = await sql<{ id: string; attemptCount: number }[]>`
    update payments p
    set
      status = 'processing',
      attempt_count = greatest(p.attempt_count, ${lifecycle.attemptCount}) + 1,
      last_initiated_at = now(),
      merchant_request_id = null,
      checkout_request_id = null,
      provider_query_status = null,
      provider_queried_at = null,
      failure_reason = null,
      updated_at = now()
    where p.id = ${payment.paymentId}::uuid
      and p.status <> 'paid'
      and greatest(p.attempt_count, ${lifecycle.attemptCount}) < 3
      and coalesce(p.last_initiated_at, p.updated_at) <= now() - interval '30 seconds'
      and (
        p.status = 'failed'
        or p.provider_query_status = 'failed'
        or (
          ${env.MPESA_ENVIRONMENT === "sandbox"}
          and p.provider_query_status = 'not_found'
        )
      )
      and exists (
        select 1 from orders o
        where o.id = p.order_id and o.status = 'pending_payment'
      )
    returning p.id::text, p.attempt_count as "attemptCount"
  `;

  if (!claimed) {
    return Response.json(
      { error: "Another payment check or resend is already in progress." },
      { status: 409 }
    );
  }

  try {
    const stk = await initiateStkPush({
      phone: payment.phone,
      amountKes: Math.round(payment.amountMinor / 100),
      orderNumber: payment.orderNumber
    });
    await persistAcceptedMpesaStkPush(payment.paymentId, stk);

    return Response.json({
      state: "processing",
      message:
        "A new STK Push was sent. Check your phone and enter your M-Pesa PIN.",
      canResend: false,
      attemptCount: claimed.attemptCount
    });
  } catch (error) {
    const failureReason =
      error instanceof Error ? error.message : "M-Pesa STK Push request failed";
    logger.error(
      { error, orderId: payment.orderId, paymentId: payment.paymentId },
      "Resent M-Pesa STK Push was rejected"
    );
    await sql`
      update payments
      set
        status = 'failed',
        provider_query_status = 'failed',
        failure_reason = ${failureReason},
        updated_at = now()
      where id = ${payment.paymentId}::uuid
        and status <> 'paid'
    `;

    return Response.json(
      {
        error:
          "M-Pesa did not accept the new prompt. Please wait a moment and try again."
      },
      { status: 502 }
    );
  }
}
