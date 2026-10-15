import { afterEach, describe, expect, it, vi } from "vitest";

import { isExistingBucketResponse } from "./supabase-storage-response";
import { uploadAdminImage } from "./supabase-storage";

vi.mock("@/lib/env", () => ({
  env: {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "test-secret-key-for-storage-only",
    SUPABASE_STORAGE_BUCKET: "product-images"
  }
}));

afterEach(() => vi.unstubAllGlobals());

describe("Supabase Storage bucket preparation", () => {
  it("accepts a standard HTTP conflict response", () => {
    expect(isExistingBucketResponse(409, "Conflict")).toBe(true);
  });

  it("accepts Supabase's HTTP 400 duplicate-bucket response", () => {
    expect(
      isExistingBucketResponse(
        400,
        JSON.stringify({
          statusCode: "409",
          error: "Duplicate",
          message: "The resource already exists",
          code: "BucketAlreadyExists"
        })
      )
    ).toBe(true);
  });

  it("does not hide unrelated storage failures", () => {
    expect(
      isExistingBucketResponse(
        403,
        JSON.stringify({ statusCode: "403", code: "AccessDenied" })
      )
    ).toBe(false);
  });
});

describe("Supabase Storage image upload", () => {
  it("sends generated image bytes instead of a File object", async () => {
    const bytes = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]);
    const file = new File([bytes], "framed.webp", { type: "image/webp" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("duplicate", { status: 409 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const url = await uploadAdminImage(file, { folder: "products", slug: "test-item" });

    expect(url).toContain("/storage/v1/object/public/product-images/products/test-item-");
    const uploadOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(uploadOptions.body).toBeInstanceOf(Uint8Array);
    expect(Array.from(uploadOptions.body as Uint8Array)).toEqual(Array.from(bytes));
    expect((uploadOptions.headers as Record<string, string>)["Content-Type"]).toBe("image/webp");
  });
});
