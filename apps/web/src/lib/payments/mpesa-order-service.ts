import { serializeDatabaseJson } from "@/lib/database-json";
import { enqueueOrderEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import type { OrderStatus } from "@/lib/order-status";
import { recordOrderStatusTransition } from "@/lib/order-status-history";
import { sql } from "@talomart/db";

import type { MpesaStkQueryResult } from "./mpesa";

type AcceptedStkPush = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
};

export type MpesaOrderPaymentRecord = {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentId: string;
  paymentStatus: string;
  phone: string;
  amountMinor: number;
  attemptCount: number;
  lastInitiatedAt: string | null;
  paymentUpdatedAt: string;
  providerQueriedAt: string | null;
  providerQueryStatus: string | null;
  checkoutRequestId: string | null;
  failureReason: string | null;
};

export async function findMpesaOrderPayment(orderId: string) {
  const [record] = await sql<MpesaOrderPaymentRecord[]>`
    select
      o.id::text as "orderId",
      o.order_number as "orderNumber",
      o.status as "orderStatus",
      p.id::text as "paymentId",
      p.status as "paymentStatus",
      coalesce(p.phone, o.phone) as phone,
      p.amount_minor as "amountMinor",
      p.attempt_count as "attemptCount",
      p.last_initiated_at::text as "lastInitiatedAt",
      p.created_at::text as "paymentUpdatedAt",
      p.provider_queried_at::text as "providerQueriedAt",
      p.provider_query_status as "providerQueryStatus",
      p.checkout_request_id as "checkoutRequestId",
      p.failure_reason as "failureReason"
    from orders o
    inner join lateral (
      select *
      from payments
      where order_id = o.id and method = 'mpesa'
      order by created_at desc
      limit 1
    ) p on true
    where o.id = ${orderId}::uuid
    limit 1
  `;

  return record ?? null;
}

export async function persistAcceptedMpesaStkPush(
  paymentId: string,
  stk: AcceptedStkPush
) {
  await sql`
    update payments
    set
      status = case
        when status in ('paid', 'refunded') then status
        else 'processing'
      end,
      merchant_request_id = ${stk.MerchantRequestID},
      checkout_request_id = ${stk.CheckoutRequestID},
      provider_query_status = null,
      provider_queried_at = null,
      provider_payload = ${serializeDatabaseJson(stk)}::jsonb,
      failure_reason = null,
      updated_at = now()
    where id = ${paymentId}::uuid
  `;
}

async function restoreOrderReservation(
  transaction: typeof sql,
  orderId: string,
  orderNumber: string,
  reason: string
) {
  let complete = true;
  const lines = await transaction<
    { productId: string; quantity: number; activeReservation: number }[]
  >`
    select
      oi.product_id::text as "productId",
      oi.quantity,
      coalesce(movements.active_reservation, 0)::int as "activeReservation"
    from order_items oi
    left join lateral (
      select coalesce(sum(
        case
          when im.type = 'reservation' then im.quantity
          when im.type = 'release' then -im.quantity
          else 0
        end
      ), 0) as active_reservation
      from inventory_movements im
      where im.order_id = oi.order_id
        and im.product_id = oi.product_id
    ) movements on true
    where oi.order_id = ${orderId}::uuid
  `;

  for (const line of lines) {
    const restoreQuantity = Math.max(
      line.quantity - Math.max(line.activeReservation, 0),
      0
    );
    if (restoreQuantity <= 0) continue;

    const [product] = await transaction<
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

    if (!product) {
      complete = false;
      continue;
    }

    await transaction`
      insert into inventory_movements (
        product_id, order_id, type, quantity, balance_after, reason, actor_id
      )
      values (
        ${line.productId}::uuid,
        ${orderId}::uuid,
        'reservation',
        ${restoreQuantity},
        ${product.stockQuantity - product.reservedQuantity},
        ${reason},
        null
      )
    `;
  }

  if (!complete) {
    await transaction`
      insert into notification_events (
        order_id, type, audience, channel, status, payload
      )
      values (
        ${orderId}::uuid,
        'mpesa_paid_inventory_attention',
        'operations',
        'internal',
        'pending',
        ${serializeDatabaseJson({ orderNumber, source: "status_query" })}::jsonb
      )
    `;
  }
}

export async function confirmMpesaPaymentFromQuery({
  orderId,
  paymentId,
  checkoutRequestId,
  query
}: {
  orderId: string;
  paymentId: string;
  checkoutRequestId: string;
  query: MpesaStkQueryResult;
}) {
  await sql.begin(async (transaction) => {
    const [record] = await transaction<
      {
        paymentStatus: string;
        orderStatus: string;
        orderNumber: string;
      }[]
    >`
      select
        p.status as "paymentStatus",
        o.status as "orderStatus",
        o.order_number as "orderNumber"
      from payments p
      inner join orders o on o.id = p.order_id
      where p.id = ${paymentId}::uuid
        and o.id = ${orderId}::uuid
      for update of p, o
    `;

    if (!record || record.paymentStatus === "paid") return;

    if (record.orderStatus === "cancelled") {
      await restoreOrderReservation(
        transaction as unknown as typeof sql,
        orderId,
        record.orderNumber,
        `Restored after successful M-Pesa status query for order ${record.orderNumber}`
      );
    }

    await transaction`
      update payments
      set
        status = 'paid',
        checkout_request_id = ${checkoutRequestId},
        provider_query_status = 'paid',
        provider_queried_at = now(),
        provider_payload = coalesce(provider_payload, '{}'::jsonb) ||
          jsonb_build_object(
            'statusQuery', ${serializeDatabaseJson(query.payload)}::jsonb,
            'statusQueryAt', now()
          ),
        paid_at = coalesce(paid_at, now()),
        failure_reason = null,
        updated_at = now()
      where id = ${paymentId}::uuid
    `;

    const [updatedOrder] = await transaction<{ id: string }[]>`
      update orders
      set status = 'payment_confirmed', updated_at = now()
      where id = ${orderId}::uuid
        and status in ('pending_payment', 'cancelled')
      returning id::text
    `;

    if (updatedOrder) {
      await recordOrderStatusTransition(
        transaction as unknown as typeof sql,
        {
          orderId,
          previousStatus: record.orderStatus as OrderStatus,
          nextStatus: "payment_confirmed",
          source: "daraja",
          reason: "M-Pesa payment confirmed by status query"
        }
      );
    }

    await transaction`
      insert into notification_events (
        order_id, type, audience, channel, status, payload
      )
      values (
        ${orderId}::uuid,
        'mpesa_payment_confirmed',
        'customer',
        'internal',
        'pending',
        ${serializeDatabaseJson({
          orderNumber: record.orderNumber,
          checkoutRequestId,
          source: "status_query"
        })}::jsonb
      )
    `;

    await enqueueOrderEmail(transaction as unknown as typeof sql, {
      orderId,
      type: "payment_confirmed"
    });
  });
}

export async function recordMpesaQueryResult(
  paymentId: string,
  query: MpesaStkQueryResult
) {
  await sql`
    update payments
    set
      status = case
        when status = 'paid' then status
        when ${query.status} = 'failed' then 'failed'::payment_status
        else status
      end,
      provider_query_status = ${query.status},
      provider_queried_at = now(),
      provider_payload = coalesce(provider_payload, '{}'::jsonb) ||
        jsonb_build_object(
          'statusQuery', ${serializeDatabaseJson(query.payload)}::jsonb,
          'statusQueryAt', now()
        ),
      failure_reason = case
        when ${query.status} = 'failed' then ${query.resultDescription}
        else failure_reason
      end,
      updated_at = now()
    where id = ${paymentId}::uuid
  `;
}

export async function claimMpesaStatusQuery(paymentId: string) {
  const [claimed] = await sql<{ id: string }[]>`
    update payments
    set provider_queried_at = now()
    where id = ${paymentId}::uuid
      and (
        provider_queried_at is null
        or provider_queried_at < now() - interval '12 seconds'
      )
    returning id::text
  `;

  return Boolean(claimed);
}

export async function expireAbandonedMpesaOrder(orderId: string) {
  return sql.begin(async (transaction) => {
    const [record] = await transaction<
      {
        paymentId: string;
        orderNumber: string;
        paymentStatus: string;
        orderStatus: string;
      }[]
    >`
      select
        p.id::text as "paymentId",
        o.order_number as "orderNumber",
        p.status as "paymentStatus",
        o.status as "orderStatus"
      from payments p
      inner join orders o on o.id = p.order_id
      where o.id = ${orderId}::uuid
        and p.method = 'mpesa'
        and o.status = 'pending_payment'
        and p.status <> 'paid'
        and coalesce(p.last_initiated_at, p.created_at, o.placed_at)
          <= now() - interval '10 minutes'
      order by p.created_at desc
      limit 1
      for update of p, o
    `;

    if (!record) return false;

    const lines = await transaction<
      {
        productId: string;
        activeReservation: number;
        reservedQuantity: number;
        stockQuantity: number;
      }[]
    >`
      select
        products_for_order.product_id::text as "productId",
        greatest(coalesce(movements.active_reservation, 0), 0)::int as "activeReservation",
        p.reserved_quantity as "reservedQuantity",
        p.stock_quantity as "stockQuantity"
      from (
        select distinct product_id
        from order_items
        where order_id = ${orderId}::uuid
      ) products_for_order
      inner join products p on p.id = products_for_order.product_id
      left join lateral (
        select coalesce(sum(
          case
            when im.type = 'reservation' then im.quantity
            when im.type = 'release' then -im.quantity
            else 0
          end
        ), 0) as active_reservation
        from inventory_movements im
        where im.order_id = ${orderId}::uuid
          and im.product_id = products_for_order.product_id
      ) movements on true
      for update of p
    `;

    for (const line of lines) {
      const releaseQuantity = Math.min(
        line.activeReservation,
        line.reservedQuantity
      );
      if (releaseQuantity <= 0) continue;

      const [product] = await transaction<
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

      if (product) {
        await transaction`
          insert into inventory_movements (
            product_id, order_id, type, quantity, balance_after, reason, actor_id
          )
          values (
            ${line.productId}::uuid,
            ${orderId}::uuid,
            'release',
            ${releaseQuantity},
            ${product.stockQuantity - product.reservedQuantity},
            ${`Released after abandoned M-Pesa request for order ${record.orderNumber}`},
            null
          )
        `;
      }
    }

    await transaction`
      update payments
      set
        status = 'failed',
        provider_query_status = 'abandoned',
        failure_reason = 'M-Pesa payment request expired before confirmation.',
        updated_at = now()
      where id = ${record.paymentId}::uuid
        and status <> 'paid'
    `;

    const [cancelled] = await transaction<{ id: string }[]>`
      update orders
      set status = 'cancelled', updated_at = now()
      where id = ${orderId}::uuid
        and status = 'pending_payment'
      returning id::text
    `;

    if (cancelled) {
      await recordOrderStatusTransition(
        transaction as unknown as typeof sql,
        {
          orderId,
          previousStatus: record.orderStatus as OrderStatus,
          nextStatus: "cancelled",
          source: "system",
          reason: "M-Pesa payment request expired before confirmation"
        }
      );

      await transaction`
        insert into notification_events (
          order_id, type, audience, channel, status, payload
        )
        values (
          ${orderId}::uuid,
          'mpesa_payment_abandoned',
          'operations',
          'internal',
          'pending',
          ${serializeDatabaseJson({ orderNumber: record.orderNumber })}::jsonb
        )
      `;
      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId,
        type: "order_cancelled"
      });
      logger.info({ orderId, orderNumber: record.orderNumber }, "Expired abandoned M-Pesa order");
    }

    return Boolean(cancelled);
  });
}

export async function expireStaleMpesaOrders(limit = 20) {
  const records = await sql<{ orderId: string }[]>`
    select distinct on (o.id) o.id::text as "orderId"
    from orders o
    inner join payments p on p.order_id = o.id
    where o.status = 'pending_payment'
      and p.method = 'mpesa'
      and p.status <> 'paid'
      and coalesce(p.last_initiated_at, p.created_at, o.placed_at)
        <= now() - interval '10 minutes'
    order by o.id, p.created_at desc
    limit ${limit}
  `;

  let expired = 0;
  for (const record of records) {
    if (await expireAbandonedMpesaOrder(record.orderId)) expired += 1;
  }
  return expired;
}
