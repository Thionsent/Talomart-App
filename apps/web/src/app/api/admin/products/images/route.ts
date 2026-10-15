import { sql } from "@talomart/db";
import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/admin-authorization";
import { recordAdminAudit } from "@/lib/admin-audit";
import {
  hasMatchingImageSignature,
  validateImageFile
} from "@/lib/product-image-upload";
import { uploadAdminImage } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host : "";
  } catch {
    // An invalid Origin is never a trusted admin request.
  }
  if (!originHost || !host || originHost !== host) {
    return Response.json({ error: "This upload must come from Talomart admin." }, { status: 403 });
  }

  let actor;
  try {
    actor = await requireAdminPermission("catalog.manage", { mutation: true });
  } catch (error) {
    const rateLimited = error instanceof Error && error.message.startsWith("Too many administrator changes");
    return Response.json(
      { error: rateLimited ? "Upload rate limit reached. Wait one minute, then retry the remaining images." : "Administrator access is required." },
      { status: rateLimited ? 429 : 403 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 6 * 1024 * 1024) {
    return Response.json({ error: "Upload one image under 5MB at a time." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "The image upload could not be read." }, { status: 400 });
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const file = formData.get("image");
  const replaceExisting = formData.get("replaceExisting") === "true";

  if (!sku || sku.length > 80 || !(file instanceof File)) {
    return Response.json({ error: "Choose a product SKU and one image." }, { status: 400 });
  }
  const validationError = validateImageFile(file);
  if (validationError || !(await hasMatchingImageSignature(file))) {
    return Response.json(
      { error: validationError ?? "Image content does not match its file type." },
      { status: 400 }
    );
  }

  const [product] = await sql<
    { id: string; slug: string; name: string; imageId: string | null; imageUrl: string | null }[]
  >`
    select p.id::text, p.slug, p.name,
      (select pi.id::text from product_images pi where pi.product_id = p.id
       order by pi.sort_order, pi.created_at limit 1) as "imageId",
      (select pi.url from product_images pi where pi.product_id = p.id
       order by pi.sort_order, pi.created_at limit 1) as "imageUrl"
    from products p where lower(p.sku) = lower(${sku}) limit 1
  `;
  if (!product) {
    return Response.json({ error: `SKU ${sku} is not in the catalogue. Import the product first.` }, { status: 404 });
  }
  if (product.imageId && !replaceExisting) {
    return Response.json(
      { error: `SKU ${sku} already has a primary image. Explicitly select Replace to change it.` },
      { status: 409 }
    );
  }

  try {
    const imageUrl = await uploadAdminImage(file, {
      folder: "products",
      slug: `${product.slug}-${sku}`
    });

    if (product.imageId) {
      await sql`
        update product_images set url = ${imageUrl}, alt_text = ${product.name}, updated_at = now()
        where id = ${product.imageId}::uuid
      `;
    } else {
      await sql`
        insert into product_images (product_id, url, alt_text, sort_order)
        values (${product.id}::uuid, ${imageUrl}, ${product.name}, 0)
      `;
    }

    await recordAdminAudit(sql, actor, {
      action: "product.image_upload",
      resourceType: "product",
      resourceId: product.id,
      summary: `${product.imageId ? "Replaced" : "Added"} primary image for ${sku}`,
      before: product.imageUrl ? { imageUrl: product.imageUrl } : null,
      after: { imageUrl }
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    return Response.json({ sku, imageUrl });
  } catch (error) {
    console.error("Admin product image upload failed", error);
    return Response.json({ error: "The image could not be saved. Check Storage configuration and try again." }, { status: 500 });
  }
}
