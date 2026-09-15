# Talomart M-Pesa sandbox testing

Use Safaricom Daraja sandbox before applying production credentials. Sandbox
testing exercises authentication, STK Push initiation, callbacks and Talomart's
order/payment state without collecting real money.

## 1. Create a Daraja sandbox app

1. Register or sign in at the [Safaricom Daraja Developer Portal](https://developer.safaricom.co.ke/).
2. Create a sandbox application with the **M-Pesa Express** API.
3. Copy the application's consumer key and consumer secret.
4. Open the M-Pesa Express simulator/documentation for the sandbox shortcode,
   passkey and currently supported test phone details.

Do not commit or paste credentials into documentation, issues or chat. Store
them only in the ignored local `.env` file and, later, the staging secret
manager.

## 2. Provide a public callback

Safaricom cannot send callbacks to `localhost`. Use either:

- a deployed HTTPS staging environment; or
- a temporary HTTPS tunnel that forwards only the callback route.

The public URL must end with:

```text
/api/payments/mpesa/callback
```

Keep the tunnel running during the complete test. Treat temporary tunnel URLs
as development-only configuration.

### Callback-only ngrok tunnel

Do not expose the whole development site through ngrok because that also makes
admin and authentication routes public. Talomart includes a restricted local
proxy that accepts only `POST /api/payments/mpesa/callback` and returns `404`
for every other method or path.

With the web app running on port 3000, start the proxy in a second terminal:

```powershell
npm run mpesa:sandbox:proxy
```

Then point ngrok at the proxy's port, not the web application port:

```powershell
ngrok http --url=YOUR_NGROK_DEV_DOMAIN 3002
```

Use the resulting HTTPS domain for `MPESA_CALLBACK_URL`. Keep the web app,
callback proxy and ngrok agent running for the duration of the test.

## 3. Configure `.env`

```env
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=YOUR_SANDBOX_APP_CONSUMER_KEY
MPESA_CONSUMER_SECRET=YOUR_SANDBOX_APP_CONSUMER_SECRET
MPESA_SHORTCODE=YOUR_SANDBOX_MPESA_EXPRESS_SHORTCODE
MPESA_PASSKEY=YOUR_SANDBOX_MPESA_EXPRESS_PASSKEY
MPESA_CALLBACK_URL=https://YOUR-PUBLIC-HOST/api/payments/mpesa/callback
```

Restart the Next.js development server after changing `.env`.

## 4. Verify credentials without printing them

Run:

```powershell
npm run mpesa:sandbox:check
```

A successful result confirms that Daraja accepted the consumer key/secret and
that the configured callback has a public HTTPS shape. It does not initiate a
payment and it never prints the access token.

## 5. Test checkout

For a low-value end-to-end payment, create the guarded KSh 5 sandbox product:

```powershell
npm run mpesa:sandbox:product:ensure
```

The product is clearly labelled as sandbox-only and receives free delivery
only while `MPESA_ENVIRONMENT=sandbox`, so the STK request is exactly KSh 5.
The command is idempotent and refuses to run against a production M-Pesa
environment.

1. Start Talomart with `npm run dev`.
2. Add an in-stock database product to the cart.
3. Open checkout and confirm that M-Pesa says **sandbox test mode**.
4. Enter the Daraja-supported sandbox phone format and valid delivery details.
5. Select M-Pesa and place the order.
6. Confirm checkout receives a `CheckoutRequestID` and redirects to the success page.
7. Confirm the callback reaches the public URL.
8. In the admin dashboard, confirm the payment becomes `paid` and the order
   becomes `payment_confirmed` for a successful simulation.

Talomart assigns an idempotency key to each checkout submission so a network
retry cannot create a second order or STK prompt. Once Daraja accepts an STK
request, Talomart records it as `processing`; a later audit-payload storage
error must never mark that accepted request as failed or cancel the order.
The success page queries Talomart's secured payment-status endpoint while the
callback is pending. The server throttles automatic Daraja status queries,
keeps `processing` separate from confirmed success and can reconcile a paid
status even when the callback is delayed or missing.

If Daraja reports that a sandbox request does not exist after 45 seconds, the
page shows **Prompt not received?** and enables a controlled resend. A resend
is never offered while Daraja still reports `processing`, has a 30-second
cooldown and is capped at three attempts. An unpaid request expires after ten
minutes; cancellation and active-reservation release are transactional and
idempotent.

The callback handler first matches `CheckoutRequestID`. For a successful
callback received before that identifier finishes persisting, it may recover
one unambiguous recent `processing` payment using the callback amount and phone
suffix. It must refuse an ambiguous fallback rather than credit the wrong
order. Successful callbacks are authoritative, replay-safe and can restore an
inventory reservation that a prior local failure released.

## 6. Required test cases

- Successful STK Push and callback
- Customer cancellation followed by a safe resend
- Timeout/no response
- Accepted-but-nonexistent sandbox request and prompt-not-received messaging
- Abandonment after ten minutes and exactly one inventory release
- Failed payment
- Replayed success callback
- Replayed failure callback
- Unknown `CheckoutRequestID`
- Invalid phone number
- Daraja authentication failure
- Daraja request timeout

For every case, verify the order, payment, inventory reservation and
notification events. A callback replay must not create duplicate events or
release stock more than once.

## Troubleshooting

| Symptom | Check |
|---|---|
| M-Pesa option is disabled | All five settings exist and callback is public HTTPS |
| Sandbox credential check returns 401 | Consumer key/secret belong to the selected sandbox app |
| STK request fails | Shortcode, passkey, phone format and sandbox API assignment |
| Payment stays `processing` | Wait for the automatic status query, then check the public callback URL, tunnel/deployment logs and callback route |
| Callback is accepted but order does not change | `checkout_request_id` matches the payment record |
| UI reports failure after an STK prompt arrived | Treat this as an application persistence fault; do not submit again until the payment record and callback are checked |
| No STK prompt appears | Wait for **Prompt not received?**; resend only when the page enables the guarded button |

## Exit criteria

Sandbox testing is complete only when success, failure and replay cases pass,
stock remains consistent and the admin dashboard reflects the final state.
Production credentials must remain disabled until the separate
[M-Pesa production readiness](mpesa-production-readiness.md) checklist is
complete.

Disable the sandbox test product before production launch without deleting its
historical orders or payment records:

```powershell
npm run mpesa:sandbox:product:disable
```
