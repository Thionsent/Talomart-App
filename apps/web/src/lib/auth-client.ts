"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

function browserBaseUrl() {
  return typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    : window.location.origin;
}

export const authClient = createAuthClient({
  baseURL: browserBaseUrl()
});

export const adminAuthClient = createAuthClient({
  baseURL: browserBaseUrl(),
  basePath: "/api/admin-auth",
  plugins: [
    twoFactorClient({
      twoFactorPage: "/admin/two-factor"
    })
  ]
});
