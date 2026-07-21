# Talomart M-Pesa Production Readiness

Use this checklist when Safaricom Daraja Go Live is approved and production credentials are issued.

## Required production values

```env
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://YOUR_DOMAIN/api/payments/mpesa/callback
```

## Safaricom / Daraja requirements

- The business Till/Store/Shortcode must be approved for Lipa na M-Pesa Online.
- The Daraja production app must be linked through Go Live.
- The M-PESA Portal Business Admin/Manager username is required for Go Live verification.
- The OTP step must be completed by the authorized business contact.
- The callback URL must be public HTTPS. Localhost cannot receive live callbacks.

## Talomart app readiness

- Checkout creates an order and payment record before initiating STK Push.
- Successful callback marks payment as `paid` and order as `payment_confirmed`.
- Failed callback marks payment as `failed`, cancels pending payment orders, and releases reserved stock.
- Callback reconciliation is idempotent by `checkout_request_id`.
- Notification events are recorded for payment success/failure and can later power SMS/email.

## Final live test

1. Deploy the site to production with HTTPS.
2. Set `MPESA_CALLBACK_URL` to the deployed callback endpoint.
3. Place a low-value M-Pesa test order.
4. Confirm the customer receives the STK Push.
5. Pay from a real phone.
6. Verify the order moves to `payment_confirmed`.
7. Verify the payment row has `paid`, receipt reference, and callback payload.
8. Verify admin order queue shows the order as ready for fulfillment.
