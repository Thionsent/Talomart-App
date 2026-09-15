import { createHash } from "node:crypto";

import { sql } from "@talomart/db";
import { Resend } from "resend";

import { env } from "./env";
import { logger } from "./logger";

const MAX_EMAIL_ATTEMPTS = 5;

export const orderEmailTypes = [
  "order_confirmation",
  "payment_confirmed",
  "payment_failed",
  "order_dispatched",
  "order_delivered",
  "order_cancelled",
  "payment_refunded"
] as const;

export type OrderEmailType = (typeof orderEmailTypes)[number];

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export type OrderEmailModel = {
  orderNumber: string;
  recipientName: string;
  email: string | null;
  totalMinor: number;
  currency: string;
  paymentMethod: "mpesa" | "cash_on_delivery";
  paymentStatus: string;
  courierName: string | null;
  trackingNumber: string | null;
  reason: string | null;
  items: { name: string; quantity: number }[];
};

type QueuedEmailPayload = {
  subject: string;
  text: string;
  html: string;
};

type SqlRunner = typeof sql;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character] ?? character
  );
}

function safeResetUrl(value: string) {
  const url = new URL(value);
  const localDevelopmentUrl =
    url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);

  if (url.protocol !== "https:" && !localDevelopmentUrl) {
    throw new Error("Password reset links must use HTTPS.");
  }

  return url.toString();
}

function money(minor: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Math.round(minor / 100));
}

function storefrontUrl(path: string) {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

function emailFrame({
  eyebrow,
  heading,
  body,
  buttonLabel,
  buttonUrl,
  details = []
}: {
  eyebrow: string;
  heading: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  details?: string[];
}) {
  const detailHtml = details.length
    ? `<div style="margin:24px 0;border-radius:14px;background:#f6f8f7;padding:18px">${details
        .map((detail) => `<p style="margin:6px 0;color:#344054;font-size:14px">${escapeHtml(detail)}</p>`)
        .join("")}</div>`
    : "";
  const buttonHtml = buttonLabel && buttonUrl
    ? `<p style="margin:26px 0"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;border-radius:12px;background:#11a245;padding:14px 22px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none">${escapeHtml(buttonLabel)}</a></p>`
    : "";

  return `
    <div style="margin:0;background:#f7f5ee;padding:32px 16px;font-family:Arial,sans-serif;color:#071b42">
      <div style="max-width:600px;margin:0 auto;border:1px solid #e4e8e5;border-radius:20px;background:#ffffff;padding:32px">
        <p style="margin:0;color:#11a245;font-size:12px;font-weight:800;letter-spacing:2px">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2">${escapeHtml(heading)}</h1>
        <p style="margin:18px 0 0;color:#52605a;font-size:15px;line-height:1.7">${escapeHtml(body)}</p>
        ${detailHtml}
        ${buttonHtml}
        <p style="margin:28px 0 0;border-top:1px solid #eaecf0;padding-top:18px;color:#667085;font-size:12px;line-height:1.7">This is a transactional message about your Talomart account or order. Please do not share payment or account credentials by email.</p>
      </div>
    </div>
  `.trim();
}

export function createPasswordResetEmail({
  name,
  resetUrl
}: {
  name: string;
  resetUrl: string;
}) {
  const customerName = name.trim() || "Talomart customer";
  const verifiedUrl = safeResetUrl(resetUrl);

  return {
    subject: "Reset your Talomart password",
    text: [
      `Hello ${customerName},`,
      "",
      "Use the secure link below to choose a new Talomart password:",
      verifiedUrl,
      "",
      "This link expires in one hour and can only be used once.",
      "If you did not request a password reset, you can safely ignore this email."
    ].join("\n"),
    html: emailFrame({
      eyebrow: "TALOMART STORES",
      heading: "Reset your password",
      body: `Hello ${customerName}, use the secure button below to choose a new password. This single-use link expires in one hour.`,
      buttonLabel: "Choose a new password",
      buttonUrl: verifiedUrl
    })
  };
}

export function createOrderEmail(
  type: OrderEmailType,
  order: OrderEmailModel
): EmailContent {
  const trackUrl = storefrontUrl(`/track?order=${encodeURIComponent(order.orderNumber)}`);
  const itemSummary = order.items.length
    ? order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")
    : "Order items";
  const commonDetails = [
    `Order: ${order.orderNumber}`,
    `Total: ${money(order.totalMinor, order.currency)}`,
    `Items: ${itemSummary}`
  ];
  const customerName = order.recipientName.trim() || "Talomart customer";
  const definitions: Record<
    OrderEmailType,
    { subject: string; heading: string; body: string; details?: string[] }
  > = {
    order_confirmation: {
      subject: `We received order ${order.orderNumber}`,
      heading: "Your order is confirmed",
      body:
        order.paymentMethod === "mpesa"
          ? `Hello ${customerName}, we received your order and are confirming its M-Pesa payment.`
          : `Hello ${customerName}, we received your Cash on Delivery order and will prepare it for fulfilment.`
    },
    payment_confirmed: {
      subject: `Payment confirmed for ${order.orderNumber}`,
      heading: "Your payment is confirmed",
      body: `Hello ${customerName}, your payment has been recorded successfully. We can now continue preparing your order.`
    },
    payment_failed: {
      subject: `Payment update for ${order.orderNumber}`,
      heading: "Your payment was not completed",
      body: `Hello ${customerName}, we could not confirm payment for this order. No successful payment has been recorded. Please retry from Talomart or contact support if money left your account.`
    },
    order_dispatched: {
      subject: `${order.orderNumber} is on the way`,
      heading: "Your order has been dispatched",
      body: `Hello ${customerName}, your order has left our fulfilment team and is on its way to you.`,
      details: [
        ...commonDetails,
        ...(order.courierName ? [`Courier: ${order.courierName}`] : []),
        ...(order.trackingNumber ? [`Tracking number: ${order.trackingNumber}`] : [])
      ]
    },
    order_delivered: {
      subject: `${order.orderNumber} has been delivered`,
      heading: "Your order has been delivered",
      body: `Hello ${customerName}, our records show that your order was delivered. Thank you for shopping with Talomart.`
    },
    order_cancelled: {
      subject: `${order.orderNumber} was cancelled`,
      heading: "Your order was cancelled",
      body: `Hello ${customerName}, this order has been cancelled.${order.reason ? ` Reason: ${order.reason}` : ""}`
    },
    payment_refunded: {
      subject: `Refund recorded for ${order.orderNumber}`,
      heading: "Your refund has been recorded",
      body: `Hello ${customerName}, we recorded a refund for this order.${order.reason ? ` Reason: ${order.reason}` : ""} The time before funds appear depends on the payment provider.`
    }
  };
  const definition = definitions[type];
  const details = definition.details ?? commonDetails;

  return {
    subject: definition.subject,
    text: [
      definition.heading,
      "",
      definition.body,
      "",
      ...details,
      "",
      `Track your order: ${trackUrl}`
    ].join("\n"),
    html: emailFrame({
      eyebrow: "TALOMART ORDER UPDATE",
      heading: definition.heading,
      body: definition.body,
      details,
      buttonLabel: "Track your order",
      buttonUrl: trackUrl
    })
  };
}

export function orderEmailDedupeKey(orderId: string, type: OrderEmailType) {
  return `order/${orderId}/${type}`;
}

function parseQueuedEmailPayload(value: unknown): QueuedEmailPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Email content is missing from the notification event.");
  }
  const payload = value as Partial<QueuedEmailPayload>;
  if (!payload.subject || !payload.text || !payload.html) {
    throw new Error("Email content is incomplete in the notification event.");
  }
  return { subject: payload.subject, text: payload.text, html: payload.html };
}

async function sendWithResend({
  to,
  content,
  idempotencyKey,
  category
}: {
  to: string;
  content: EmailContent;
  idempotencyKey: string;
  category: string;
}) {
  if (!env.RESEND_API_KEY) {
    throw new Error("Transactional email is not configured. Add RESEND_API_KEY.");
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send(
    {
      from: env.EMAIL_FROM,
      to: [to],
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: [{ name: "category", value: category.replace(/[^a-z0-9_-]/gi, "_") }]
    },
    { idempotencyKey }
  );

  if (error || !data?.id) {
    throw new Error(error?.message ?? "The email provider returned no message ID.");
  }

  return data.id;
}

async function loadOrderEmailModel(runner: SqlRunner, orderId: string) {
  const [order] = await runner<OrderEmailModel[]>`
    select
      o.order_number as "orderNumber",
      o.recipient_name as "recipientName",
      coalesce(o.customer_email, u.email) as email,
      o.total_minor as "totalMinor",
      o.currency,
      o.payment_method as "paymentMethod",
      coalesce(p.status, 'pending') as "paymentStatus",
      f.courier_name as "courierName",
      f.tracking_number as "trackingNumber",
      h.reason,
      coalesce(i.items, '[]'::jsonb) as items
    from orders o
    left join "user" u on u.id = o.user_id
    left join lateral (
      select status
      from payments
      where order_id = o.id
      order by created_at desc
      limit 1
    ) p on true
    left join lateral (
      select courier_name, tracking_number
      from fulfillments
      where order_id = o.id
      order by created_at desc
      limit 1
    ) f on true
    left join lateral (
      select reason
      from order_status_history
      where order_id = o.id and reason is not null
      order by created_at desc
      limit 1
    ) h on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object('name', product_name, 'quantity', quantity)
        order by created_at
      ) as items
      from order_items
      where order_id = o.id
    ) i on true
    where o.id = ${orderId}::uuid
    limit 1
  `;

  return order ?? null;
}

export async function enqueueOrderEmail(
  runner: SqlRunner,
  { orderId, type }: { orderId: string; type: OrderEmailType }
) {
  const order = await loadOrderEmailModel(runner, orderId);
  if (!order) throw new Error("Cannot queue email for an unknown order.");

  const dedupeKey = orderEmailDedupeKey(orderId, type);
  const content = createOrderEmail(type, order);
  const [event] = await runner<{ id: string }[]>`
    insert into notification_events (
      order_id,
      type,
      audience,
      channel,
      status,
      dedupe_key,
      recipient_email,
      payload
    )
    values (
      ${orderId}::uuid,
      ${type},
      'customer',
      'email',
      ${order.email ? "pending" : "skipped"},
      ${dedupeKey},
      ${order.email},
      ${JSON.stringify(content)}::jsonb
    )
    on conflict (dedupe_key) do nothing
    returning id::text
  `;

  return event?.id ?? null;
}

async function claimEmail(eventId: string) {
  const [event] = await sql<
    {
      id: string;
      type: string;
      recipientEmail: string;
      dedupeKey: string;
      attemptCount: number;
      payload: unknown;
    }[]
  >`
    update notification_events
    set
      status = 'processing',
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      updated_at = now()
    where id = ${eventId}::uuid
      and channel = 'email'
      and recipient_email is not null
      and attempt_count < ${MAX_EMAIL_ATTEMPTS}
      and (
        status = 'pending'
        or (status = 'retrying' and coalesce(next_attempt_at, now()) <= now())
        or (status = 'processing' and last_attempt_at < now() - interval '10 minutes')
      )
    returning
      id::text,
      type,
      recipient_email as "recipientEmail",
      dedupe_key as "dedupeKey",
      attempt_count as "attemptCount",
      payload
  `;

  return event ?? null;
}

export async function deliverTransactionalEmail(eventId: string) {
  const event = await claimEmail(eventId);
  if (!event) return false;

  try {
    const content = parseQueuedEmailPayload(event.payload);
    const providerMessageId = await sendWithResend({
      to: event.recipientEmail,
      content,
      idempotencyKey: event.dedupeKey,
      category: event.type
    });

    await sql`
      update notification_events
      set
        status = 'sent',
        provider_message_id = ${providerMessageId},
        processed_at = coalesce(processed_at, now()),
        next_attempt_at = null,
        last_error = null,
        updated_at = now()
      where id = ${event.id}::uuid
    `;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    const retryable = event.attemptCount < MAX_EMAIL_ATTEMPTS;
    const delaySeconds = Math.min(30 * 2 ** (event.attemptCount - 1), 30 * 60);
    await sql`
      update notification_events
      set
        status = ${retryable ? "retrying" : "failed"},
        next_attempt_at = case
          when ${retryable} then now() + (${delaySeconds} * interval '1 second')
          else null
        end,
        last_error = ${message.slice(0, 1000)},
        updated_at = now()
      where id = ${event.id}::uuid
    `;
    logger.error({ eventId: event.id, error: message }, "Transactional email delivery failed");
    return false;
  }
}

export async function processPendingTransactionalEmails(limit = 20) {
  if (!env.RESEND_API_KEY) return { attempted: 0, sent: 0 };

  const events = await sql<{ id: string }[]>`
    select id::text
    from notification_events
    where channel = 'email'
      and recipient_email is not null
      and attempt_count < ${MAX_EMAIL_ATTEMPTS}
      and (
        status = 'pending'
        or (status = 'retrying' and coalesce(next_attempt_at, now()) <= now())
        or (status = 'processing' and last_attempt_at < now() - interval '10 minutes')
      )
    order by created_at
    limit ${Math.max(1, Math.min(limit, 100))}
  `;
  const results = await Promise.all(
    events.map((event) => deliverTransactionalEmail(event.id))
  );
  return { attempted: events.length, sent: results.filter(Boolean).length };
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const content = createPasswordResetEmail({ name, resetUrl });
  const dedupeKey = createHash("sha256")
    .update(`talomart-password-reset:${resetUrl}`)
    .digest("hex");
  const [created] = await sql<{ id: string }[]>`
    insert into notification_events (
      type, audience, channel, status, dedupe_key, recipient_email, payload
    )
    values (
      'password_reset',
      'customer',
      'email',
      'processing',
      ${dedupeKey},
      ${to},
      ${JSON.stringify({ subject: content.subject })}::jsonb
    )
    on conflict (dedupe_key) do nothing
    returning id::text
  `;

  if (!created) return;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const providerMessageId = await sendWithResend({
        to,
        content,
        idempotencyKey: dedupeKey,
        category: "password_reset"
      });
      await sql`
        update notification_events
        set
          status = 'sent',
          provider_message_id = ${providerMessageId},
          attempt_count = ${attempt},
          last_attempt_at = now(),
          processed_at = now(),
          last_error = null,
          updated_at = now()
        where id = ${created.id}::uuid
      `;
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown email delivery error";
  await sql`
    update notification_events
    set
      status = 'failed',
      attempt_count = 3,
      last_attempt_at = now(),
      last_error = ${message.slice(0, 1000)},
      updated_at = now()
    where id = ${created.id}::uuid
  `;
  throw new Error("Password reset email delivery failed.");
}
