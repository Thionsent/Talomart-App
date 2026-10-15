# Talomart M-Pesa Production Readiness

Use this checklist when Safaricom Daraja Go Live is approved and production credentials are issued.

Complete [M-Pesa sandbox testing](mpesa-sandbox-testing.md) before starting
production go-live verification.

## Required production values

```env
MPESA_ENVIRONMENT=production
MPESA_LIVE_ENABLED=false
MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://YOUR_DOMAIN/api/payments/notify
```

## Safaricom / Daraja requirements

- Talomart's approved Till/Store/Shortcode must be enabled for M-Pesa Express (STK Push); use the production shortcode and passkey issued for that Till, not sandbox values.
- The Daraja production app must be linked through Go Live.
- The M-PESA Portal Business Admin/Manager username is required for Go Live verification.
- The OTP step must be completed by the authorized business contact.
- The callback URL must be the same public HTTPS origin as `NEXT_PUBLIC_APP_URL` and use `/api/payments/notify`. Localhost cannot receive live callbacks.
- Put all credentials in the deployment platform's server-only encrypted environment settings. Never use `NEXT_PUBLIC_` names for them, paste them into chat, or commit them.
- The production code defaults to `MPESA_LIVE_ENABLED=false`; do not set it to `true` until the passkey, callback, scheduler, and owner-approved live test plan are ready. The key and secret shown in the shared screenshot should be rotated first.

## Talomart app readiness

- Checkout creates an order and payment record before initiating STK Push.
- A production callback must agree with a fresh Daraja STK status query before it can mark payment `paid` or `failed`. If verification is temporarily unavailable, it leaves the payment pending.
- Failed callbacks mark the attempt as `failed` but retain the order reservation
  during the controlled recovery window. Abandonment later cancels the order
  and releases the active reservation exactly once.
- The customer page distinguishes processing from confirmed payment, queries
  Daraja automatically and exposes resend only after a terminal provider
  failure. The sandbox-only `not_found` resend rule must not be enabled in
  production.
- Production callbacks match the stored `checkout_request_id` only; the sandbox's amount-and-phone fallback is disabled for live traffic. Replay-safe state transitions exist, but notification-event deduplication and database-backed concurrent/out-of-order integration tests must be completed before production payments are enabled.
- A protected `GET /api/cron/payments` endpoint checks pending transactions with
  Daraja, then sweeps abandoned orders. Configure a scheduler to call it
  regularly with `Authorization: Bearer <CRON_SECRET>`; the endpoint alone does
  not schedule itself. Monitor `unavailable` results and payment logs.
- Notification events are recorded for payment success/failure and can later power SMS/email.

## Final live test

1. Deploy the reviewed code to the intended production host with HTTPS, but do not yet send customer traffic to live M-Pesa.
2. Set `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline` and `MPESA_CALLBACK_URL` to that host's `/api/payments/notify` endpoint. Confirm the exact shortcode/passkey pairing in Daraja with the business owner.
3. Verify the callback endpoint is reachable from Safaricom and review the deployed firewall/proxy settings with Safaricom's current IP guidance.
4. Configure and verify the payment scheduler. Complete the outstanding database-backed concurrent/out-of-order tests above.
5. With the owner present, briefly set `MPESA_LIVE_ENABLED=true` and place one owner-approved low-value live order. This charges real money; do not run it as an automated test. Disable it again if reconciliation fails.
6. Confirm the customer receives the STK Push and pays from a real phone.
7. Verify the order moves to `payment_confirmed` and the payment row has `paid`, a receipt reference, and callback payload.
8. Verify admin order queue shows the order as ready for fulfillment, then test one cancelled prompt and one temporary callback outage.
