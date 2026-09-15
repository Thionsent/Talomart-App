import { z } from "zod";

import { serializeDatabaseJson } from "@/lib/database-json";
import {
  enqueueOrderEmail,
  processPendingTransactionalEmails
} from "@/lib/email";
import {
  endpointRateLimitPolicies,
  enforceEndpointRateLimit
} from "@/lib/endpoint-rate-limit";
import { logger } from "@/lib/logger";
import type { OrderStatus } from "@/lib/order-status";
import { recordOrderStatusTransition } from "@/lib/order-status-history";
import {
  getMpesaFallbackMatch,
  hasUnambiguousMpesaCandidate,
  mpesaCallbackMetadataValue,
  type MpesaStkCallback
} from "@/lib/payments/mpesa-reconciliation";
import { sql } from "@talomart/db";
import { after } from "next/server";

const callbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]).optional()
            })
          )
        })
        .optional()
    })
  })
});

type PaymentRecord = {
  id: string;
  orderId: string;
  paymentStatus: string;
  orderStatus: string;
  orderNumber: string;
};

export async function POST(request: Request) {
  after(() => processPendingTransactionalEmails());
  const rateLimitResponse = await enforceEndpointRateLimit(
    request,
    endpointRateLimitPolicies.mpesaCallback
  );
  if (rateLimitResponse) return rateLimitResponse;

  const payload = await request.json().catch(() => null);
  const result = callbackSchema.safeParse(payload);
  if (!result.success) {
    logger.warn({ issues: result.error.issues }, "Rejected M-Pesa callback");
    return Response.json(
      { ResultCode: 1, ResultDesc: "Invalid payload" },
      { status: 400 }
    );
  }

  const callback: MpesaStkCallback = result.data.Body.stkCallback;
  const receipt = mpesaCallbackMetadataValue(
    callback,
    "MpesaReceiptNumber"
  );
  const providerPayload = serializeDatabaseJson(payload);

  await sql.begin(async (transaction) => {
    let [payment] = await transaction<PaymentRecord[]>`
      select
        p.id::text,
        p.order_id::text as "orderId",
        p.status as "paymentStatus",
        o.status as "orderStatus",
        o.order_number as "orderNumber"
      from payments p
      inner join orders o on o.id = p.order_id
      where p.checkout_request_id = ${callback.CheckoutRequestID}
      for update of p, o
    `;
    let matchedByFallback = false;

    if (!payment) {
      const fallback = getMpesaFallbackMatch(callback);
      if (fallback) {
        const candidates = await transaction<PaymentRecord[]>`
          select
            p.id::text,
            p.order_id::text as "orderId",
            p.status as "paymentStatus",
            o.status as "orderStatus",
            o.order_number as "orderNumber"
          from payments p
          inner join orders o on o.id = p.order_id
          where p.method = 'mpesa'
            and p.checkout_request_id is null
            and p.status in ('pending', 'processing')
            and o.status = 'pending_payment'
            and p.amount_minor = ${fallback.amountMinor}
            and right(
              regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g'),
              9
            ) = ${fallback.phoneSuffix}
            and p.created_at >= now() - interval '2 hours'
          order by p.created_at desc
          limit 2
          for update of p, o
        `;

        payment = hasUnambiguousMpesaCandidate(candidates) ?? undefined;
        matchedByFallback = Boolean(payment);

        if (candidates.length > 1) {
          logger.error(
            {
              checkoutRequestId: callback.CheckoutRequestID,
              candidateCount: candidates.length
            },
            "M-Pesa callback fallback match was ambiguous"
          );
        }
      }
    }

    if (!payment) {
      logger.error(
        {
          checkoutRequestId: callback.CheckoutRequestID,
          resultCode: callback.ResultCode
        },
        "M-Pesa callback did not match any payment"
      );
      return;
    }

    if (matchedByFallback) {
      logger.warn(
        {
          checkoutRequestId: callback.CheckoutRequestID,
          paymentId: payment.id
        },
        "Recovered M-Pesa callback using amount and phone fallback"
      );
    }

    if (callback.ResultCode === 0) {
      if (
        payment.paymentStatus === "paid" &&
        payment.orderStatus !== "cancelled"
      ) {
        await transaction`
          update payments
          set
            merchant_request_id = ${callback.MerchantRequestID},
            checkout_request_id = ${callback.CheckoutRequestID},
            provider_reference = coalesce(
              provider_reference,
              ${receipt ? String(receipt) : null}
            ),
            provider_payload = ${providerPayload}::jsonb,
            provider_query_status = 'paid',
            provider_queried_at = now(),
            updated_at = now()
          where id = ${payment.id}::uuid
        `;
        logger.info(
          {
            checkoutRequestId: callback.CheckoutRequestID,
            paymentId: payment.id
          },
          "Ignored replayed successful M-Pesa callback"
        );
        return;
      }

      let inventoryRecoveryComplete = true;

      if (payment.orderStatus === "cancelled") {
        const lines = await transaction<
          {
            productId: string;
            quantity: number;
            activeReservation: number;
          }[]
        >`
          select
            oi.product_id::text as "productId",
            oi.quantity,
            coalesce(movements.active_reservation, 0)::int as "activeReservation"
          from order_items oi
          left join lateral (
            select coalesce(
              sum(
                case
                  when im.type = 'reservation' then im.quantity
                  when im.type = 'release' then -im.quantity
                  else 0
                end
              ),
              0
            ) as active_reservation
            from inventory_movements im
            where im.order_id = oi.order_id
              and im.product_id = oi.product_id
          ) movements on true
          where oi.order_id = ${payment.orderId}::uuid
        `;

        for (const line of lines) {
          const restoreQuantity = Math.max(
            line.quantity - Math.max(line.activeReservation, 0),
            0
          );
          if (restoreQuantity <= 0) continue;

          const [updatedProduct] = await transaction<
            { stockQuantity: number; reservedQuantity: number }[]
          >`
            update products
            set
              reserved_quantity = reserved_quantity + ${restoreQuantity},
              updated_at = now()
            where id = ${line.productId}::uuid
              and stock_quantity - reserved_quantity >= ${restoreQuantity}
            returning
              stock_quantity as "stockQuantity",
              reserved_quantity as "reservedQuantity"
          `;

          if (!updatedProduct) {
            inventoryRecoveryComplete = false;
            continue;
          }

          await transaction`
            insert into inventory_movements (
              product_id,
              order_id,
              type,
              quantity,
              balance_after,
              reason,
              actor_id
            )
            values (
              ${line.productId}::uuid,
              ${payment.orderId}::uuid,
              'reservation',
              ${restoreQuantity},
              ${updatedProduct.stockQuantity - updatedProduct.reservedQuantity},
              ${`Restored after successful M-Pesa callback for order ${payment.orderNumber}`},
              null
            )
          `;
        }
      }

      await transaction`
        update payments
        set
          status = 'paid',
          merchant_request_id = ${callback.MerchantRequestID},
          checkout_request_id = ${callback.CheckoutRequestID},
          provider_reference = ${receipt ? String(receipt) : null},
          provider_payload = ${providerPayload}::jsonb,
          provider_query_status = 'paid',
          provider_queried_at = now(),
          paid_at = coalesce(paid_at, now()),
          failure_reason = null,
          updated_at = now()
        where id = ${payment.id}::uuid
      `;

      const [updatedOrder] = await transaction<{ id: string }[]>`
        update orders
        set status = 'payment_confirmed', updated_at = now()
        where id = ${payment.orderId}::uuid
          and status in ('pending_payment', 'cancelled')
        returning id::text
      `;

      if (updatedOrder) {
        await recordOrderStatusTransition(
          transaction as unknown as typeof sql,
          {
            orderId: payment.orderId,
            previousStatus: payment.orderStatus as OrderStatus,
            nextStatus: "payment_confirmed",
            source: "daraja",
            reason: "M-Pesa payment confirmed by callback"
          }
        );
      }

      await transaction`
        insert into notification_events (
          order_id,
          type,
          audience,
          channel,
          status,
          payload
        )
        values (
          ${payment.orderId}::uuid,
          'mpesa_payment_confirmed',
          'customer',
          'internal',
          'pending',
          ${serializeDatabaseJson({
            orderNumber: payment.orderNumber,
            checkoutRequestId: callback.CheckoutRequestID,
            receipt: receipt ? String(receipt) : null,
            recovered: payment.orderStatus === "cancelled" || matchedByFallback
          })}::jsonb
        )
      `;

      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId: payment.orderId,
        type: "payment_confirmed"
      });

      if (!inventoryRecoveryComplete) {
        await transaction`
          insert into notification_events (
            order_id,
            type,
            audience,
            channel,
            status,
            payload
          )
          values (
            ${payment.orderId}::uuid,
            'mpesa_paid_inventory_attention',
            'operations',
            'internal',
            'pending',
            ${serializeDatabaseJson({
              orderNumber: payment.orderNumber,
              checkoutRequestId: callback.CheckoutRequestID
            })}::jsonb
          )
        `;
      }

      logger.info(
        {
          checkoutRequestId: callback.CheckoutRequestID,
          paymentId: payment.id,
          recovered: payment.orderStatus === "cancelled" || matchedByFallback,
          inventoryRecoveryComplete
        },
        "Reconciled successful M-Pesa callback"
      );
      return;
    }

    if (payment.paymentStatus === "paid") {
      logger.warn(
        {
          checkoutRequestId: callback.CheckoutRequestID,
          resultCode: callback.ResultCode,
          paymentId: payment.id
        },
        "Ignored failed M-Pesa callback for an already paid payment"
      );
      return;
    }

    if (payment.paymentStatus !== "failed") {
      await transaction`
        update payments
        set
          status = 'failed',
          merchant_request_id = ${callback.MerchantRequestID},
          checkout_request_id = ${callback.CheckoutRequestID},
          failure_reason = ${callback.ResultDesc},
          provider_payload = ${providerPayload}::jsonb,
          provider_query_status = 'failed',
          provider_queried_at = now(),
          updated_at = now()
        where id = ${payment.id}::uuid
      `;

      await transaction`
        insert into notification_events (
          order_id,
          type,
          audience,
          channel,
          status,
          payload
        )
        values (
          ${payment.orderId}::uuid,
          'mpesa_payment_failed',
          'operations',
          'internal',
          'pending',
          ${serializeDatabaseJson({
            orderNumber: payment.orderNumber,
            checkoutRequestId: callback.CheckoutRequestID,
            resultCode: callback.ResultCode,
            resultDesc: callback.ResultDesc
          })}::jsonb
        )
      `;

      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId: payment.orderId,
        type: "payment_failed"
      });
    }

    logger.info(
      {
        checkoutRequestId: callback.CheckoutRequestID,
        resultCode: callback.ResultCode,
        paymentId: payment.id
      },
      "Reconciled failed M-Pesa callback"
    );
  });

  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
