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

type MpesaConfiguration = {
  MPESA_ENVIRONMENT: "sandbox" | "production";
  MPESA_CONSUMER_KEY: string;
  MPESA_CONSUMER_SECRET: string;
  MPESA_SHORTCODE: string;
  MPESA_PASSKEY: string;
  MPESA_CALLBACK_URL: string;
};

export type MpesaConfigurationStatus = {
  environment: "sandbox" | "production";
  configured: boolean;
  reason: string | null;
};

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
  const normalized = digits.startsWith("254")
    ? digits
    : digits.startsWith("0")
      ? `254${digits.slice(1)}`
      : `254${digits}`;

  if (!/^254(?:7|1)\d{8}$/.test(normalized)) {
    throw new Error("Enter a valid Kenyan M-Pesa phone number.");
  }

  return normalized;
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

export type MpesaStkQueryStatus =
  | "paid"
  | "failed"
  | "processing"
  | "not_found"
  | "unavailable";

export type MpesaStkQueryResult = {
  status: MpesaStkQueryStatus;
  resultCode: number | null;
  resultDescription: string;
  payload: unknown;
};

function responseRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : {};
}

export function classifyMpesaStkQueryResponse(
  httpStatus: number,
  payload: unknown
): MpesaStkQueryResult {
  const record = responseRecord(payload);
  const resultCodeValue = record.ResultCode;
  const resultCode =
    typeof resultCodeValue === "number" || typeof resultCodeValue === "string"
      ? Number(resultCodeValue)
      : null;
  const description = String(
    record.ResultDesc ??
      record.ResponseDescription ??
      record.errorMessage ??
      "M-Pesa status is temporarily unavailable."
  );
  const normalizedDescription = description.toLowerCase();
  const errorCode = String(record.errorCode ?? "");

  if (Number.isFinite(resultCode) && resultCode === 0) {
    return {
      status: "paid",
      resultCode,
      resultDescription: description,
      payload
    };
  }

  if (httpStatus >= 200 && httpStatus < 300 && Number.isFinite(resultCode)) {
    return {
      status: "failed",
      resultCode,
      resultDescription: description,
      payload
    };
  }

  if (
    errorCode === "500.001.1001" ||
    normalizedDescription.includes("does not exist")
  ) {
    return {
      status: "not_found",
      resultCode: null,
      resultDescription: description,
      payload
    };
  }

  if (
    String(record.ResponseCode ?? "") === "0" ||
    normalizedDescription.includes("being processed") ||
    normalizedDescription.includes("under processing")
  ) {
    return {
      status: "processing",
      resultCode: null,
      resultDescription: description,
      payload
    };
  }

  return {
    status: "unavailable",
    resultCode: Number.isFinite(resultCode) ? resultCode : null,
    resultDescription: description,
    payload
  };
}

export function getMpesaConfigurationStatus(
  configuration: MpesaConfiguration = env
): MpesaConfigurationStatus {
  const environment = configuration.MPESA_ENVIRONMENT;
  const missing = [
    ["consumer key", configuration.MPESA_CONSUMER_KEY],
    ["consumer secret", configuration.MPESA_CONSUMER_SECRET],
    ["shortcode", configuration.MPESA_SHORTCODE],
    ["passkey", configuration.MPESA_PASSKEY],
    ["callback URL", configuration.MPESA_CALLBACK_URL]
  ].filter(([, value]) => !value?.trim());

  if (missing.length) {
    return {
      environment,
      configured: false,
      reason: `Missing M-Pesa ${missing.map(([name]) => name).join(", ")}.`
    };
  }

  let callbackUrl: URL;
  try {
    callbackUrl = new URL(configuration.MPESA_CALLBACK_URL);
  } catch {
    return {
      environment,
      configured: false,
      reason: "The M-Pesa callback URL is invalid."
    };
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (callbackUrl.protocol !== "https:" || localHosts.has(callbackUrl.hostname)) {
    return {
      environment,
      configured: false,
      reason: "M-Pesa requires a public HTTPS callback URL."
    };
  }

  return { environment, configured: true, reason: null };
}

export function isMpesaConfigured() {
  return getMpesaConfigurationStatus().configured;
}

export function normalizeMpesaPhone(phone: string) {
  return normalizePhone(phone);
}

export async function initiateStkPush(input: StkPushInput) {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa is not configured yet.");
  }

  if (!Number.isInteger(input.amountKes) || input.amountKes < 1) {
    throw new Error("M-Pesa amount must be a whole number of at least KSh 1.");
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

  const result = stkResponseSchema.parse(await response.json());
  if (result.ResponseCode !== "0") {
    throw new Error("M-Pesa did not accept the STK Push request.");
  }

  return result;
}

export async function queryStkPush(
  checkoutRequestId: string
): Promise<MpesaStkQueryResult> {
  if (!isMpesaConfigured()) {
    throw new Error("M-Pesa is not configured yet.");
  }

  const requestTimestamp = timestamp();
  const password = Buffer.from(
    `${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${requestTimestamp}`
  ).toString("base64");
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: requestTimestamp,
      CheckoutRequestID: checkoutRequestId
    }),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null);

  return classifyMpesaStkQueryResponse(response.status, payload);
}
