import { describe, expect, it } from "vitest";

import { absoluteUrl, isPlaceholderCatalogueImage, publicPageMetadata, safeJsonLd } from "./seo";

describe("storefront SEO", () => {
  it("uses an absolute canonical URL for catalogue pages", () => {
    const metadata = publicPageMetadata(
      "Phones",
      "Browse phones at Talomart.",
      "/categories/phones"
    );

    expect(metadata.alternates?.canonical).toBe(absoluteUrl("/categories/phones"));
    expect(metadata.description).toBe("Browse phones at Talomart.");
  });

  it("escapes HTML in product structured data", () => {
    expect(safeJsonLd({ name: "<script>alert(1)</script>" }))
      .not.toContain("<script>");
    expect(safeJsonLd({ name: "<script>" }))
      .toContain("\\u003cscript>");
  });

  it("does not treat the catalogue fallback as a genuine product photo", () => {
    expect(isPlaceholderCatalogueImage("https://images.unsplash.com/photo-1516321318423-f06f85e504b3"))
      .toBe(true);
    expect(isPlaceholderCatalogueImage("https://example.com/product.jpg"))
      .toBe(false);
  });
});
