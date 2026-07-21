import { z } from "zod";

import { logger } from "@/lib/logger";
import { sql } from "@talomart/db";

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

function metadataValue(
  callback: z.infer<typeof callbackSchema>["Body"]["stkCallback"],
  name: string
) {
  return callback.CallbackMetadata?.Item.find((item) => item.Name === name)?.Value;
}

export async function POST(request: Request) {
  const payload = await request.json();
  const result = callbackSchema.safeParse(payload);
  if (!result.success) {
    logger.warn({ issues: result.error.issues }, "Rejected M-Pesa callback");
    return Response.json({ ResultCode: 1, ResultDesc: "Invalid payload" }, { status: 400 });
  }

  const callback = result.data.Body.stkCallback;
  const receipt = metadataValue(callback, "MpesaReceiptNumber");

  await sql.begin(async (transaction) => {
    const [payment] = await transaction<
      {
        id: string;
        orderId: string;
        paymentStatus: string;
        orderStatus: string;
        orderNumber: string;
      }[]
    >`
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

    if (!payment) {
      logger.warn(
        {
          checkoutRequestId: callback.CheckoutRequestID,
          resultCode: callback.ResultCode
        },
        "M-Pesa callback did not match any payment"
      );
      return;
    }

    if (callback.ResultCode === 0) {
      await transaction`
        update payments
        set
          status = 'paid',
          provider_reference = ${receipt ? String(receipt) : null},
          provider_payload = ${sql.json(payload)}::jsonb,
          paid_at = coalesce(paid_at, now()),
          failure_reason = null,
          updated_at = now()
        where id = ${payment.id}::uuid
      `;

      await transaction`
        update orders
        set status = 'payment_confirmed', updated_at = now()
        where id = ${payment.orderId}::uuid
          and status = 'pending_payment'
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
          'mpesa_payment_confirmed',
          'customer',
          'internal',
          'pending',
          ${JSON.stringify({
            orderNumber: payment.orderNumber,
            checkoutRequestId: callback.CheckoutRequestID,
            receipt: receipt ? String(receipt) : null
          })}::jsonb
        )
      `;

      return;
    }

    if (payment.paymentStatus !== "paid") {
      await transaction`
        update payments
        set
          status = 'failed',
          failure_reason = ${callback.ResultDesc},
          provider_payload = ${sql.json(payload)}::jsonb,
          updated_at = now()
        where id = ${payment.id}::uuid
      `;

      if (payment.orderStatus === "pending_payment") {
        const lines = await transaction<
          {
            productId: string;
            quantity: number;
            reservedQuantity: number;
            stockQuantity: number;
          }[]
        >`
          select
            oi.product_id::text as "productId",
            oi.quantity,
            p.reserved_quantity as "reservedQuantity",
            p.stock_quantity as "stockQuantity"
          from order_items oi
          inner join products p on p.id = oi.product_id
          where oi.order_id = ${payment.orderId}::uuid
          for update of p
        `;

        for (const line of lines) {
          const releaseQuantity = Math.min(line.quantity, line.reservedQuantity);
          if (releaseQuantity <= 0) continue;

          const [updatedProduct] = await transaction<
            { stockQuantity: number; reservedQuantity: number }[]
          >`
            update products
            set
              reserved_quantity = greatest(reserved_quantity - ${releaseQuantity}, 0),
              updated_at = now()
            where id = ${line.productId}::uuid
            returning
              stock_quantity as "stockQuantity",
              reserved_quantity as "reservedQuantity"
          `;

          if (updatedProduct) {
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
                'release',
                ${releaseQuantity},
                ${updatedProduct.stockQuantity - updatedProduct.reservedQuantity},
                ${`Released after failed M-Pesa payment for order ${payment.orderNumber}`},
                null
              )
            `;
          }
        }

        await transaction`
          update orders
          set status = 'cancelled', updated_at = now()
          where id = ${payment.orderId}::uuid
            and status = 'pending_payment'
        `;
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
          'mpesa_payment_failed',
          'operations',
          'internal',
          'pending',
          ${JSON.stringify({
            orderNumber: payment.orderNumber,
            checkoutRequestId: callback.CheckoutRequestID,
            resultCode: callback.ResultCode,
            resultDesc: callback.ResultDesc
          })}::jsonb
        )
      `;
    }

    logger.info(
      {
        checkoutRequestId: callback.CheckoutRequestID,
        resultCode: callback.ResultCode,
        paymentId: payment.id
      },
      "Reconciled M-Pesa callback"
    );
  });

  return Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
