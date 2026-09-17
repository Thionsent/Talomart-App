"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { adminAuth, auth } from "@/lib/auth";

export type SignOutState = {
  error?: string;
};

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional()
});

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function authErrorPath(path: string, code: string) {
  return `${path}?error=${encodeURIComponent(code)}`;
}

function messageFromError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.toLowerCase().includes("user already exists")
      ? "account-exists"
      : "invalid-credentials";
  }

  return "invalid-credentials";
}

export async function customerSignIn(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password")
  });

  if (!parsed.success) {
    redirect(authErrorPath("/sign-in", "check-details"));
  }

  let role: string | undefined;

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true
      },
      headers: await headers()
    });
    role = (result.user as { role?: string }).role;
  } catch (error) {
    redirect(authErrorPath("/sign-in", messageFromError(error)));
  }

  if (role !== "customer") {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch {
      // The customer portal remains denied below even if cleanup cannot run.
    }
    redirect(authErrorPath("/sign-in", "staff-account"));
  }

  redirect("/account");
}

export async function customerSignUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    password: field(formData, "password"),
    phone: field(formData, "phone") || undefined
  });

  if (!parsed.success) {
    redirect(authErrorPath("/sign-up", "check-details"));
  }

  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone,
        rememberMe: true
      },
      headers: await headers()
    });
  } catch (error) {
    redirect(authErrorPath("/sign-up", messageFromError(error)));
  }

  redirect("/account");
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

  try {
    const result = await adminAuth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true
      },
      headers: await headers()
    });
    role = (result.user as { role?: string }).role;
  } catch (error) {
    redirect(authErrorPath("/admin/sign-in", messageFromError(error)));
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
