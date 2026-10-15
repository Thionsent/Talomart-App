import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { ApplicationShell } from "@/components/layout/application-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { auth } from "@/lib/auth";
import {
  deriveCustomerAccountScope,
  GUEST_ACCOUNT_SCOPE
} from "@/lib/browser-account-scope";
import { env } from "@/lib/env";
import { businessInfo } from "@/lib/business-info";
import { absoluteUrl, isIndexableDeployment, safeJsonLd, siteUrl } from "@/lib/seo";
import {
  getServerCart,
  LEGACY_SERVER_CART_COOKIE,
  serverCartCookieName
} from "@/lib/server-cart";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Talomart Stores — Powering your connections",
    template: "%s | Talomart Stores"
  },
  description:
    "Shop phones, audio, charging, storage and smart accessories at Talomart Stores in Kenya. Browse the latest products and get support from our team in Sirari, Migori.",
  robots: isIndexableDeployment ? undefined : { index: false, follow: false },
  icons: {
    icon: "/talomart-logo.png",
    apple: "/talomart-logo.png"
  },
  openGraph: {
    title: "Talomart Stores",
    description: "Shop phones and tech accessories at Talomart Stores in Kenya.",
    url: siteUrl,
    siteName: businessInfo.name,
    locale: "en_KE",
    type: "website",
    images: [{ url: "/talomart-logo.png", width: 1280, height: 1280, alt: "Talomart Stores" }]
  },
  twitter: { card: "summary_large_image" }
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const sessionResult = await auth.api
    .getSession({ headers: requestHeaders })
    .then((session) => ({ session, error: null }))
    .catch((error: unknown) => ({ session: null, error }));
  let customer: { name: string; email: string } | null = null;
  let accountScope = GUEST_ACCOUNT_SCOPE;
  const sessionUnavailable = Boolean(sessionResult.error);
  const role = (
    sessionResult.session?.user as { role?: string } | undefined
  )?.role;

  if (sessionResult.session && role === "customer") {
    accountScope = deriveCustomerAccountScope(
      sessionResult.session.user.id,
      env.AUTH_SECRET
    );
    customer = {
      name: sessionResult.session.user.name,
      email: sessionResult.session.user.email
    };
  }

  const scopedCartCookie = cookieStore.get(
    serverCartCookieName(accountScope)
  )?.value;
  const legacyGuestCartCookie =
    accountScope === GUEST_ACCOUNT_SCOPE
      ? cookieStore.get(LEGACY_SERVER_CART_COOKIE)?.value
      : undefined;
  const initialCart = await getServerCart(
    scopedCartCookie ?? legacyGuestCartCookie
  );

  if (sessionResult.error) {
    console.error(
      "Unable to resolve the storefront customer session.",
      sessionResult.error
    );
  }

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-cart-scope={accountScope}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "Store",
              "@id": `${siteUrl}/#store`,
              name: businessInfo.name,
              url: siteUrl,
              logo: absoluteUrl("/talomart-logo.png"),
              email: businessInfo.supportEmail,
              telephone: businessInfo.phone,
              address: {
                "@type": "PostalAddress",
                addressLocality: "Sirari",
                addressRegion: "Migori",
                addressCountry: "KE"
              },
              sameAs: Object.values(businessInfo.social)
            })
          }}
        />
        <ApplicationShell
          accountScope={accountScope}
          customer={customer}
          initialCart={initialCart}
          sessionUnavailable={sessionUnavailable}
          footer={<SiteFooter />}
        >
          {children}
        </ApplicationShell>
      </body>
    </html>
  );
}
