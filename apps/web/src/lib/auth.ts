import { db, accounts, sessions, users, verifications } from "@talomart/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { env } from "./env";

export const auth = betterAuth({
  appName: "Talomart Stores",
  secret: env.AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  emailAndPassword: {
    enabled: true,
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
