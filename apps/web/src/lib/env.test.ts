import { describe, expect, it } from "vitest";

import { validateServerEnvironment } from "./env";

const deploymentEnvironment = {
  NODE_ENV: "production",
  APP_ENV: "staging",
  NEXT_PUBLIC_APP_URL: "https://staging.talomart.co.ke",
  DATABASE_URL:
    "postgresql://runtime:strong-password@db.talomart.co.ke:5432/talomart?sslmode=require",
  AUTH_SECRET: "4pG2xQ9vN7mK5rT8yW3cF6hJ1sL0dB4zE9uI2oP7aS5nM8qR",
  SUPABASE_URL: "https://stagingtalomart.supabase.co",
  SUPABASE_SECRET_KEY:
    "sb_secret_staging_key_with_more_than_twenty_characters",
  SUPABASE_STORAGE_BUCKET: "staging-product-images",
  MPESA_ENVIRONMENT: "sandbox",
  MPESA_TRANSACTION_TYPE: "CustomerPayBillOnline",
  MPESA_CONSUMER_KEY: "sandbox-consumer-key-value",
  MPESA_CONSUMER_SECRET: "sandbox-consumer-secret-value",
  MPESA_SHORTCODE: "174379",
  MPESA_PASSKEY: "sandbox-passkey-value-long-enough",
  MPESA_CALLBACK_URL:
    "https://staging.talomart.co.ke/api/payments/mpesa/callback",
  RESEND_API_KEY: "re_staging_transactional_email_key",
  RESEND_WEBHOOK_SECRET: "whsec_staging_signing_secret_long_enough",
  EMAIL_FROM: "Talomart Staging <orders@staging.talomart.co.ke>",
  EMAIL_REPLY_TO: "support@staging.talomart.co.ke",
  CRON_SECRET: "staging-cron-secret-with-enough-randomness",
  RATE_LIMIT_IP_HEADER: "x-forwarded-for",
  ADMIN_MFA_REQUIRED: "true"
} satisfies Record<string, string>;

describe("server environment validation", () => {
  it("accepts an explicit, isolated staging environment", () => {
    expect(validateServerEnvironment(deploymentEnvironment).APP_ENV).toBe(
      "staging"
    );
  });

  it("rejects production runtime without an explicit application environment", () => {
    const missingAppEnvironment = { ...deploymentEnvironment } as Record<
      string,
      string | undefined
    >;
    delete missingAppEnvironment.APP_ENV;
    expect(() => validateServerEnvironment(missingAppEnvironment)).toThrow(
      /APP_ENV must explicitly identify/
    );
  });

  it("rejects placeholders and local callback URLs in deployments", () => {
    expect(() =>
      validateServerEnvironment({
        ...deploymentEnvironment,
        AUTH_SECRET: "change-me-change-me-change-me-change-me-change-me-change-me",
        MPESA_CALLBACK_URL: "http://localhost:3000/api/payments/mpesa/callback"
      })
    ).toThrow(/placeholder|HTTPS|local hostname/);
  });

  it("requires live M-Pesa and mandatory MFA in production", () => {
    expect(() =>
      validateServerEnvironment({
        ...deploymentEnvironment,
        APP_ENV: "production",
        ADMIN_MFA_REQUIRED: "false"
      })
    ).toThrow(/MPESA_ENVIRONMENT=production|MFA cannot be disabled/);
  });

  it("requires an explicit Till transaction type and first-party callback in production", () => {
    const production: Record<string, string | undefined> = {
      ...deploymentEnvironment,
      APP_ENV: "production",
      MPESA_ENVIRONMENT: "production",
      MPESA_CALLBACK_URL: "https://staging.talomart.co.ke/api/payments/notify"
    };
    delete production.MPESA_TRANSACTION_TYPE;
    expect(() => validateServerEnvironment(production)).toThrow(/MPESA_TRANSACTION_TYPE is required/);
    expect(validateServerEnvironment({
      ...production,
      MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline"
    }).MPESA_TRANSACTION_TYPE).toBe("CustomerBuyGoodsOnline");
    expect(() => validateServerEnvironment({
      ...production,
      MPESA_TRANSACTION_TYPE: "CustomerPayBillOnline"
    })).toThrow(/production Till requires/);
    expect(() => validateServerEnvironment({
      ...production,
      MPESA_TRANSACTION_TYPE: "CustomerBuyGoodsOnline",
      MPESA_CALLBACK_URL: "https://other.example.net/api/payments/notify"
    })).toThrow(/must be the app's/);
  });

  it("keeps safe defaults available for local development", () => {
    const value = validateServerEnvironment({ NODE_ENV: "development" });
    expect(value.APP_ENV).toBe("development");
    expect(value.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("temporarily accepts a legacy Supabase service-role key", () => {
    const legacyEnvironment = { ...deploymentEnvironment } as Record<
      string,
      string | undefined
    >;
    delete legacyEnvironment.SUPABASE_SECRET_KEY;

    expect(
      validateServerEnvironment({
        ...legacyEnvironment,
        SUPABASE_SERVICE_ROLE_KEY:
          "legacy-service-role-key-with-more-than-twenty-characters"
      }).APP_ENV
    ).toBe("staging");
  });
});
