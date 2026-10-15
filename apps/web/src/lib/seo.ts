import type { Metadata } from "next";

import { businessInfo } from "./business-info";

const fallbackSiteUrl = "https://talomart-app-web.vercel.app";

export const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")
    ? process.env.NEXT_PUBLIC_APP_URL
    : fallbackSiteUrl
).replace(/\/$/, "");

export const isIndexableDeployment =
  process.env.VERCEL_ENV !== "preview" &&
  process.env.APP_ENV !== "staging";

export function absoluteUrl(path: string) {
  return new URL(path, `${siteUrl}/`).toString();
}

export function isPlaceholderCatalogueImage(url: string) {
  return url.includes("photo-1516321318423-f06f85e504b3");
}

export function publicPageMetadata(
  title: string,
  description: string,
  path: string,
  image?: string | null
): Metadata {
  const images = [{
    url: image ? absoluteUrl(image) : absoluteUrl("/talomart-logo.png"),
    alt: image ? title : businessInfo.name
  }];

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: `${title} | ${businessInfo.name}`,
      description,
      url: absoluteUrl(path),
      siteName: businessInfo.name,
      locale: "en_KE",
      type: "website",
      images
    },
    twitter: { card: "summary_large_image", title, description, images },
    robots: isIndexableDeployment ? undefined : { index: false, follow: false }
  };
}

export const privatePageRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false }
};

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
