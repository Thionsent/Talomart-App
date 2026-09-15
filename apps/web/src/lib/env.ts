import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
);
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(20).optional()
);

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://talomart:talomart@localhost:5432/talomart"),
  AUTH_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  GOOGLE_CLIENT_ID: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(10).optional()
  ),
  GOOGLE_CLIENT_SECRET: optionalSecret,
  REDIS_URL: optionalUrl,
  SUPABASE_URL: optionalUrl,
  SUPABASE_SECRET_KEY: optionalSecret,
  // Temporary compatibility for projects that have not migrated from the
  // legacy JWT-based service_role key yet.
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("product-images"),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  MPESA_CONSUMER_KEY: z.string().default(""),
  MPESA_CONSUMER_SECRET: z.string().default(""),
  MPESA_SHORTCODE: z.string().default(""),
  MPESA_PASSKEY: z.string().default(""),
  MPESA_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:3000/api/payments/mpesa/callback"),
  RESEND_API_KEY: optionalSecret,
  RESEND_WEBHOOK_SECRET: optionalSecret,
  EMAIL_FROM: z
    .string()
    .min(3)
    .default("Talomart Stores <onboarding@resend.dev>"),
  EMAIL_REPLY_TO: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional()
  ),
  CRON_SECRET: optionalSecret,
  RATE_LIMIT_IP_HEADER: z
    .enum(["cf-connecting-ip", "x-real-ip", "x-forwarded-for"])
    .default("x-forwarded-for"),
  TRUSTED_PROXY_IPS: z.string().default(""),
  ADMIN_MFA_REQUIRED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  LOG_LEVEL: z.string().default("info")
});

type RawEnvironment = Record<string, string | undefined>;

const deploymentRequiredKeys = [
  "APP_ENV",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "AUTH_SECRET",
  "SUPABASE_URL",
  "SUPABASE_STORAGE_BUCKET",
  "MPESA_ENVIRONMENT",
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_SHORTCODE",
  "MPESA_PASSKEY",
  "MPESA_CALLBACK_URL",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "EMAIL_FROM",
  "CRON_SECRET",
  "RATE_LIMIT_IP_HEADER"
] as const;

const placeholderFragments = [
  "change-me",
  "changeme",
  "example.com",
  "placeholder",
  "replace-me",
  "replace_me",
  "your-",
  "your_",
  "xxxxx"
];

function looksLikePlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    placeholderFragments.some((fragment) => normalized.includes(fragment))
  );
}

function isLocalHostname(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}

function productionValidationIssues(source: RawEnvironment) {
  const issues: string[] = [];

  if (!source.APP_ENV) {
    issues.push("APP_ENV must explicitly identify staging or production.");
    return issues;
  }

  for (const key of deploymentRequiredKeys) {
    const value = source[key];
    if (!value?.trim()) {
      issues.push(`${key} is required.`);
    } else if (looksLikePlaceholder(value)) {
      issues.push(`${key} contains a placeholder value.`);
    }
  }

  const supabaseSecret =
    source.SUPABASE_SECRET_KEY ?? source.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseSecret?.trim()) {
    issues.push(
      "SUPABASE_SECRET_KEY is required (legacy SUPABASE_SERVICE_ROLE_KEY is accepted temporarily)."
    );
  } else if (looksLikePlaceholder(supabaseSecret)) {
    issues.push("The Supabase server secret contains a placeholder value.");
  }

  if (source.NEXT_PUBLIC_APP_URL) {
    if (!source.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
      issues.push("NEXT_PUBLIC_APP_URL must use HTTPS.");
    }
    if (isLocalHostname(source.NEXT_PUBLIC_APP_URL)) {
      issues.push("NEXT_PUBLIC_APP_URL cannot use a local hostname.");
    }
  }

  if (source.MPESA_CALLBACK_URL) {
    if (!source.MPESA_CALLBACK_URL.startsWith("https://")) {
      issues.push("MPESA_CALLBACK_URL must use HTTPS.");
    }
    if (isLocalHostname(source.MPESA_CALLBACK_URL)) {
      issues.push("MPESA_CALLBACK_URL cannot use a local hostname.");
    }
  }

  if ((source.AUTH_SECRET?.length ?? 0) < 48) {
    issues.push("AUTH_SECRET must contain at least 48 characters.");
  }

  if (source.APP_ENV === "production" && source.MPESA_ENVIRONMENT !== "production") {
    issues.push("Production must use MPESA_ENVIRONMENT=production.");
  }

  if (source.APP_ENV === "production" && source.ADMIN_MFA_REQUIRED === "false") {
    issues.push("Administrator MFA cannot be disabled in production.");
  }

  return issues;
}

export function validateServerEnvironment(
  source: RawEnvironment,
  options: { allowBuildDefaults?: boolean } = {}
) {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(parsed.error)}`
    );
  }

  const deployedRuntime =
    parsed.data.NODE_ENV === "production" ||
    parsed.data.APP_ENV === "staging" ||
    parsed.data.APP_ENV === "production";

  if (deployedRuntime && !options.allowBuildDefaults) {
    const issues = productionValidationIssues(source);
    if (issues.length) {
      throw new Error(
        `Unsafe deployment environment:\n- ${issues.join("\n- ")}`
      );
    }
  }

  return parsed.data;
}

function isProductionBuild() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

export function assertRuntimeEnvironment() {
  return validateServerEnvironment(process.env);
}

export const env = validateServerEnvironment(process.env, {
  // CI and image builds may intentionally omit runtime secrets. The server
  // validates again during instrumentation before it accepts any traffic.
  allowBuildDefaults: isProductionBuild()
});
