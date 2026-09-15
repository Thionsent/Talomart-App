import {
  accounts,
  authRateLimits,
  db,
  sessions,
  twoFactors,
  users,
  verifications
} from "@talomart/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { after } from "next/server";

import { sendPasswordResetEmail } from "./email";
import { env } from "./env";
import { logger } from "./logger";

const trustedProxyIps = env.TRUSTED_PROXY_IPS.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const sharedSecurityOptions = {
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  rateLimit: {
    enabled: true,
    storage: "database" as const,
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 600, max: 5 },
      "/reset-password": { window: 600, max: 8 }
    }
  },
  advanced: {
    useSecureCookies: env.APP_ENV !== "development",
    ipAddress: {
      ipAddressHeaders: [env.RATE_LIMIT_IP_HEADER],
      ...(trustedProxyIps.length ? { trustedProxies: trustedProxyIps } : {})
    }
  }
};

export const auth = betterAuth({
  appName: "Talomart Stores",
  secret: env.AUTH_SECRET,
  baseURL: `${env.NEXT_PUBLIC_APP_URL}/api/auth`,
  ...sharedSecurityOptions,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false
    }
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: authRateLimits
    }
  }),
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET
          }
        }
      }
    : {}),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const role = (user as { role?: string }).role;

      if (role !== "customer") {
        logger.warn(
          { userId: user.id, role },
          "Ignored a customer password-reset request for a non-customer account"
        );
        return;
      }

      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url
      });
    },
    onPasswordReset: async ({ user }) => {
      logger.info({ userId: user.id }, "Customer password reset completed");
    }
  },
  advanced: {
    ...sharedSecurityOptions.advanced,
    backgroundTasks: {
      handler: (promise) => after(() => promise)
    }
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true
      },
      marketingConsent: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true
      },
      termsAcceptedAt: {
        type: "date",
        required: false,
        input: true,
        returned: false
      },
      termsVersion: {
        type: "string",
        required: false,
        input: true,
        returned: false
      },
      role: {
        type: ["customer", "staff", "admin"],
        required: true,
        defaultValue: "customer",
        input: false
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24
  },
  plugins: [nextCookies()]
});

// Staff authentication deliberately uses a different route and cookie prefix.
// The records still live in the same audited user/session tables, but a customer
// session can no longer grant, replace or sign out an admin browser session.
export const adminAuth = betterAuth({
  appName: "Talomart Admin",
  secret: env.AUTH_SECRET,
  baseURL: `${env.NEXT_PUBLIC_APP_URL}/api/admin-auth`,
  ...sharedSecurityOptions,
  basePath: "/api/admin-auth",
  advanced: {
    ...sharedSecurityOptions.advanced,
    cookiePrefix: "talomart-admin"
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      twoFactor: twoFactors,
      rateLimit: authRateLimits
    }
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: false,
        input: true
      },
      marketingConsent: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      },
      termsAcceptedAt: {
        type: "date",
        required: false,
        input: false,
        returned: false
      },
      termsVersion: {
        type: "string",
        required: false,
        input: false,
        returned: false
      },
      role: {
        type: ["customer", "staff", "admin"],
        required: true,
        defaultValue: "customer",
        input: false
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 15
  },
  plugins: [
    twoFactor({
      issuer: "Talomart Admin",
      twoFactorCookieMaxAge: 5 * 60,
      trustDeviceMaxAge: 0,
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 5,
        durationSeconds: 15 * 60
      }
    }),
    nextCookies()
  ]
});
