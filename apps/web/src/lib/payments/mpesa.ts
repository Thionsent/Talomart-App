import { z } from "zod";

import { env } from "../env";

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.string()
});

const stkResponseSchema = z.object({
  MerchantRequestID: z.string(),
  CheckoutRequestID: z.string(),
  ResponseCode: z.string(),
  ResponseDescription: z.string(),
  CustomerMessage: z.string()
});

function baseUrl() {
  return env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return `254${digits}`;
}

async function getAccessToken() {
  const credentials = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const response = await fetch(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: "no-store"
    }
  );
  if (!response.ok) throw new Error("M-Pesa authentication failed");
  return tokenResponseSchema.parse(await response.json()).access_token;
}

export interface StkPushInput {
  phone: string;
  amountKes: number;
  orderNumber: string;
}

export function isMpesaConfigured() {
  return Boolean(
    env.MPESA_CONSUMER_KEY &&
      env.MPESA_CONSUMER_SECRET &&
      env.MPESA_SHORTCODE &&
      env.MPESA_PASSKEY &&
      env.MPESA_CALLBACK_URL
  );
}

export function normalizeMpesaPhone(phone: string) {
  return normalizePhone(phone);
}

export async function initiateStkPush(input: StkPushInput) {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa is not configured yet.");
  }

  const requestTimestamp = timestamp();
  const password = Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${requestTimestamp}`
  ).toString("base64");
  const token = await getAccessToken();

  const response = await fetch(
    `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: requestTimestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(input.amountKes),
        PartyA: normalizePhone(input.phone),
        PartyB: env.MPESA_SHORTCODE,
        PhoneNumber: normalizePhone(input.phone),
        CallBackURL: env.MPESA_CALLBACK_URL,
        AccountReference: input.orderNumber,
        TransactionDesc: `Talomart order ${input.orderNumber}`
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) throw new Error("M-Pesa STK Push request failed");
  return stkResponseSchema.parse(await response.json());
}
