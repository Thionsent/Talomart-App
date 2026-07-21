import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { cookies } from "next/headers";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getServerCart, SERVER_CART_COOKIE } from "@/lib/server-cart";

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
  const cookieStore = await cookies();
  const initialCart = await getServerCart(
    cookieStore.get(SERVER_CART_COOKIE)?.value
  );

  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>
        <SiteHeader initialCart={initialCart} />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
