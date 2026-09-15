# Transactional email runbook

Talomart uses Resend for password recovery and order lifecycle email. Application code, durable queuing, retry protection and delivery monitoring are implemented. Domain ownership and DNS verification are operational launch steps and cannot be completed from the source repository alone.

## 1. Verify the sending domain

1. In Resend, add a dedicated sending subdomain such as `updates.talomart.co.ke`.
2. Copy the SPF and DKIM records shown by Resend into the authoritative DNS provider.
3. Wait until Resend reports the domain as **Verified**.
4. Add a DMARC record in monitoring mode, review reports, and only then move toward quarantine or reject.
5. Create a sending-only API key for each environment. Never reuse staging credentials in production.

Recommended sender values:

```dotenv
EMAIL_FROM=Talomart Stores <orders@updates.talomart.co.ke>
EMAIL_REPLY_TO=support@talomart.co.ke
```

The exact addresses must exist on a domain owned by Talomart and verified in Resend. Do not deploy the placeholder `example.com` values.

## 2. Configure each environment

Set these values in the deployment secret manager, not in Git:

```dotenv
RESEND_API_KEY=re_...
RESEND_WEBHOOK_SECRET=whsec_...
EMAIL_FROM=Talomart Stores <orders@updates.talomart.co.ke>
EMAIL_REPLY_TO=support@talomart.co.ke
CRON_SECRET=generate-a-long-random-value
NEXT_PUBLIC_APP_URL=https://www.talomart.co.ke
```

Production and staging startup validation rejects missing email API, webhook, sender and scheduler settings.

## 3. Register delivery webhooks

Create a Resend webhook for:

```text
https://YOUR-HOST/api/webhooks/resend
```

Subscribe to `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.failed`, `email.complained`, and `email.suppressed`. Copy its signing secret to `RESEND_WEBHOOK_SECRET`.

The endpoint verifies the raw request signature, stores each `svix-id` once, tolerates out-of-order delivery, and updates the matching message in the admin email-delivery view.

## 4. Schedule retries

Call the following endpoint every minute from the selected hosting scheduler:

```text
GET /api/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Messages are claimed atomically, attempted at most five times, and retried with exponential backoff. A database unique key prevents duplicate logical messages, while the same stable Resend idempotency key makes provider retries safe.

## 5. Operational monitoring

Administrators with `orders.manage` permission can open **Admin → Email delivery** to see pending, sent, delivered, delayed, retrying, failed, bounced, complained and suppressed messages.

- Investigate permanent failures, complaints and suppressions; do not blindly retry them.
- Confirm the recipient address before contacting a customer through another channel.
- Alert when failed/bounced/complained/suppressed counts increase or the oldest pending message is more than five minutes old.
- Retain provider events according to the approved privacy and audit-retention policy.

## 6. Release verification

- Request a password reset and confirm the link arrives, works once and expires.
- Place one COD order and one M-Pesa sandbox order using controlled addresses.
- Progress an order through payment, dispatch, delivery, cancellation and refund scenarios.
- Replay a Resend webhook and confirm no duplicate event or message is created.
- Temporarily use an invalid recipient in staging and confirm the bounce/failure appears in **Email delivery**.
- Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build`.

Never use real customer addresses for staging tests.
