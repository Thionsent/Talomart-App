import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { initiateStkPush, isMpesaConfigured } from "@/lib/payments/mpesa";
import { SERVER_CART_COOKIE } from "@/lib/server-cart";
import { sql } from "@talomart/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99)
      })
    )
    .min(1, "Your cart is empty."),
  delivery: z.object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(9).max(30),
    county: z.string().trim().min(2).max(80),
    town: z.string().trim().min(2).max(80),
    deliveryAddress: z.string().trim().min(5).max(240),
    customerNote: z.string().trim().max(500).optional()
  }),
  paymentMethod: z.enum(["mpesa", "cash_on_delivery"])
});

function makeOrderNumber() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  return `TLM-${stamp}-${suffix}`;
}

async function releasePaymentReservations(orderId: string, reason: string) {
  await sql.begin(async (transaction) => {
    const lines = await transaction<
      {
        productId: string;
        quantity: number;
        productName: string;
        reservedQuantity: number;
        stockQuantity: number;
      }[]
    >`
      select
        oi.product_id::text as "productId",
        oi.quantity,
        oi.product_name as "productName",
        p.reserved_quantity as "reservedQuantity",
        p.stock_quantity as "stockQuantity"
      from order_items oi
      inner join products p on p.id = oi.product_id
      where oi.order_id = ${orderId}::uuid
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
            ${orderId}::uuid,
            'release',
            ${releaseQuantity},
            ${updatedProduct.stockQuantity - updatedProduct.reservedQuantity},
            ${reason},
            null
          )
        `;
      }
    }

    await transaction`
      update orders
      set status = 'cancelled', updated_at = now()
      where id = ${orderId}::uuid
        and status = 'pending_payment'
    `;
  });
}

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid checkout details.",
        issues: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const session = await auth.api.getSession({
    headers: await headers()
  });
  const userId = session?.user.id ?? null;
  const guestToken = userId ? null : randomUUID();
  const orderNumber = makeOrderNumber();

  try {
    const result = await sql.begin(async (transaction) => {
      const productIds = parsed.data.items.map((item) => item.productId);
      const products = await transaction<
        {
          id: string;
          sku: string;
          name: string;
          priceMinor: number;
          stockQuantity: number;
          reservedQuantity: number;
        }[]
      >`
        select
          id::text,
          sku,
          name,
          price_minor as "priceMinor",
          stock_quantity as "stockQuantity",
          reserved_quantity as "reservedQuantity"
        from products
        where id = any(${productIds}::uuid[])
          and is_active = true
        for update
      `;

      if (products.length !== parsed.data.items.length) {
        throw new Error("Some cart items are no longer available.");
      }

      const productsById = new Map(products.map((product) => [product.id, product]));
      const orderLines = parsed.data.items.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new Error("A cart item is no longer available.");
        }

        const available = product.stockQuantity - product.reservedQuantity;
        if (available < item.quantity) {
          throw new Error(`${product.name} has only ${available} units available.`);
        }

        return {
          product,
          quantity: item.quantity,
          lineTotalMinor: product.priceMinor * item.quantity
        };
      });

      const subtotalMinor = orderLines.reduce(
        (sum, line) => sum + line.lineTotalMinor,
        0
      );
      const deliveryMinor = subtotalMinor >= 500_000 ? 0 : 35_000;
      const discountMinor = 0;
      const totalMinor = subtotalMinor + deliveryMinor - discountMinor;

      const [cart] = await transaction<{ id: string }[]>`
        insert into carts (user_id, guest_token, expires_at)
        values (
          ${userId},
          ${guestToken},
          now() + interval '14 days'
        )
        returning id::text
      `;

      if (!cart) throw new Error("Could not create checkout cart.");

      for (const line of orderLines) {
        await transaction`
          insert into cart_items (cart_id, product_id, quantity)
          values (${cart.id}::uuid, ${line.product.id}::uuid, ${line.quantity})
        `;
      }

      const [order] = await transaction<{ id: string; orderNumber: string }[]>`
        insert into orders (
          order_number,
          user_id,
          status,
          payment_method,
          subtotal_minor,
          delivery_minor,
          discount_minor,
          total_minor,
          currency,
          recipient_name,
          phone,
          county,
          town,
          delivery_address,
          customer_note
        )
        values (
          ${orderNumber},
          ${userId},
          ${parsed.data.paymentMethod === "cash_on_delivery" ? "processing" : "pending_payment"},
          ${parsed.data.paymentMethod},
          ${subtotalMinor},
          ${deliveryMinor},
          ${discountMinor},
          ${totalMinor},
          'KES',
          ${parsed.data.delivery.recipientName},
          ${parsed.data.delivery.phone},
          ${parsed.data.delivery.county},
          ${parsed.data.delivery.town},
          ${parsed.data.delivery.deliveryAddress},
          ${parsed.data.delivery.customerNote || null}
        )
        returning id::text, order_number as "orderNumber"
      `;

      if (!order) throw new Error("Could not create order.");

      await transaction`
        insert into checkout_sessions (
          cart_id,
          user_id,
          guest_token,
          status,
          payment_method,
          subtotal_minor,
          delivery_minor,
          discount_minor,
          total_minor,
          currency,
          recipient_name,
          phone,
          county,
          town,
          delivery_address,
          customer_note,
          converted_order_id,
          expires_at
        )
        values (
          ${cart.id}::uuid,
          ${userId},
          ${guestToken},
          'converted',
          ${parsed.data.paymentMethod},
          ${subtotalMinor},
          ${deliveryMinor},
          ${discountMinor},
          ${totalMinor},
          'KES',
          ${parsed.data.delivery.recipientName},
          ${parsed.data.delivery.phone},
          ${parsed.data.delivery.county},
          ${parsed.data.delivery.town},
          ${parsed.data.delivery.deliveryAddress},
          ${parsed.data.delivery.customerNote || null},
          ${order.id}::uuid,
          now() + interval '14 days'
        )
      `;

      for (const line of orderLines) {
        await transaction`
          insert into order_items (
            order_id,
            product_id,
            sku,
            product_name,
            unit_price_minor,
            quantity,
            line_total_minor
          )
          values (
            ${order.id}::uuid,
            ${line.product.id}::uuid,
            ${line.product.sku},
            ${line.product.name},
            ${line.product.priceMinor},
            ${line.quantity},
            ${line.lineTotalMinor}
          )
        `;

        const [updatedProduct] = await transaction<
          { stockQuantity: number; reservedQuantity: number }[]
        >`
          update products
          set
            reserved_quantity = reserved_quantity + ${line.quantity},
            updated_at = now()
          where id = ${line.product.id}::uuid
            and stock_quantity - reserved_quantity >= ${line.quantity}
          returning
            stock_quantity as "stockQuantity",
            reserved_quantity as "reservedQuantity"
        `;

        if (!updatedProduct) {
          throw new Error(`${line.product.name} is no longer available.`);
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
            ${line.product.id}::uuid,
            ${order.id}::uuid,
            'reservation',
            ${line.quantity},
            ${updatedProduct.stockQuantity - updatedProduct.reservedQuantity},
            ${`Reserved for order ${order.orderNumber}`},
            ${userId}
          )
        `;
      }

      const [payment] = await transaction<{ id: string; status: string }[]>`
        insert into payments (
          order_id,
          method,
          status,
          amount_minor,
          currency,
          idempotency_key,
          phone
        )
        values (
          ${order.id}::uuid,
          ${parsed.data.paymentMethod},
          'pending',
          ${totalMinor},
          'KES',
          ${randomUUID()},
          ${parsed.data.delivery.phone}
        )
        returning id::text, status
      `;

      if (!payment) throw new Error("Could not create payment record.");

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
          ${order.id}::uuid,
          'order_placed',
          'customer',
          'internal',
          'pending',
          ${JSON.stringify({
            orderNumber: order.orderNumber,
            paymentMethod: parsed.data.paymentMethod,
            totalMinor,
            recipientName: parsed.data.delivery.recipientName,
            phone: parsed.data.delivery.phone
          })}::jsonb
        )
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
          ${order.id}::uuid,
          'admin_order_created',
          'operations',
          'internal',
          'pending',
          ${JSON.stringify({
            orderNumber: order.orderNumber,
            paymentMethod: parsed.data.paymentMethod,
            totalMinor,
            itemCount: orderLines.length
          })}::jsonb
        )
      `;

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: payment.id,
        paymentStatus: payment.status,
        subtotalMinor,
        deliveryMinor,
        discountMinor,
        totalMinor,
        currency: "KES",
        paymentMethod: parsed.data.paymentMethod
      };
    });

    let mpesa:
      | {
          initiated: boolean;
          customerMessage: string;
          checkoutRequestId?: string;
          setupRequired?: boolean;
        }
      | undefined;

    if (result.paymentMethod === "mpesa") {
      if (!isMpesaConfigured()) {
        mpesa = {
          initiated: false,
          setupRequired: true,
          customerMessage:
            "M-Pesa STK Push is not configured yet. Your order is saved as pending payment."
        };
      } else {
        try {
          const stk = await initiateStkPush({
            phone: parsed.data.delivery.phone,
            amountKes: Math.round(result.totalMinor / 100),
            orderNumber: result.orderNumber
          });

          await sql`
            update payments
            set
              status = 'processing',
              merchant_request_id = ${stk.MerchantRequestID},
              checkout_request_id = ${stk.CheckoutRequestID},
              provider_payload = ${sql.json(stk)}::jsonb,
              updated_at = now()
            where id = ${result.paymentId}::uuid
          `;

          result.paymentStatus = "processing";
          mpesa = {
            initiated: true,
            checkoutRequestId: stk.CheckoutRequestID,
            customerMessage: stk.CustomerMessage
          };
        } catch (error) {
          logger.error({ error, orderId: result.orderId }, "M-Pesa STK Push failed");
          const failureReason =
            error instanceof Error
              ? error.message
              : "M-Pesa STK Push request failed";

          await sql`
            update payments
            set
              status = 'failed',
              failure_reason = ${failureReason},
              updated_at = now()
            where id = ${result.paymentId}::uuid
          `;
          await releasePaymentReservations(
            result.orderId,
            `Released reservation after failed M-Pesa initiation for order ${result.orderNumber}`
          );

          return Response.json(
            {
              error:
                "We could not send the M-Pesa prompt. Please try again or choose Cash on delivery.",
              order: {
                orderId: result.orderId,
                orderNumber: result.orderNumber
              }
            },
            { status: 502 }
          );
        }
      }
    }

    const response = NextResponse.json({
      order: {
        ...result,
        subtotal: Math.round(result.subtotalMinor / 100),
        delivery: Math.round(result.deliveryMinor / 100),
        discount: Math.round(result.discountMinor / 100),
        total: Math.round(result.totalMinor / 100),
        mpesa
      }
    });
    response.cookies.delete(SERVER_CART_COOKIE);

    return response;
  } catch (error) {
    logger.error({ error }, "Checkout failed");
    const message =
      error instanceof Error && error.message
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String(error.message)
          : "Checkout failed. Please try again.";

    return Response.json(
      {
        error: message || "Checkout failed. Please try again."
      },
      { status: 409 }
    );
  }
}
