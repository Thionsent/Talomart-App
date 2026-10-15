import { beforeEach, describe, expect, it, vi } from "vitest";

import { hasMatchingImageSignature } from "@/lib/product-image-upload";
import { uploadAdminImage } from "@/lib/supabase-storage";
import { POST } from "./route";

vi.mock("@talomart/db", () => ({
  sql: vi.fn().mockResolvedValue([{ slug: "test-product" }])
}));
vi.mock("@/lib/admin-authorization", () => ({
  requireAdminPermission: vi.fn().mockResolvedValue({ id: "test-admin" })
}));
vi.mock("@/lib/supabase-storage", () => ({
  uploadAdminImage: vi.fn().mockResolvedValue("https://example.test/framed.webp")
}));
vi.mock("@/lib/product-image-upload", () => ({
  validateImageFile: vi.fn().mockReturnValue(null),
  hasMatchingImageSignature: vi.fn().mockResolvedValue(true)
}));

const productId = "168bb374-8235-4a04-a0d7-29cd3db94228";

function requestWithImage(file: File) {
  const formData = new FormData();
  formData.set("productId", productId);
  formData.set("image", file);
  return new Request("http://localhost:3000/api/admin/products/editor-image", {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000" },
    body: formData
  });
}

beforeEach(() => vi.clearAllMocks());

describe("admin product editor image upload", () => {
  it("accepts a resized WebP and returns its stored URL", async () => {
    const webp = new File(
      [new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])],
      "framed.webp",
      { type: "image/webp" }
    );

    const response = await POST(requestWithImage(webp));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imageUrl: "https://example.test/framed.webp" });
    expect(uploadAdminImage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "image/webp" }),
      { folder: "products", slug: "test-product" }
    );
  });

  it("rejects a file when signature validation fails", async () => {
    vi.mocked(hasMatchingImageSignature).mockResolvedValueOnce(false);
    const response = await POST(requestWithImage(
      new File(["not an image"], "fake.webp", { type: "image/webp" })
    ));

    expect(response.status).toBe(400);
    expect(uploadAdminImage).not.toHaveBeenCalled();
  });
});
