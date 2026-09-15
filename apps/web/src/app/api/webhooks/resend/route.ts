import { sql } from "@talomart/db";
import { Resend, type WebhookEventPayload } from "resend";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const trackedStatuses = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.failed": "failed",
  "email.complained": "complained",
  "email.suppressed": "suppressed"
} as const;

function deliveryError(event: WebhookEventPayload) {
  if (event.type === "email.bounced") return event.data.bounce.message;
  if (event.type === "email.failed") return event.data.failed.reason;
  if (event.type === "email.suppressed") return event.data.suppressed.message;
  if (event.type === "email.complained") return "Recipient reported this message as spam.";
  if (event.type === "email.delivery_delayed") return "The receiving mail server delayed delivery.";
  return null;
}

export async function POST(request: Request) {
  if (!env.RESEND_API_KEY || !env.RESEND_WEBHOOK_SECRET) {
    return Response.json({ error: "Email webhooks are not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing signature headers." }, { status: 401 });
  }
  let event: WebhookEventPayload;
  try {
    event = new Resend(env.RESEND_API_KEY).webhooks.verify({
      payload: rawBody,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature
      },
      webhookSecret: env.RESEND_WEBHOOK_SECRET
    });
  } catch (error) {
    logger.warn({ error }, "Rejected an invalid Resend webhook signature");
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (!("email_id" in event.data)) {
    return Response.json({ received: true });
  }

  const providerStatus = trackedStatuses[event.type as keyof typeof trackedStatuses];
  if (!providerStatus) return Response.json({ received: true });

  const providerMessageId = event.data.email_id;
  const eventCreatedAt = new Date(event.created_at);
  if (Number.isNaN(eventCreatedAt.getTime())) {
    return Response.json({ error: "Invalid event timestamp." }, { status: 400 });
  }

  await sql.begin(async (transaction) => {
    const [inserted] = await transaction<{ svixId: string }[]>`
      insert into email_webhook_events (
        svix_id, provider_message_id, event_type, event_created_at, payload
      )
      values (
        ${svixId},
        ${providerMessageId},
        ${event.type},
        ${eventCreatedAt.toISOString()}::timestamptz,
        ${rawBody}::jsonb
      )
      on conflict (svix_id) do nothing
      returning svix_id as "svixId"
    `;
    if (!inserted) return;

    const errorMessage = deliveryError(event);
    await transaction`
      update notification_events
      set
        status = case
          when ${providerStatus} in ('bounced', 'failed', 'complained', 'suppressed')
            then ${providerStatus}
          when ${providerStatus} = 'delivered'
            and status not in ('bounced', 'failed', 'complained', 'suppressed')
            then 'delivered'
          when ${providerStatus} = 'delayed'
            and status in ('pending', 'processing', 'sent', 'retrying')
            then 'delayed'
          when ${providerStatus} = 'sent'
            and status in ('pending', 'processing', 'retrying')
            then 'sent'
          else status
        end,
        provider_event_at = greatest(
          coalesce(provider_event_at, '-infinity'::timestamptz),
          ${eventCreatedAt.toISOString()}::timestamptz
        ),
        last_error = case
          when ${errorMessage} is not null then ${errorMessage}
          when ${providerStatus} = 'delivered' then null
          else last_error
        end,
        updated_at = now()
      where provider_message_id = ${providerMessageId}
    `;
  });

  return Response.json({ received: true });
}
