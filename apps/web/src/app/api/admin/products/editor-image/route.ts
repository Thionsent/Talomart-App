import { sql } from "@talomart/db";
import { z } from "zod";

import { requireAdminPermission } from "@/lib/admin-authorization";
import { hasMatchingImageSignature, validateImageFile } from "@/lib/product-image-upload";
import { uploadAdminImage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host : "";
  } catch {
    // Reject malformed or missing origins below.
  }
  if (!originHost || originHost !== host) {
    return Response.json({ error: "This upload must come from Talomart admin." }, { status: 403 });
  }

  try {
    await requireAdminPermission("catalog.manage", { mutation: true });
  } catch {
    return Response.json({ error: "Administrator access is required." }, { status: 403 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) {
    return Response.json({ error: "Upload one image under 5MB at a time." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "The image upload could not be read." }, { status: 400 });
  }

  const productId = z.string().uuid().safeParse(formData.get("productId"));
  const file = formData.get("image");
  if (!productId.success || !(file instanceof File)) {
    return Response.json({ error: "Choose a product and an image to save." }, { status: 400 });
  }

  const validationError = validateImageFile(file);
  if (validationError || !(await hasMatchingImageSignature(file))) {
    return Response.json(
      { error: validationError ?? "Image content does not match its file type." },
      { status: 400 }
    );
  }

  const [product] = await sql<{ slug: string }[]>`
    select slug from products where id = ${productId.data}::uuid limit 1
  `;
  if (!product) {
    return Response.json({ error: "This product no longer exists. Refresh the page." }, { status: 404 });
  }

  try {
    const imageUrl = await uploadAdminImage(file, { folder: "products", slug: product.slug });
    return Response.json({ imageUrl });
  } catch {
    return Response.json(
      { error: "The image could not be uploaded. Check Supabase Storage and try again." },
      { status: 500 }
    );
  }
}
