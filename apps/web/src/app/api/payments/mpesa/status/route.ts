import { env } from "@/lib/env";
import { processPendingTransactionalEmails } from "@/lib/email";
import {
  endpointRateLimitPolicies,
  enforceEndpointRateLimit
} from "@/lib/endpoint-rate-limit";
import { logger } from "@/lib/logger";
import { resolveOrderAccess } from "@/lib/order-access-server";
import {
  getMpesaCustomerState,
  getMpesaResendAvailability,
  messageForMpesaState,
  type MpesaLifecycleSnapshot
} from "@/lib/payments/mpesa-lifecycle";
import {
  claimMpesaStatusQuery,
  confirmMpesaPaymentFromQuery,
  expireAbandonedMpesaOrder,
  findMpesaOrderPayment,
  recordMpesaQueryResult,
  type MpesaOrderPaymentRecord
} from "@/lib/payments/mpesa-order-service";
import { queryStkPush, type MpesaStkQueryResult } from "@/lib/payments/mpesa";
import { z } from "zod";
import { after } from "next/server";

const statusSchema = z.object({
  orderNumber: z.string().trim().min(8).max(64)
});

function snapshot(record: MpesaOrderPaymentRecord): MpesaLifecycleSnapshot {
  return {
    orderStatus: record.orderStatus,
    paymentStatus: record.paymentStatus,
    attemptCount: Math.max(
      record.attemptCount,
      record.checkoutRequestId ? 1 : 0
    ),
    lastInitiatedAt: record.lastInitiatedAt,
    paymentUpdatedAt: record.paymentUpdatedAt,
    providerQueryStatus: record.providerQueryStatus
  };
}

function responseFor(record: MpesaOrderPaymentRecord) {
  const lifecycle = snapshot(record);
  const state = getMpesaCustomerState(lifecycle);
  const resend = getMpesaResendAvailability(
    lifecycle,
    env.MPESA_ENVIRONMENT
  );

  return {
    state,
    message: messageForMpesaState(state),
    canResend: resend.canResend,
    retryAfterSeconds: resend.retryAfterSeconds,
    attemptsRemaining: resend.attemptsRemaining,
    attemptCount: lifecycle.attemptCount
  };
}

export async function POST(request: Request) {
  after(() => processPendingTransactionalEmails());
  const rateLimitResponse = await enforceEndpointRateLimit(
    request,
    endpointRateLimitPolicies.mpesaStatus
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid order details." }, { status: 400 });
  }

  const access = await resolveOrderAccess(parsed.data.orderNumber);
  if (!access) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  let record = await findMpesaOrderPayment(access.orderId);
  if (!record) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  let state = getMpesaCustomerState(snapshot(record));
  if (
    state !== "confirmed" &&
    record.orderStatus !== "cancelled" &&
    record.checkoutRequestId &&
    (await claimMpesaStatusQuery(record.paymentId))
  ) {
    let query: MpesaStkQueryResult;
    try {
      query = await queryStkPush(record.checkoutRequestId);
    } catch (error) {
      logger.warn(
        { error, orderId: record.orderId, paymentId: record.paymentId },
        "M-Pesa status query was temporarily unavailable"
      );
      query = {
        status: "unavailable",
        resultCode: null,
        resultDescription: "M-Pesa status is temporarily unavailable.",
        payload: null
      };
    }

    if (query.status === "paid") {
      await confirmMpesaPaymentFromQuery({
        orderId: record.orderId,
        paymentId: record.paymentId,
        checkoutRequestId: record.checkoutRequestId,
        query
      });
    } else {
      await recordMpesaQueryResult(record.paymentId, query);
    }
    record = (await findMpesaOrderPayment(access.orderId)) ?? record;
    state = getMpesaCustomerState(snapshot(record));
  }

  if (state === "abandoned" && record.orderStatus === "pending_payment") {
    await expireAbandonedMpesaOrder(record.orderId);
    record = (await findMpesaOrderPayment(access.orderId)) ?? record;
  }

  return Response.json(responseFor(record), {
    headers: { "Cache-Control": "no-store" }
  });
}
