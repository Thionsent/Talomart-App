import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { cookies, headers } from "next/headers";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { getServerCart, SERVER_CART_COOKIE } from "@/lib/server-cart";
import { auth } from "@/lib/auth";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Talomart Stores — Powering your connections",
    template: "%s | Talomart Stores"
  },
  description:
    "Shop genuine phones, audio, charging, storage, cameras and smart accessories from Talomart Stores.",
  openGraph: {
    title: "Talomart Stores",
    description: "Smart tech. Fair prices. Reliable service.",
    type: "website"
  }
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const [initialCart, sessionResult] = await Promise.all([
    getServerCart(cookieStore.get(SERVER_CART_COOKIE)?.value),
    auth.api
      .getSession({ headers: requestHeaders })
      .then((session) => ({ session, error: null }))
      .catch((error: unknown) => ({ session: null, error }))
  ]);
  let customer: { name: string; email: string } | null = null;
  const sessionUnavailable = Boolean(sessionResult.error);
  const role = (
    sessionResult.session?.user as { role?: string } | undefined
  )?.role;

  if (sessionResult.session && role === "customer") {
    customer = {
      name: sessionResult.session.user.name,
      email: sessionResult.session.user.email
    };
  }

  if (sessionResult.error) {
    console.error(
      "Unable to resolve the storefront customer session.",
      sessionResult.error
    );
  }

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <WishlistProvider authenticated={Boolean(customer)}>
          <SiteHeader
            initialCart={initialCart}
            customer={customer}
            sessionUnavailable={sessionUnavailable}
          />
          <main>{children}</main>
        </WishlistProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
