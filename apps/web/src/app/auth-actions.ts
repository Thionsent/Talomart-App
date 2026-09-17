"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { adminAuth, auth } from "@/lib/auth";
import { safeCustomerDestination } from "@/lib/auth-redirect";
import { deriveCustomerAccountScope } from "@/lib/browser-account-scope";
import { env } from "@/lib/env";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { logger } from "@/lib/logger";
import {
  LEGACY_SERVER_CART_COOKIE,
  mergeServerCartItems,
  parseServerCart,
  SERVER_CART_GUEST_COOKIE,
  serverCartCookieName,
  serializeServerCart
} from "@/lib/server-cart";

export type SignOutState = {
  error?: string;
};

export async function customerGoogleSignIn(formData: FormData) {
  const destination = safeCustomerDestination(field(formData, "next"));
  let authorizationUrl: string | undefined;

  try {
    const result = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: destination,
        disableRedirect: false
      },
      headers: await headers()
    });
    authorizationUrl = result.url;
  } catch (error) {
    logger.warn({ error }, "Google customer sign-in failed");
    redirect(authErrorPath("/sign-in", "google-sign-in", destination));
  }

  if (authorizationUrl) redirect(authorizationUrl);
  redirect(authErrorPath("/sign-in", "google-sign-in", destination));
}

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const signUpSchema = signInSchema.extend({
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(9)
    .max(24)
    .regex(/^\+?[0-9][0-9\s-]+$/),
  confirmPassword: z.string().min(8),
  acceptedTerms: z.literal(true),
  marketingConsent: z.boolean()
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match."
});

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function authErrorPath(path: string, code: string, destination?: string) {
  const params = new URLSearchParams({ error: code });
  if (destination) params.set("next", destination);
  return `${path}?${params.toString()}`;
}

function messageFromError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.toLowerCase().includes("user already exists")
      ? "account-exists"
      : "invalid-credentials";
  }

  return "invalid-credentials";
}

async function migrateGuestCartToCustomer(userId: string) {
  const cookieStore = await cookies();
  const customerCookieName = serverCartCookieName(
    deriveCustomerAccountScope(userId, env.AUTH_SECRET)
  );
  const guestCart = parseServerCart(
    cookieStore.get(SERVER_CART_GUEST_COOKIE)?.value ??
      cookieStore.get(LEGACY_SERVER_CART_COOKIE)?.value
  );

  if (guestCart.length) {
    const customerCart = parseServerCart(
      cookieStore.get(customerCookieName)?.value
    );
    cookieStore.set(
      customerCookieName,
      serializeServerCart(mergeServerCartItems(customerCart, guestCart)),
      {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 14,
        path: "/",
        sameSite: "lax"
      }
    );
  }

  cookieStore.delete(SERVER_CART_GUEST_COOKIE);
  cookieStore.delete(LEGACY_SERVER_CART_COOKIE);
}

export async function customerSignIn(formData: FormData) {
  const destination = safeCustomerDestination(field(formData, "next"));
  const parsed = signInSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password")
  });

  if (!parsed.success) {
    redirect(authErrorPath("/sign-in", "check-details", destination));
  }

  let role: string | undefined;
  let signedInUserId: string | null = null;

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: formData.get("rememberMe") === "on"
      },
      headers: await headers()
    });
    role = (result.user as { role?: string }).role;
    signedInUserId = result.user.id;
  } catch (error) {
    redirect(
      authErrorPath("/sign-in", messageFromError(error), destination)
    );
  }

  if (role !== "customer") {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch {
      // The customer portal remains denied below even if cleanup cannot run.
    }
    redirect(authErrorPath("/sign-in", "staff-account", destination));
  }

  if (signedInUserId) {
    try {
      await migrateGuestCartToCustomer(signedInUserId);
    } catch (error) {
      logger.warn(
        { error, userId: signedInUserId },
        "Customer signed in but guest cart migration failed"
      );
    }
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function customerSignUp(formData: FormData) {
  const destination = safeCustomerDestination(field(formData, "next"));
  const parsed = signUpSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    phone: field(formData, "phone"),
    confirmPassword: field(formData, "confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
    marketingConsent: formData.get("marketingConsent") === "on"
  });

  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((issue) => issue.path[0]));
    const code = fields.has("acceptedTerms")
      ? "terms-required"
      : fields.has("confirmPassword")
        ? "passwords-differ"
        : fields.has("password")
          ? "password-requirements"
          : fields.has("phone")
            ? "phone-invalid"
            : "check-details";
    redirect(authErrorPath("/sign-up", code, destination));
  }

  let newUserId: string | null = null;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone,
        marketingConsent: parsed.data.marketingConsent,
        termsAcceptedAt: new Date(),
        termsVersion: CURRENT_TERMS_VERSION,
        rememberMe: true
      },
      headers: await headers()
    });
    newUserId = result.user.id;
  } catch (error) {
    redirect(
      authErrorPath("/sign-up", messageFromError(error), destination)
    );
  }

  if (newUserId) {
    try {
      await migrateGuestCartToCustomer(newUserId);
    } catch (error) {
      logger.warn(
        { error, userId: newUserId },
        "Customer signed up but guest cart migration failed"
      );
    }
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function adminSignIn(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password")
  });

  if (!parsed.success) {
    redirect(authErrorPath("/admin/sign-in", "check-details"));
  }

  let role: string | undefined;
  let requiresTwoFactor = false;

  try {
    const result = await adminAuth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: false
      },
      headers: await headers()
    });
    if ("twoFactorRedirect" in result && result.twoFactorRedirect) {
      requiresTwoFactor = true;
    } else if ("user" in result) {
      role = (result.user as { role?: string }).role;
    }
  } catch (error) {
    redirect(authErrorPath("/admin/sign-in", messageFromError(error)));
  }

  if (requiresTwoFactor) {
    redirect("/admin/two-factor");
  }

  if (role !== "admin" && role !== "staff") {
    try {
      await adminAuth.api.signOut({ headers: await headers() });
    } catch {
      // Access is still denied below even if the defensive session cleanup fails.
    }
    redirect(authErrorPath("/admin/sign-in", "staff-only"));
  }

  redirect("/admin");
}

export async function customerSignOut(
  _previousState: SignOutState,
  _formData: FormData
): Promise<SignOutState> {
  void _previousState;
  void _formData;

  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    return {
      error: "We could not sign you out. Please check your connection and try again."
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function adminSignOut(
  _previousState: SignOutState,
  _formData: FormData
): Promise<SignOutState> {
  void _previousState;
  void _formData;

  try {
    await adminAuth.api.signOut({ headers: await headers() });
  } catch {
    return {
      error: "The staff session could not be closed. Please try again."
    };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/sign-in");
}
