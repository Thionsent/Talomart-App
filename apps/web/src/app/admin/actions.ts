"use server";

import { sql } from "@talomart/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import {
  requireAdminPermission,
  type StaffPermission
} from "@/lib/admin-authorization";
import { recordAdminAudit } from "@/lib/admin-audit";
import { serializeDatabaseJson } from "@/lib/database-json";
import {
  enqueueOrderEmail,
  processPendingTransactionalEmails,
  type OrderEmailType
} from "@/lib/email";
import {
  assertOrderStatusTransition,
  fulfillmentStatusValues,
  orderStatusForFulfillment,
  type OrderStatus
} from "@/lib/order-status";
import { recordOrderStatusTransition } from "@/lib/order-status-history";
import { parseCsv, specificationsFromCsv } from "@/lib/product-bulk-csv";
import { uploadAdminImageFromForm } from "@/lib/supabase-storage";

const orderStatuses = [
  "pending_payment",
  "payment_confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
] as const;

const paymentStatuses = [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded"
] as const;

async function requireAdmin(permission: StaffPermission) {
  return requireAdminPermission(permission, { mutation: true });
}

function emailTypeForOrderStatus(status: OrderStatus): OrderEmailType | null {
  if (status === "out_for_delivery") return "order_dispatched";
  if (status === "delivered") return "order_delivered";
  if (status === "cancelled") return "order_cancelled";
  return null;
}

function scheduleEmailDelivery() {
  after(() => processPendingTransactionalEmails());
}

function finish(section: string, notice: string) {
  revalidatePath("/admin");
  redirect(
    `/admin?view=${encodeURIComponent(section)}&notice=${encodeURIComponent(notice)}#${section}`
  );
}

function actionErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Please check the form values.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function fail(section: string, error: unknown) {
  const message = actionErrorMessage(error);

  revalidatePath("/admin");
  redirect(
    `/admin?view=${encodeURIComponent(section)}&error=${encodeURIComponent(message)}#${section}`
  );
}

async function recordOrderEvent(
  runner: typeof sql,
  {
    orderId,
    actorId = null,
    type,
    audience = "customer",
    channel = "internal",
    status = "pending",
    payload = {}
  }: {
    orderId: string;
    actorId?: string | null;
    type: string;
    audience?: "customer" | "admin" | "operations";
    channel?: "internal" | "email" | "sms" | "whatsapp";
    status?: "pending" | "queued" | "sent" | "failed";
    payload?: Record<string, unknown>;
  }
) {
  await runner`
    insert into notification_events (
      order_id,
      actor_id,
      type,
      audience,
      channel,
      status,
      payload
    )
    values (
      ${orderId}::uuid,
      ${actorId},
      ${type},
      ${audience},
      ${channel},
      ${status},
      ${JSON.stringify(payload)}::jsonb
    )
  `;
}

async function releaseOrderReservations(
  runner: typeof sql,
  {
    orderId,
    orderNumber,
    actorId,
    reason
  }: {
    orderId: string;
    orderNumber: string;
    actorId: string;
    reason: string;
  }
) {
  const items = await runner<
    { productId: string | null; quantity: number; productName: string }[]
  >`
    select
      product_id::text as "productId",
      quantity,
      product_name as "productName"
    from order_items
    where order_id = ${orderId}::uuid
  `;

  for (const item of items) {
    if (!item.productId) continue;

    const [product] = await runner<
      { stockQuantity: number; reservedQuantity: number }[]
    >`
      update products
      set
        reserved_quantity = greatest(reserved_quantity - ${item.quantity}, 0),
        updated_at = now()
      where id = ${item.productId}::uuid
      returning
        stock_quantity as "stockQuantity",
        reserved_quantity as "reservedQuantity"
    `;

    if (product) {
      await runner`
        insert into inventory_movements (
          product_id,
          order_id,
          type,
          quantity,
          balance_after,
          reason,
          actor_id
        )
        values (
          ${item.productId}::uuid,
          ${orderId}::uuid,
          'release',
          ${item.quantity},
          ${product.stockQuantity - product.reservedQuantity},
          ${`${reason} ${orderNumber}`},
          ${actorId}
        )
      `;
    }
  }
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? value : null;
}

function integer(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function moneyMinor(formData: FormData, key: string) {
  const raw = text(formData, key);
  if (!raw) return null;
  const value = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function parseSpecifications(value: string): Record<string, string> {
  if (!value.trim()) return {};

  const specifications: Record<string, string> = {};

  for (const line of value.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const separator = trimmedLine.includes(":") ? ":" : "=";
    const [rawKey, ...rest] = trimmedLine.split(separator);
    const key = rawKey?.trim();
    const specificationValue = rest.join(separator).trim();

    if (key && specificationValue) {
      specifications[key] = specificationValue;
    }
  }

  return specifications;
}

const productSchema = z.object({
  categoryId: z.string().uuid(),
  sku: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(180),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-friendly slug."),
  shortDescription: z.string().trim().max(240).nullable(),
  description: z.string().trim().max(4000).nullable(),
  imageUrl: z.string().trim().url().nullable(),
  priceMinor: z.number().int().min(1),
  compareAtPriceMinor: z.number().int().min(1).nullable(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  specifications: z.record(z.string(), z.string())
});

const bulkImportModes = ["upsert", "create", "update"] as const;

async function productFromForm(formData: FormData) {
  const priceMinor = moneyMinor(formData, "price") ?? 0;
  const compareAtPriceMinor = moneyMinor(formData, "compareAtPrice");

  const product = productSchema.parse({
    categoryId: text(formData, "categoryId"),
    sku: text(formData, "sku"),
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    shortDescription: nullableText(formData, "shortDescription"),
    description: nullableText(formData, "description"),
    imageUrl: nullableText(formData, "imageUrl"),
    priceMinor,
    compareAtPriceMinor,
    stockQuantity: integer(formData, "stockQuantity"),
    lowStockThreshold: integer(formData, "lowStockThreshold", 5),
    isActive: checked(formData, "isActive"),
    isFeatured: checked(formData, "isFeatured"),
    specifications: parseSpecifications(text(formData, "specifications"))
  });

  const uploadedImageUrl = await uploadAdminImageFromForm(formData, {
    folder: "products",
    slug: product.slug
  });

  return {
    ...product,
    imageUrl: uploadedImageUrl ?? product.imageUrl
  };
}

function csvBoolean(value: string, fallback = false) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return fallback;
  if (["true", "yes", "1", "active", "featured"].includes(normalized)) return true;
  if (["false", "no", "0", "inactive", "archived"].includes(normalized)) return false;

  throw new Error(`Invalid boolean value "${value}". Use true or false.`);
}

function csvMoneyMinor(value: string, column: string) {
  const normalized = value.replace(/,/g, "").trim();

  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${column} value "${value}".`);
  }

  return Math.round(parsed * 100);
}

function csvInteger(value: string, column: string, fallback: number) {
  if (!value.trim()) return fallback;

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${column} value "${value}".`);
  }

  return parsed;
}

async function csvTextFromForm(formData: FormData) {
  const file = formData.get("csvFile");
  const pastedCsv = text(formData, "csvText");

  if (file instanceof File && file.size > 0) {
    return file.text();
  }

  return pastedCsv;
}

export async function createProduct(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  try {
  const product = await productFromForm(formData);

  const createdRows = await sql<{ id: string }[]>`
    insert into products (
      category_id,
      sku,
      name,
      slug,
      short_description,
      description,
      price_minor,
      compare_at_price_minor,
      stock_quantity,
      low_stock_threshold,
      is_active,
      is_featured,
      specifications
    )
    values (
      ${product.categoryId}::uuid,
      ${product.sku},
      ${product.name},
      ${product.slug},
      ${product.shortDescription},
      ${product.description},
      ${product.priceMinor},
      ${product.compareAtPriceMinor},
      ${product.stockQuantity},
      ${product.lowStockThreshold},
      ${product.isActive},
      ${product.isFeatured},
      ${serializeDatabaseJson(product.specifications)}::jsonb
    )
    returning id::text
  `;
  const created = createdRows[0];

  if (created && product.imageUrl) {
    await sql`
      insert into product_images (product_id, url, alt_text, sort_order)
      values (${created.id}::uuid, ${product.imageUrl}, ${product.name}, 0)
    `;
  }

  await recordAdminAudit(sql, actor, {
    action: "product.create",
    resourceType: "product",
    resourceId: created?.id ?? null,
    summary: `Created product ${product.sku}`,
    after: {
      sku: product.sku,
      name: product.name,
      priceMinor: product.priceMinor,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/products");
  } catch (error) {
    fail("products", error);
  }

  finish("products", "Product created successfully.");
}

export async function updateProduct(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  try {
  const productId = z.string().uuid().parse(text(formData, "productId"));
  const product = await productFromForm(formData);

  await sql`
    update products
    set
      category_id = ${product.categoryId}::uuid,
      sku = ${product.sku},
      name = ${product.name},
      slug = ${product.slug},
      short_description = ${product.shortDescription},
      description = ${product.description},
      price_minor = ${product.priceMinor},
      compare_at_price_minor = ${product.compareAtPriceMinor},
      stock_quantity = greatest(${product.stockQuantity}, reserved_quantity),
      low_stock_threshold = ${product.lowStockThreshold},
      is_active = ${product.isActive},
      is_featured = ${product.isFeatured},
      specifications = ${serializeDatabaseJson(product.specifications)}::jsonb,
      updated_at = now()
    where id = ${productId}::uuid
  `;

  await sql`delete from product_images where product_id = ${productId}::uuid`;

  if (product.imageUrl) {
    await sql`
      insert into product_images (product_id, url, alt_text, sort_order)
      values (${productId}::uuid, ${product.imageUrl}, ${product.name}, 0)
    `;
  }

  await recordAdminAudit(sql, actor, {
    action: "product.update",
    resourceType: "product",
    resourceId: productId,
    summary: `Updated product ${product.sku}`,
    after: {
      sku: product.sku,
      name: product.name,
      priceMinor: product.priceMinor,
      stockQuantity: product.stockQuantity,
      isActive: product.isActive
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${product.slug}`);
  } catch (error) {
    fail("products", error);
  }

  finish("products", "Product updated successfully.");
}

export async function archiveProduct(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  try {
  const productId = z.string().uuid().parse(text(formData, "productId"));

  await sql`
    update products
    set is_active = false, is_featured = false, updated_at = now()
    where id = ${productId}::uuid
  `;

  await recordAdminAudit(sql, actor, {
    action: "product.archive",
    resourceType: "product",
    resourceId: productId,
    summary: "Archived a product",
    after: { isActive: false, isFeatured: false }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/products");
  } catch (error) {
    fail("products", error);
  }

  finish("products", "Product archived.");
}

export async function bulkImportProducts(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  const actorId = actor.id;

  try {
    const mode = z.enum(bulkImportModes).parse(text(formData, "mode") || "upsert");
    const csv = await csvTextFromForm(formData);

    if (!csv.trim()) {
      throw new Error("Upload a CSV file or paste CSV rows before importing.");
    }

    const rows = parseCsv(csv);

    if (!rows.length) {
      throw new Error("The CSV has no product rows to import.");
    }

    if (rows.length > 500) {
      throw new Error("Import 500 products or fewer at a time.");
    }

    const categories = await sql<{ id: string; slug: string }[]>`
      select id::text, slug
      from categories
      where is_active = true
    `;
    const categoryBySlug = new Map(
      categories.map((category) => [category.slug, category.id])
    );

    const skus = rows.map((row) => row.sku.trim()).filter(Boolean);
    const existingProducts = skus.length
      ? await sql<
          {
            id: string;
            sku: string;
            slug: string;
            reservedQuantity: number;
            stockQuantity: number;
          }[]
        >`
          select
            id::text,
            sku,
            slug,
            reserved_quantity as "reservedQuantity",
            stock_quantity as "stockQuantity"
          from products
          where sku = any(${skus}::text[])
        `
      : [];
    const existingBySku = new Map(
      existingProducts.map((product) => [product.sku, product])
    );

    const slugs = rows.map((row) => row.slug.trim()).filter(Boolean);
    const productsBySlug = slugs.length
      ? await sql<{ sku: string; slug: string }[]>`
          select sku, slug
          from products
          where slug = any(${slugs}::text[])
        `
      : [];
    const slugOwnerBySlug = new Map(
      productsBySlug.map((product) => [product.slug, product.sku])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    await sql.begin(async (transaction) => {
      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        const existing = existingBySku.get(row.sku);

        if (!row.sku.trim()) {
          throw new Error(`Row ${rowNumber}: SKU is required.`);
        }

        if (!row.categorySlug.trim()) {
          throw new Error(`Row ${rowNumber}: categorySlug is required.`);
        }

        const categoryId = categoryBySlug.get(row.categorySlug);
        if (!categoryId) {
          throw new Error(
            `Row ${rowNumber}: category "${row.categorySlug}" does not exist or is archived.`
          );
        }

        if (mode === "create" && existing) {
          throw new Error(`Row ${rowNumber}: SKU "${row.sku}" already exists.`);
        }

        if (mode === "update" && !existing) {
          skipped += 1;
          continue;
        }

        const slugOwner = slugOwnerBySlug.get(row.slug);
        if (slugOwner && slugOwner !== row.sku) {
          throw new Error(
            `Row ${rowNumber}: slug "${row.slug}" is already used by SKU "${slugOwner}".`
          );
        }

        const product = productSchema.parse({
          categoryId,
          sku: row.sku,
          name: row.name,
          slug: row.slug,
          shortDescription: row.shortDescription.trim() || null,
          description: row.description.trim() || null,
          imageUrl: row.imageUrl.trim() || null,
          priceMinor: csvMoneyMinor(row.price, "price") ?? 0,
          compareAtPriceMinor: csvMoneyMinor(row.compareAtPrice, "compareAtPrice"),
          stockQuantity: csvInteger(row.stockQuantity, "stockQuantity", 0),
          lowStockThreshold: csvInteger(
            row.lowStockThreshold,
            "lowStockThreshold",
            5
          ),
          isActive: csvBoolean(row.isActive, true),
          isFeatured: csvBoolean(row.isFeatured, false),
          specifications: specificationsFromCsv(row.specifications)
        });

        if (existing && product.stockQuantity < existing.reservedQuantity) {
          throw new Error(
            `Row ${rowNumber}: stockQuantity cannot be below reserved quantity (${existing.reservedQuantity}).`
          );
        }

        if (existing) {
          await transaction`
            update products
            set
              category_id = ${product.categoryId}::uuid,
              sku = ${product.sku},
              name = ${product.name},
              slug = ${product.slug},
              short_description = ${product.shortDescription},
              description = ${product.description},
              price_minor = ${product.priceMinor},
              compare_at_price_minor = ${product.compareAtPriceMinor},
              stock_quantity = ${product.stockQuantity},
              low_stock_threshold = ${product.lowStockThreshold},
              is_active = ${product.isActive},
              is_featured = ${product.isFeatured},
              specifications = ${serializeDatabaseJson(product.specifications)}::jsonb,
              updated_at = now()
            where id = ${existing.id}::uuid
          `;

          const stockDelta = product.stockQuantity - existing.stockQuantity;
          if (stockDelta !== 0) {
            await transaction`
              insert into inventory_movements (
                product_id,
                type,
                quantity,
                balance_after,
                reason,
                actor_id
              )
              values (
                ${existing.id}::uuid,
                'adjustment',
                ${stockDelta},
                ${product.stockQuantity - existing.reservedQuantity},
                'Bulk product import/update',
                ${actorId}
              )
            `;
          }

          await transaction`delete from product_images where product_id = ${existing.id}::uuid`;

          if (product.imageUrl) {
            await transaction`
              insert into product_images (product_id, url, alt_text, sort_order)
              values (${existing.id}::uuid, ${product.imageUrl}, ${product.name}, 0)
            `;
          }

          updated += 1;
        } else {
          const [inserted] = await transaction<{ id: string }[]>`
            insert into products (
              category_id,
              sku,
              name,
              slug,
              short_description,
              description,
              price_minor,
              compare_at_price_minor,
              stock_quantity,
              low_stock_threshold,
              is_active,
              is_featured,
              specifications
            )
            values (
              ${product.categoryId}::uuid,
              ${product.sku},
              ${product.name},
              ${product.slug},
              ${product.shortDescription},
              ${product.description},
              ${product.priceMinor},
              ${product.compareAtPriceMinor},
              ${product.stockQuantity},
              ${product.lowStockThreshold},
              ${product.isActive},
              ${product.isFeatured},
              ${serializeDatabaseJson(product.specifications)}::jsonb
            )
            returning id::text
          `;

          if (!inserted) {
            throw new Error(`Row ${rowNumber}: product could not be created.`);
          }

          if (product.stockQuantity > 0) {
            await transaction`
              insert into inventory_movements (
                product_id,
                type,
                quantity,
                balance_after,
                reason,
                actor_id
              )
              values (
                ${inserted.id}::uuid,
                'purchase',
                ${product.stockQuantity},
                ${product.stockQuantity},
                'Bulk product import initial stock',
                ${actorId}
              )
            `;
          }

          if (product.imageUrl) {
            await transaction`
              insert into product_images (product_id, url, alt_text, sort_order)
              values (${inserted.id}::uuid, ${product.imageUrl}, ${product.name}, 0)
            `;
          }

          created += 1;
        }
      }
    });

    await recordAdminAudit(sql, actor, {
      action: "product.bulk_import",
      resourceType: "product_batch",
      summary: `Bulk import: ${created} created, ${updated} updated, ${skipped} skipped`,
      after: { mode, created, updated, skipped, submittedRows: rows.length }
    });

    revalidatePath("/admin");
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/categories");

    finish(
      "products",
      `Bulk import complete: ${created} created, ${updated} updated, ${skipped} skipped.`
    );
  } catch (error) {
    fail("products", error);
  }
}

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-friendly slug."),
  description: z.string().trim().max(800).nullable(),
  imageUrl: z.string().trim().url().nullable(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean()
});

async function categoryFromForm(formData: FormData) {
  const category = categorySchema.parse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    description: nullableText(formData, "description"),
    imageUrl: nullableText(formData, "imageUrl"),
    sortOrder: integer(formData, "sortOrder"),
    isActive: checked(formData, "isActive")
  });

  const uploadedImageUrl = await uploadAdminImageFromForm(formData, {
    folder: "categories",
    slug: category.slug
  });

  return {
    ...category,
    imageUrl: uploadedImageUrl ?? category.imageUrl
  };
}

export async function createCategory(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  try {
  const category = await categoryFromForm(formData);

  const [created] = await sql<{ id: string }[]>`
    insert into categories (
      name,
      slug,
      description,
      image_url,
      sort_order,
      is_active
    )
    values (
      ${category.name},
      ${category.slug},
      ${category.description},
      ${category.imageUrl},
      ${category.sortOrder},
      ${category.isActive}
    )
    returning id::text
  `;

  await recordAdminAudit(sql, actor, {
    action: "category.create",
    resourceType: "category",
    resourceId: created?.id ?? null,
    summary: `Created category ${category.name}`,
    after: { name: category.name, slug: category.slug, isActive: category.isActive }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/categories");
  } catch (error) {
    fail("categories", error);
  }

  finish("categories", "Category created successfully.");
}

export async function updateCategory(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  try {
  const categoryId = z.string().uuid().parse(text(formData, "categoryId"));
  const category = await categoryFromForm(formData);

  await sql`
    update categories
    set
      name = ${category.name},
      slug = ${category.slug},
      description = ${category.description},
      image_url = ${category.imageUrl},
      sort_order = ${category.sortOrder},
      is_active = ${category.isActive},
      updated_at = now()
    where id = ${categoryId}::uuid
  `;

  await recordAdminAudit(sql, actor, {
    action: "category.update",
    resourceType: "category",
    resourceId: categoryId,
    summary: `Updated category ${category.name}`,
    after: { name: category.name, slug: category.slug, isActive: category.isActive }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath(`/categories/${category.slug}`);
  } catch (error) {
    fail("categories", error);
  }

  finish("categories", "Category updated successfully.");
}

export async function archiveCategory(formData: FormData) {
  const actor = await requireAdmin("catalog.manage");
  try {
  const categoryId = z.string().uuid().parse(text(formData, "categoryId"));

  await sql`
    update categories
    set is_active = false, updated_at = now()
    where id = ${categoryId}::uuid
  `;

  await recordAdminAudit(sql, actor, {
    action: "category.archive",
    resourceType: "category",
    resourceId: categoryId,
    summary: "Archived a category",
    after: { isActive: false }
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/categories");
  } catch (error) {
    fail("categories", error);
  }

  finish("categories", "Category archived.");
}

export async function adjustInventory(formData: FormData) {
  const actor = await requireAdmin("inventory.manage");
  const actorId = actor.id;
  const returnSection =
    text(formData, "returnSection") === "low-stock" ? "low-stock" : "inventory";
  try {
  const productId = z.string().uuid().parse(text(formData, "productId"));
  const delta = z.number().int().refine((value) => value !== 0).parse(
    integer(formData, "quantityChange")
  );
  const reason = nullableText(formData, "reason") ?? "Manual stock adjustment";

  await sql.begin(async (transaction) => {
    const [updated] = await transaction<
      { stockQuantity: number; reservedQuantity: number }[]
    >`
      update products
      set
        stock_quantity = stock_quantity + ${delta},
        updated_at = now()
      where id = ${productId}::uuid
        and stock_quantity + ${delta} >= reserved_quantity
        and stock_quantity + ${delta} >= 0
      returning
        stock_quantity as "stockQuantity",
        reserved_quantity as "reservedQuantity"
    `;

    if (!updated) {
      throw new Error("Stock cannot be lower than reserved or below zero.");
    }

    await transaction`
      insert into inventory_movements (
        product_id,
        type,
        quantity,
        balance_after,
        reason,
        actor_id
      )
      values (
        ${productId}::uuid,
        ${delta > 0 ? "purchase" : "adjustment"},
        ${delta},
        ${updated.stockQuantity - updated.reservedQuantity},
        ${reason},
        ${actorId}
      )
    `;

    await recordAdminAudit(transaction as unknown as typeof sql, actor, {
      action: "inventory.adjust",
      resourceType: "product",
      resourceId: productId,
      summary: `Adjusted inventory by ${delta}`,
      after: {
        quantityChange: delta,
        stockQuantity: updated.stockQuantity,
        reservedQuantity: updated.reservedQuantity,
        reason
      }
    });
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/products");
  } catch (error) {
    fail(returnSection, error);
  }

  finish(returnSection, "Inventory movement recorded.");
}

async function applyOrderStatusTransition(
  runner: typeof sql,
  input: {
    orderId: string;
    orderNumber: string;
    currentStatus: OrderStatus;
    nextStatus: OrderStatus;
    actorId: string;
    source: "admin" | "fulfillment";
    reason?: string | null;
  }
) {
  assertOrderStatusTransition(input.currentStatus, input.nextStatus);
  if (input.currentStatus === input.nextStatus) return;

  const items = await runner<
    { productId: string | null; quantity: number; productName: string }[]
  >`
    select
      product_id::text as "productId",
      quantity,
      product_name as "productName"
    from order_items
    where order_id = ${input.orderId}::uuid
  `;
  const wasOpenReservation = ![
    "delivered",
    "cancelled",
    "returned"
  ].includes(input.currentStatus);
  const shouldDeliver = input.nextStatus === "delivered";
  const shouldRelease =
    ["cancelled", "returned"].includes(input.nextStatus) &&
    wasOpenReservation;
  const shouldReturnDelivered =
    input.nextStatus === "returned" && input.currentStatus === "delivered";

  for (const item of items) {
    if (!item.productId) continue;

    if (shouldDeliver) {
      const [product] = await runner<
        { stockQuantity: number; reservedQuantity: number }[]
      >`
        update products
        set
          stock_quantity = stock_quantity - ${item.quantity},
          reserved_quantity = greatest(reserved_quantity - ${item.quantity}, 0),
          updated_at = now()
        where id = ${item.productId}::uuid
          and stock_quantity >= ${item.quantity}
        returning
          stock_quantity as "stockQuantity",
          reserved_quantity as "reservedQuantity"
      `;

      if (!product) {
        throw new Error(
          `Unable to fulfil ${item.productName}; stock is too low.`
        );
      }

      await runner`
        insert into inventory_movements (
          product_id, order_id, type, quantity, balance_after, reason, actor_id
        ) values (
          ${item.productId}::uuid,
          ${input.orderId}::uuid,
          'sale',
          ${item.quantity},
          ${product.stockQuantity - product.reservedQuantity},
          ${`Delivered order ${input.orderNumber}`},
          ${input.actorId}
        )
      `;
    }

    if (shouldRelease) {
      const [product] = await runner<
        { stockQuantity: number; reservedQuantity: number }[]
      >`
        update products
        set
          reserved_quantity = greatest(reserved_quantity - ${item.quantity}, 0),
          updated_at = now()
        where id = ${item.productId}::uuid
        returning
          stock_quantity as "stockQuantity",
          reserved_quantity as "reservedQuantity"
      `;

      if (product) {
        await runner`
          insert into inventory_movements (
            product_id, order_id, type, quantity, balance_after, reason, actor_id
          ) values (
            ${item.productId}::uuid,
            ${input.orderId}::uuid,
            'release',
            ${item.quantity},
            ${product.stockQuantity - product.reservedQuantity},
            ${`Released reservation for order ${input.orderNumber}`},
            ${input.actorId}
          )
        `;
      }
    }

    if (shouldReturnDelivered) {
      const [product] = await runner<
        { stockQuantity: number; reservedQuantity: number }[]
      >`
        update products
        set stock_quantity = stock_quantity + ${item.quantity}, updated_at = now()
        where id = ${item.productId}::uuid
        returning
          stock_quantity as "stockQuantity",
          reserved_quantity as "reservedQuantity"
      `;

      if (product) {
        await runner`
          insert into inventory_movements (
            product_id, order_id, type, quantity, balance_after, reason, actor_id
          ) values (
            ${item.productId}::uuid,
            ${input.orderId}::uuid,
            'return',
            ${item.quantity},
            ${product.stockQuantity - product.reservedQuantity},
            ${`Returned order ${input.orderNumber}`},
            ${input.actorId}
          )
        `;
      }
    }
  }

  await runner`
    update orders
    set status = ${input.nextStatus}, updated_at = now()
    where id = ${input.orderId}::uuid
  `;

  await recordOrderStatusTransition(runner, {
    orderId: input.orderId,
    previousStatus: input.currentStatus,
    nextStatus: input.nextStatus,
    source: input.source,
    reason: input.reason ?? null,
    actorId: input.actorId
  });

  await recordOrderEvent(runner, {
    orderId: input.orderId,
    actorId: input.actorId,
    type: "order_status_changed",
    audience: "customer",
    payload: {
      orderNumber: input.orderNumber,
      previousStatus: input.currentStatus,
      nextStatus: input.nextStatus,
      source: input.source,
      reason: input.reason ?? null
    }
  });
}

const fulfillmentSchema = z.object({
  orderId: z.string().uuid(),
  courierName: z.string().trim().min(2).max(120),
  trackingNumber: z.string().trim().max(120).nullable(),
  status: z
    .enum(fulfillmentStatusValues)
    .default("processing"),
  notes: z.string().trim().max(500).nullable()
});

export async function createFulfillment(formData: FormData) {
  const actor = await requireAdmin("orders.manage");
  const actorId = actor.id;
  try {
  const fulfillment = fulfillmentSchema.parse({
    orderId: text(formData, "orderId"),
    courierName: text(formData, "courierName"),
    trackingNumber: nullableText(formData, "trackingNumber"),
    status: text(formData, "fulfillmentStatus") || "processing",
    notes: nullableText(formData, "notes")
  });

  await sql.begin(async (transaction) => {
    const runner = transaction as unknown as typeof sql;
    const [order] = await transaction<
      {
        orderNumber: string;
        status: OrderStatus;
        paymentMethod: "mpesa" | "cash_on_delivery";
        paymentStatus: (typeof paymentStatuses)[number];
      }[]
    >`
      select
        o.order_number as "orderNumber",
        o.status,
        o.payment_method as "paymentMethod",
        coalesce(p.status, 'pending') as "paymentStatus"
      from orders o
      left join lateral (
        select status
        from payments
        where order_id = o.id
        order by created_at desc
        limit 1
      ) p on true
      where o.id = ${fulfillment.orderId}::uuid
      for update of o
    `;
    if (!order) throw new Error("Order not found.");

    const synchronizedStatus = orderStatusForFulfillment(fulfillment.status);
    if (
      order.paymentMethod === "mpesa" &&
      order.paymentStatus !== "paid" &&
      synchronizedStatus !== order.status
    ) {
      throw new Error(
        "Wait for Daraja to confirm this M-Pesa payment before progressing fulfilment."
      );
    }

    await applyOrderStatusTransition(runner, {
      orderId: fulfillment.orderId,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      nextStatus: synchronizedStatus,
      actorId,
      source: "fulfillment"
    });

    await transaction`
      insert into fulfillments (
        order_id,
        courier_name,
        tracking_number,
        status,
        notes,
        actor_id,
        shipped_at,
        delivered_at
      )
      values (
        ${fulfillment.orderId}::uuid,
        ${fulfillment.courierName},
        ${fulfillment.trackingNumber},
        ${fulfillment.status},
        ${fulfillment.notes},
        ${actorId},
        case
          when ${fulfillment.status} in ('shipped', 'out_for_delivery', 'delivered') then now()
          else null
        end,
        case
          when ${fulfillment.status} = 'delivered' then now()
          else null
        end
      )
    `;

    await recordOrderEvent(runner, {
      orderId: fulfillment.orderId,
      actorId,
      type: "fulfillment_updated",
      audience: "customer",
      payload: {
        status: fulfillment.status,
        courierName: fulfillment.courierName,
        trackingNumber: fulfillment.trackingNumber
      }
    });

    const emailType = emailTypeForOrderStatus(synchronizedStatus);
    if (emailType) {
      await enqueueOrderEmail(runner, {
        orderId: fulfillment.orderId,
        type: emailType
      });
    }

    await recordAdminAudit(runner, actor, {
      action: "fulfillment.create",
      resourceType: "order",
      resourceId: fulfillment.orderId,
      summary: `Added ${fulfillment.status} fulfillment record`,
      after: {
        courierName: fulfillment.courierName,
        trackingNumber: fulfillment.trackingNumber,
        status: fulfillment.status
      }
    });
  });

  scheduleEmailDelivery();

  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/track");
  } catch (error) {
    fail("orders", error);
  }

  finish("orders", "Fulfillment record added.");
}

export async function confirmCodPayment(formData: FormData) {
  const actor = await requireAdmin("orders.manage");
  const actorId = actor.id;

  try {
    const orderId = z.string().uuid().parse(text(formData, "orderId"));

    await sql.begin(async (transaction) => {
      const [order] = await transaction<
        {
          id: string;
          orderNumber: string;
          status: (typeof orderStatuses)[number];
          paymentMethod: "mpesa" | "cash_on_delivery";
          paymentStatus: (typeof paymentStatuses)[number];
        }[]
      >`
        select
          o.id::text,
          o.order_number as "orderNumber",
          o.status,
          o.payment_method as "paymentMethod",
          coalesce(p.status, 'pending') as "paymentStatus"
        from orders o
        left join lateral (
          select status
          from payments
          where order_id = o.id
          order by created_at desc
          limit 1
        ) p on true
        where o.id = ${orderId}::uuid
        for update of o
      `;

      if (!order) throw new Error("Order not found.");
      if (order.paymentMethod !== "cash_on_delivery") {
        throw new Error("Manual COD collection is only available for Cash on Delivery orders.");
      }
      if (order.status !== "delivered") {
        throw new Error("Deliver the COD order before confirming payment collection.");
      }
      if (order.paymentStatus === "paid") {
        throw new Error("This COD order is already marked as paid.");
      }

      await transaction`
        update payments
        set
          status = 'paid',
          paid_at = coalesce(paid_at, now()),
          failure_reason = null,
          updated_at = now()
        where order_id = ${orderId}::uuid
      `;

      await recordOrderEvent(transaction as unknown as typeof sql, {
        orderId,
        actorId,
        type: "cod_payment_collected",
        audience: "operations",
        payload: {
          orderNumber: order.orderNumber,
          message: "Cash on Delivery payment was manually confirmed by admin."
        }
      });

      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId,
        type: "payment_confirmed"
      });

      await recordAdminAudit(transaction as unknown as typeof sql, actor, {
        action: "payment.confirm_cod",
        resourceType: "order",
        resourceId: orderId,
        summary: `Confirmed COD payment for ${order.orderNumber}`,
        before: { paymentStatus: order.paymentStatus },
        after: { paymentStatus: "paid" }
      });
    });

    scheduleEmailDelivery();

    revalidatePath("/admin");
    revalidatePath("/account");
    revalidatePath("/track");
  } catch (error) {
    fail("orders", error);
  }

  finish("orders", "COD payment confirmed as collected.");
}

export async function cancelOrder(formData: FormData) {
  const actor = await requireAdmin("orders.manage");
  const actorId = actor.id;

  try {
    const orderId = z.string().uuid().parse(text(formData, "orderId"));
    const reason =
      nullableText(formData, "cancelReason") ??
      "Cancelled by admin and released reservation for order";

    await sql.begin(async (transaction) => {
      const [order] = await transaction<
        {
          id: string;
          orderNumber: string;
          status: (typeof orderStatuses)[number];
          paymentMethod: "mpesa" | "cash_on_delivery";
          paymentStatus: (typeof paymentStatuses)[number];
        }[]
      >`
        select
          o.id::text,
          o.order_number as "orderNumber",
          o.status,
          o.payment_method as "paymentMethod",
          coalesce(p.status, 'pending') as "paymentStatus"
        from orders o
        left join payments p on p.order_id = o.id
        where o.id = ${orderId}::uuid
        for update of o
      `;

      if (!order) throw new Error("Order not found.");
      if (["delivered", "returned"].includes(order.status)) {
        throw new Error("Delivered or returned orders should use the return workflow, not cancellation.");
      }
      if (order.status === "cancelled") {
        throw new Error("This order is already cancelled.");
      }
      if (order.paymentStatus === "paid") {
        throw new Error("Paid orders cannot be cancelled from this shortcut. Refund or return first.");
      }

      await releaseOrderReservations(transaction as unknown as typeof sql, {
        orderId,
        orderNumber: order.orderNumber,
        actorId,
        reason
      });

      await transaction`
        update orders
        set status = 'cancelled', updated_at = now()
        where id = ${orderId}::uuid
      `;

      await recordOrderStatusTransition(
        transaction as unknown as typeof sql,
        {
          orderId,
          previousStatus: order.status,
          nextStatus: "cancelled",
          source: "admin",
          reason,
          actorId
        }
      );

      await transaction`
        update payments
        set
          status = 'failed',
          failure_reason = ${reason},
          updated_at = now()
        where order_id = ${orderId}::uuid
          and status <> 'paid'
      `;

      await recordOrderEvent(transaction as unknown as typeof sql, {
        orderId,
        actorId,
        type: "order_cancelled",
        audience: "customer",
        payload: {
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          reason
        }
      });

      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId,
        type: "order_cancelled"
      });

      await recordAdminAudit(transaction as unknown as typeof sql, actor, {
        action: "order.cancel",
        resourceType: "order",
        resourceId: orderId,
        summary: `Cancelled ${order.orderNumber}`,
        before: {
          orderStatus: order.status,
          paymentStatus: order.paymentStatus
        },
        after: { orderStatus: "cancelled", paymentStatus: "failed", reason }
      });
    });

    scheduleEmailDelivery();

    revalidatePath("/admin");
    revalidatePath("/account");
    revalidatePath("/track");
    revalidatePath("/products");
  } catch (error) {
    fail("orders", error);
  }

  finish("orders", "Order cancelled and reserved stock released.");
}

export async function updateOrder(formData: FormData) {
  const actor = await requireAdmin("orders.manage");
  const actorId = actor.id;
  try {
  const orderId = z.string().uuid().parse(text(formData, "orderId"));
  const status = z.enum(orderStatuses).parse(text(formData, "status"));
  const paymentStatus = z.enum(paymentStatuses).parse(text(formData, "paymentStatus"));
  const changeReason = nullableText(formData, "changeReason");

  await sql.begin(async (transaction) => {
    const [order] = await transaction<
      {
        id: string;
        orderNumber: string;
        currentStatus: (typeof orderStatuses)[number];
        paymentMethod: "mpesa" | "cash_on_delivery";
        currentPaymentStatus: (typeof paymentStatuses)[number];
      }[]
    >`
      select
        o.id::text,
        order_number as "orderNumber",
        o.status as "currentStatus",
        o.payment_method as "paymentMethod",
        coalesce(p.status, 'pending') as "currentPaymentStatus"
      from orders o
      left join lateral (
        select status
        from payments
        where order_id = o.id
        order by created_at desc
        limit 1
      ) p on true
      where o.id = ${orderId}::uuid
      for update of o
    `;

    if (!order) throw new Error("Order not found.");

    if (order.currentStatus === "cancelled") {
      throw new Error("Cancelled orders cannot be updated. Create a new order instead.");
    }

    if (status === "cancelled") {
      throw new Error(
        "Use the dedicated cancellation control so the reason and stock release are recorded."
      );
    }

    if (
      ((status === "returned" && status !== order.currentStatus) ||
        (paymentStatus === "refunded" &&
          paymentStatus !== order.currentPaymentStatus)) &&
      (!changeReason || changeReason.length < 5)
    ) {
      throw new Error(
        "Enter a reason of at least 5 characters for a return or refund."
      );
    }

    assertOrderStatusTransition(order.currentStatus, status);

    if (
      order.paymentMethod === "mpesa" &&
      paymentStatus !== order.currentPaymentStatus
    ) {
      throw new Error(
        "M-Pesa payment status is controlled by Daraja and cannot be changed manually."
      );
    }

    if (
      order.paymentMethod === "mpesa" &&
      order.currentPaymentStatus !== "paid" &&
      status !== order.currentStatus
    ) {
      throw new Error(
        "Wait for Daraja to confirm this M-Pesa payment before progressing the order."
      );
    }

    if (
      order.paymentMethod === "cash_on_delivery" &&
      paymentStatus === "paid" &&
      paymentStatus !== order.currentPaymentStatus
    ) {
      throw new Error(
        "Save the order as delivered first, then use Mark COD as paid after collecting the cash."
      );
    }

    await applyOrderStatusTransition(transaction as unknown as typeof sql, {
      orderId,
      orderNumber: order.orderNumber,
      currentStatus: order.currentStatus,
      nextStatus: status,
      actorId,
      source: "admin",
      reason: changeReason
    });

    await transaction`
      update payments
      set
        status = ${paymentStatus},
        paid_at = case
          when ${paymentStatus} = 'paid' and paid_at is null then now()
          when ${paymentStatus} <> 'paid' then null
          else paid_at
        end,
        updated_at = now()
      where order_id = ${orderId}::uuid
    `;

    if (order.currentPaymentStatus !== paymentStatus) {
      await recordOrderEvent(transaction as unknown as typeof sql, {
        orderId,
        actorId,
        type: "payment_status_changed",
        audience: "operations",
        payload: {
          orderNumber: order.orderNumber,
          paymentMethod: order.paymentMethod,
          previousPaymentStatus: order.currentPaymentStatus,
          nextPaymentStatus: paymentStatus
        }
      });
    }

    if (
      order.paymentMethod === "cash_on_delivery" &&
      status === "delivered" &&
      paymentStatus !== "paid"
    ) {
      await recordOrderEvent(transaction as unknown as typeof sql, {
        orderId,
        actorId,
        type: "cod_collection_required",
        audience: "operations",
        payload: {
          orderNumber: order.orderNumber,
          message: "Collect and confirm Cash on Delivery payment."
        }
      });
    }

    if (order.currentStatus !== status) {
      const emailType = emailTypeForOrderStatus(status);
      if (emailType) {
        await enqueueOrderEmail(transaction as unknown as typeof sql, {
          orderId,
          type: emailType
        });
      }
    }

    if (
      order.currentPaymentStatus !== paymentStatus &&
      paymentStatus === "refunded"
    ) {
      await enqueueOrderEmail(transaction as unknown as typeof sql, {
        orderId,
        type: "payment_refunded"
      });
    }

    await recordAdminAudit(transaction as unknown as typeof sql, actor, {
      action: "order.update",
      resourceType: "order",
      resourceId: orderId,
      summary: `Updated ${order.orderNumber}`,
      before: {
        orderStatus: order.currentStatus,
        paymentStatus: order.currentPaymentStatus
      },
      after: { orderStatus: status, paymentStatus, reason: changeReason }
    });
  });

  scheduleEmailDelivery();

  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/track");
  } catch (error) {
    fail("orders", error);
  }

  finish("orders", "Order updated successfully.");
}
