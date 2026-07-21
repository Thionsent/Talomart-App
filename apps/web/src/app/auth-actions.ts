"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";

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

  try {
    await auth.api.signInEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true
      },
      headers: await headers()
    });
  } catch (error) {
    redirect(authErrorPath("/sign-in", messageFromError(error)));
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
    redirect(authErrorPath("/admin/sign-in", messageFromError(error)));
  }

  if (role !== "admin" && role !== "staff") {
    redirect(authErrorPath("/admin/sign-in", "staff-only"));
  }

  redirect("/admin");
}
