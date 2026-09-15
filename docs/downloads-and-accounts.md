# Downloads and service accounts

## Required locally

| Item | Status | Purpose |
|---|---|---|
| Node.js 24+ | Installed | Application runtime |
| npm 11+ | Installed | Workspace dependency management |
| Git | Installed | Version control |
| Supabase project | Needed | Managed PostgreSQL for commerce data |

Docker Desktop is optional. Use it only if you want a local PostgreSQL/Redis fallback instead of connecting to Supabase during development.

## Required before staging

- GitHub repository for source control and CI.
- Supabase project for managed PostgreSQL, backups and point-in-time recovery.
- Supabase Storage bucket for product images, or another approved object storage provider.
- Safaricom Daraja developer account and sandbox application.
- Transactional email account such as Resend.
- Verified transactional-email sending domain and an `EMAIL_FROM` address on
  that domain. Customer password recovery cannot deliver links until both the
  provider API key and verified sender are configured.
- SMS provider account if order updates will be sent by SMS.
- Error monitoring project such as Sentry.
- Domain name and DNS access.

## Optional later

- Supabase Queues for database-native background jobs.
- Redis/Upstash only if the BullMQ worker remains the chosen queue implementation.
- Cloudflare R2 or Amazon S3 only if product media moves away from Supabase Storage.

## Required before production payments

- Safaricom production application approval.
- Public HTTPS callback URL.
- Production shortcode, passkey, consumer key and consumer secret.
- Tested callback replay and idempotency handling.
- Reconciliation and refund operating procedure.

Place local values in `.env`. Place staging and production values in the hosting provider's encrypted secret manager.

## Customer password recovery

Talomart uses Better Auth's single-use password-reset verification records and
Resend for delivery. Reset links expire after one hour. Configure
`RESEND_API_KEY`, `EMAIL_FROM` and the public `NEXT_PUBLIC_APP_URL` before
testing recovery outside local development. A successful reset revokes the
customer's existing sessions.
