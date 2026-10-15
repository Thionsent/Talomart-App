import { afterEach, describe, expect, it } from "vitest";

import { canOptimizeStoreImage } from "./storefront-image";

const previousHost = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_HOST;
const previousBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;

afterEach(() => {
  if (previousHost === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_IMAGE_HOST;
  else process.env.NEXT_PUBLIC_SUPABASE_IMAGE_HOST = previousHost;
  if (previousBucket === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET;
  else process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET = previousBucket;
});

describe("storefront image optimizer allowlist", () => {
  it("optimizes local image paths but not protocol-relative URLs", () => {
    expect(canOptimizeStoreImage("/images/categories/audio.webp")).toBe(true);
    expect(canOptimizeStoreImage("/api/admin/products")).toBe(false);
    expect(canOptimizeStoreImage("//other.example/image.jpg")).toBe(false);
  });

  it("only optimizes public images in the configured storage bucket", () => {
    process.env.NEXT_PUBLIC_SUPABASE_IMAGE_HOST = "store.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET = "product-images";

    expect(canOptimizeStoreImage("https://store.supabase.co/storage/v1/object/public/product-images/products/test.webp")).toBe(true);
    expect(canOptimizeStoreImage("https://other.supabase.co/storage/v1/object/public/product-images/products/test.webp")).toBe(false);
    expect(canOptimizeStoreImage("https://store.supabase.co/storage/v1/object/public/private-files/test.webp")).toBe(false);
    expect(canOptimizeStoreImage("http://store.supabase.co/storage/v1/object/public/product-images/test.webp")).toBe(false);
  });
});
