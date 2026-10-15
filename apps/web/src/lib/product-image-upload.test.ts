import { describe, expect, it } from "vitest";

import {
  hasMatchingImageSignature,
  matchSkuFromImageFilename,
  validateImageFile
} from "./product-image-upload";

describe("product image upload", () => {
  it("matches an exact SKU filename or SKU-prefixed variant only", () => {
    const skus = ["TLM-INV-0015", "TLM-INV-00150"];
    expect(matchSkuFromImageFilename("tlm-inv-0015.webp", skus)).toBe("TLM-INV-0015");
    expect(matchSkuFromImageFilename("TLM-INV-0015-front.jpg", skus)).toBe("TLM-INV-0015");
    expect(matchSkuFromImageFilename("TLM-INV-00150.png", skus)).toBe("TLM-INV-00150");
    expect(matchSkuFromImageFilename("TLM-INV-00151.jpg", skus)).toBe("");
  });

  it("rejects unsupported or oversized files", () => {
    expect(validateImageFile({ type: "image/svg+xml", size: 100 })).toBeTruthy();
    expect(validateImageFile({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toBeTruthy();
    expect(validateImageFile({ type: "image/png", size: 100 })).toBeNull();
  });

  it("rejects a file whose bytes do not match its MIME type", async () => {
    const fake = new File(["not an image"], "item.png", { type: "image/png" });
    const valid = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "item.png",
      { type: "image/png" }
    );
    expect(await hasMatchingImageSignature(fake)).toBe(false);
    expect(await hasMatchingImageSignature(valid)).toBe(true);
  });
});
