import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import {
  deriveCustomerAccountScope,
  GUEST_ACCOUNT_SCOPE
} from "@/lib/browser-account-scope";
import { serializeDatabaseJson } from "@/lib/database-json";
import {
  enqueueOrderEmail,
  processPendingTransactionalEmails
} from "@/lib/email";
import { env } from "@/lib/env";
import {
  endpointRateLimitPolicies,
  enforceEndpointRateLimit
} from "@/lib/endpoint-rate-limit";
import { logger } from "@/lib/logger";
import {
  deriveGuestOrderAccessToken,
  GUEST_ORDER_ACCESS_MAX_AGE_SECONDS,
  guestOrderAccessCookieName,
  hashGuestOrderAccessToken
} from "@/lib/order-access";
import { recordOrderStatusTransition } from "@/lib/order-status-history";
import {
  getMpesaConfigurationStatus,
  initiateStkPush,
  normalizeMpesaPhone
} from "@/lib/payments/mpesa";
import { isMpesaSandboxTestSku } from "@/lib/payments/mpesa-sandbox-product";
import { expireStaleMpesaOrders } from "@/lib/payments/mpesa-order-service";
import { retryMpesaPersistence } from "@/lib/payments/mpesa-reconciliation";
import {
  LEGACY_SERVER_CART_COOKIE,
  serverCartCookieName
} from "@/lib/server-cart";
import { sql } from "@talomart/db";
import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        productId: z
          .string()
          .uuid("This product is unavailable. Add it again from the live catalogue."),
        quantity: z.number().int().min(1).max(99)
      })
    )
    .min(1, "Your cart is empty."),
  delivery: z.object({
    recipientName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
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
          previousStatus: "pending_payment",
          nextStatus: "cancelled",
          source: "system",
          reason
        }
      );
      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId,
        type: "order_cancelled"
      });
    }
  });
}

type AcceptedStkPush = Awaited<ReturnType<typeof initiateStkPush>>;

async function persistAcceptedStkPush(
  paymentId: string,
  stk: AcceptedStkPush
) {
  await retryMpesaPersistence(async () => {
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
        failure_reason = null,
        updated_at = now()
      where id = ${paymentId}::uuid
    `;
  });

  try {
    await sql`
      update payments
      set
        provider_payload = ${serializeDatabaseJson(stk)}::jsonb,
        updated_at = now()
      where id = ${paymentId}::uuid
    `;
  } catch (error) {
    logger.warn(
      {
        error,
        paymentId,
        checkoutRequestId: stk.CheckoutRequestID
      },
      "M-Pesa STK identifiers were saved but its audit payload was not"
    );
  }
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceEndpointRateLimit(
    request,
    endpointRateLimitPolicies.checkout
  );
  if (rateLimitResponse) return rateLimitResponse;

  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid checkout details.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }

  try {
    await expireStaleMpesaOrders(10);
  } catch (error) {
    logger.warn({ error }, "Could not sweep abandoned M-Pesa orders during checkout");
  }

  const mpesaConfiguration = getMpesaConfigurationStatus();

  if (parsed.data.paymentMethod === "mpesa") {
    if (!mpesaConfiguration.configured) {
      return Response.json(
        {
          error:
            "M-Pesa checkout is temporarily unavailable. Please choose Cash on Delivery."
        },
        { status: 503 }
      );
    }

    try {
      normalizeMpesaPhone(parsed.data.delivery.phone);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Enter a valid Kenyan M-Pesa phone number."
        },
        { status: 400 }
      );
    }
  }

  const session = await auth.api.getSession({
    headers: await headers()
  });
  const userId = session?.user.id ?? null;
  const cartScope = userId
    ? deriveCustomerAccountScope(userId, env.AUTH_SECRET)
    : GUEST_ACCOUNT_SCOPE;
  const guestToken = userId ? null : randomUUID();
  const orderNumber = makeOrderNumber();
  const checkoutIdempotencyKey = parsed.data.idempotencyKey ?? randomUUID();
  const guestAccessToken = userId
    ? null
    : deriveGuestOrderAccessToken({
        checkoutIdempotencyKey,
        orderNumber,
        secret: env.AUTH_SECRET
      });
  const guestAccessTokenHash = guestAccessToken
    ? hashGuestOrderAccessToken(guestAccessToken, env.AUTH_SECRET)
    : null;
  const guestAccessExpiresAt = guestAccessToken
    ? new Date(
        Date.now() + GUEST_ORDER_ACCESS_MAX_AGE_SECONDS * 1000
      ).toISOString()
    : null;

  try {
    const result = await sql.begin(async (transaction) => {
      await transaction`
        select pg_advisory_xact_lock(
          hashtextextended(${checkoutIdempotencyKey}, 0)
        )
      `;

      const [existingCheckout] = await transaction<
        {
          orderId: string;
          orderNumber: string;
          paymentId: string;
          paymentStatus: string;
          subtotalMinor: number;
          deliveryMinor: number;
          discountMinor: number;
          totalMinor: number;
          currency: string;
          paymentMethod: "mpesa" | "cash_on_delivery";
          merchantRequestId: string | null;
          checkoutRequestId: string | null;
          userId: string | null;
        }[]
      >`
        select
          o.id::text as "orderId",
          o.order_number as "orderNumber",
          p.id::text as "paymentId",
          p.status as "paymentStatus",
          o.subtotal_minor as "subtotalMinor",
          o.delivery_minor as "deliveryMinor",
          o.discount_minor as "discountMinor",
          o.total_minor as "totalMinor",
          o.currency,
          o.payment_method as "paymentMethod",
          p.merchant_request_id as "merchantRequestId",
          p.checkout_request_id as "checkoutRequestId",
          o.user_id as "userId"
        from payments p
        inner join orders o on o.id = p.order_id
        where p.idempotency_key = ${checkoutIdempotencyKey}
        limit 1
      `;

      if (existingCheckout) {
        const { userId: existingUserId, ...existingCheckoutResult } =
          existingCheckout;
        if (existingUserId !== userId) {
          throw new Error("This checkout request belongs to another session.");
        }

        const existingGuestAccessToken = userId
          ? null
          : deriveGuestOrderAccessToken({
              checkoutIdempotencyKey,
              orderNumber: existingCheckout.orderNumber,
              secret: env.AUTH_SECRET
            });

        return {
          ...existingCheckoutResult,
          guestAccessToken: existingGuestAccessToken,
          reused: true
        };
      }

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
      const isSandboxTestOrder =
        mpesaConfiguration.environment === "sandbox" &&
        orderLines.length > 0 &&
        orderLines.every((line) => isMpesaSandboxTestSku(line.product.sku));
      const deliveryMinor =
        isSandboxTestOrder || subtotalMinor >= 500_000 ? 0 : 35_000;
      const discountMinor = 0;
      const totalMinor = subtotalMinor + deliveryMinor - discountMinor;
      const customerEmail = userId
        ? session!.user.email.toLowerCase()
        : parsed.data.delivery.email.toLowerCase();

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
          customer_email,
          recipient_name,
          phone,
          county,
          town,
          delivery_address,
          customer_note,
          guest_access_token_hash,
          guest_access_expires_at
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
          ${customerEmail},
          ${parsed.data.delivery.recipientName},
          ${parsed.data.delivery.phone},
          ${parsed.data.delivery.county},
          ${parsed.data.delivery.town},
          ${parsed.data.delivery.deliveryAddress},
          ${parsed.data.delivery.customerNote || null},
          ${guestAccessTokenHash},
          ${guestAccessExpiresAt}
        )
        returning id::text, order_number as "orderNumber"
      `;

      if (!order) throw new Error("Could not create order.");

      await recordOrderStatusTransition(
        transaction as unknown as typeof sql,
        {
          orderId: order.id,
          previousStatus: null,
          nextStatus:
            parsed.data.paymentMethod === "cash_on_delivery"
              ? "processing"
              : "pending_payment",
          source: "checkout"
        }
      );

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
          customer_email,
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
          ${customerEmail},
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
          ${checkoutIdempotencyKey},
          ${parsed.data.delivery.phone}
        )
        returning id::text, status
      `;

      if (!payment) throw new Error("Could not create payment record.");

      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId: order.id,
        type: "order_confirmation"
      });

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
        paymentMethod: parsed.data.paymentMethod,
        merchantRequestId: null,
        checkoutRequestId: null,
        guestAccessToken,
        reused: false
      };
    });

    after(() =>
      processPendingTransactionalEmails().catch((error) => {
        logger.error({ error }, "Post-checkout email delivery sweep failed");
      })
    );

    let mpesa:
      | {
          initiated: boolean;
          customerMessage: string;
          checkoutRequestId?: string;
          persistencePending?: boolean;
        }
      | undefined;

    if (result.paymentMethod === "mpesa") {
      if (
        result.checkoutRequestId ||
        result.paymentStatus === "paid"
      ) {
        mpesa = {
          initiated: true,
          ...(result.checkoutRequestId
            ? { checkoutRequestId: result.checkoutRequestId }
            : {}),
          customerMessage:
            result.paymentStatus === "paid"
              ? "Payment has already been confirmed."
              : "The M-Pesa request is already being processed."
        };
      } else if (result.paymentStatus === "failed") {
        return Response.json(
          {
            error:
              "The previous M-Pesa attempt failed. Please submit checkout again to start a new request.",
            order: {
              orderId: result.orderId,
              orderNumber: result.orderNumber
            }
          },
          { status: 409 }
        );
      } else {
        const [claimedPayment] = await sql<{ id: string }[]>`
          update payments
          set
            status = 'processing',
            attempt_count = attempt_count + 1,
            last_initiated_at = now(),
            provider_query_status = null,
            provider_queried_at = null,
            updated_at = now()
          where id = ${result.paymentId}::uuid
            and (
              status = 'pending'
              or (
                status = 'processing'
                and checkout_request_id is null
                and updated_at < now() - interval '2 minutes'
              )
            )
          returning id::text
        `;

        if (!claimedPayment) {
          const [currentPayment] = await sql<
            { status: string; checkoutRequestId: string | null }[]
          >`
            select
              status,
              checkout_request_id as "checkoutRequestId"
            from payments
            where id = ${result.paymentId}::uuid
          `;

          if (currentPayment?.status === "failed") {
            return Response.json(
              {
                error:
                  "The M-Pesa request failed. Please submit checkout again to start a new request.",
                order: {
                  orderId: result.orderId,
                  orderNumber: result.orderNumber
                }
              },
              { status: 409 }
            );
          }

          result.paymentStatus = currentPayment?.status ?? result.paymentStatus;
          result.checkoutRequestId =
            currentPayment?.checkoutRequestId ?? result.checkoutRequestId;
          mpesa = {
            initiated: true,
            ...(currentPayment?.checkoutRequestId
              ? { checkoutRequestId: currentPayment.checkoutRequestId }
              : {}),
            customerMessage:
              currentPayment?.status === "paid"
                ? "Payment has already been confirmed."
                : "The M-Pesa request is already being processed."
          };
        } else {
          let stk: AcceptedStkPush;

          try {
            stk = await initiateStkPush({
              phone: parsed.data.delivery.phone,
              amountKes: Math.round(result.totalMinor / 100),
              orderNumber: result.orderNumber
            });
          } catch (error) {
            logger.error(
              { error, orderId: result.orderId },
              "M-Pesa rejected or did not receive the STK Push request"
            );
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
                and status <> 'paid'
            `;
            await releasePaymentReservations(
              result.orderId,
              `Released reservation after rejected M-Pesa initiation for order ${result.orderNumber}`
            );

            return Response.json(
              {
                error:
                  "M-Pesa did not accept the payment prompt. Please try again or choose Cash on delivery.",
                order: {
                  orderId: result.orderId,
                  orderNumber: result.orderNumber
                }
              },
              { status: 502 }
            );
          }

          let persistencePending = false;
          try {
            await persistAcceptedStkPush(result.paymentId, stk);
          } catch (error) {
            persistencePending = true;
            logger.error(
              {
                error,
                orderId: result.orderId,
                paymentId: result.paymentId,
                checkoutRequestId: stk.CheckoutRequestID
              },
              "M-Pesa accepted the STK Push but identifier persistence is pending"
            );
          }

          result.paymentStatus = "processing";
          result.merchantRequestId = stk.MerchantRequestID;
          result.checkoutRequestId = stk.CheckoutRequestID;
          mpesa = {
            initiated: true,
            checkoutRequestId: stk.CheckoutRequestID,
            customerMessage: stk.CustomerMessage,
            persistencePending
          };
        }
      }
    }

    const { guestAccessToken: accessToken, ...publicResult } = result;
    const response = NextResponse.json({
      order: {
        ...publicResult,
        subtotal: Math.round(result.subtotalMinor / 100),
        delivery: Math.round(result.deliveryMinor / 100),
        discount: Math.round(result.discountMinor / 100),
        total: Math.round(result.totalMinor / 100),
        mpesa
      }
    });
    response.cookies.delete(serverCartCookieName(cartScope));
    if (cartScope === GUEST_ACCOUNT_SCOPE) {
      response.cookies.delete(LEGACY_SERVER_CART_COOKIE);
    }
    if (accessToken) {
      response.cookies.set(
        guestOrderAccessCookieName(result.orderNumber, env.AUTH_SECRET),
        accessToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: env.NODE_ENV === "production",
          path: "/",
          maxAge: GUEST_ORDER_ACCESS_MAX_AGE_SECONDS
        }
      );
    }

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
