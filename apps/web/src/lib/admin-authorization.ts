import { sql } from "@talomart/db";
import { headers } from "next/headers";

import { adminAuth } from "./auth";
import {
  endpointRateLimitPolicies,
  enforceEndpointRateLimit
} from "./endpoint-rate-limit";
import { env } from "./env";

export const staffPermissionValues = [
  "catalog.manage",
  "inventory.manage",
  "orders.manage",
  "customers.read",
  "analytics.read",
  "staff.manage",
  "audit.read"
] as const;

export type StaffPermission = (typeof staffPermissionValues)[number];

export type AdminPrincipal = {
  id: string;
  email: string;
  role: "staff" | "admin";
  twoFactorEnabled: boolean;
  permissions: ReadonlySet<StaffPermission>;
  can: (permission: StaffPermission) => boolean;
};

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const session = await adminAuth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = session.user as typeof session.user & {
    role?: string;
    twoFactorEnabled?: boolean;
  };
  if (user.role !== "admin" && user.role !== "staff") return null;

  const role = user.role;
  const assigned =
    role === "admin"
      ? [...staffPermissionValues]
      : (
          await sql<{ permission: StaffPermission }[]>`
            select permission
            from staff_permissions
            where user_id = ${user.id}
          `
        ).map((row) => row.permission);
  const permissions = new Set<StaffPermission>(assigned);

  return {
    id: user.id,
    email: user.email,
    role,
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    permissions,
    can: (permission) => role === "admin" || permissions.has(permission)
  };
}

export async function requireAdminPermission(
  permission: StaffPermission,
  options: { mutation?: boolean } = {}
) {
  const principal = await getAdminPrincipal();
  if (!principal) {
    throw new Error("Staff sign-in is required.");
  }
  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) {
    throw new Error("Set up multi-factor authentication before continuing.");
  }
  if (!principal.can(permission)) {
    throw new Error("Your staff account does not have permission for this action.");
  }

  if (options.mutation) {
    const requestHeaders = await headers();
    const request = new Request(env.NEXT_PUBLIC_APP_URL, {
      headers: requestHeaders
    });
    const limited = await enforceEndpointRateLimit(
      request,
      endpointRateLimitPolicies.adminMutation,
      principal.id
    );
    if (limited) {
      throw new Error(
        limited.status === 429
          ? "Too many administrator changes. Wait a moment and try again."
          : "Administrator changes are temporarily unavailable."
      );
    }
  }

  return principal;
}

export function permissionForAdminView(view: string): StaffPermission {
  if (["products", "low-stock", "categories"].includes(view)) {
    return "catalog.manage";
  }
  if (view === "inventory") return "inventory.manage";
  if (view === "orders") return "orders.manage";
  if (view === "customers") return "customers.read";
  if (view === "analytics") return "analytics.read";
  if (view === "security") return "staff.manage";
  if (view === "audit") return "audit.read";
  return "analytics.read";
}
