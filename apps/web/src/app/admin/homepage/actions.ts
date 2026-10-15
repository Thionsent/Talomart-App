"use server";

import { sql } from "@talomart/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  homepageSectionSlots,
  type HomepageSectionSlot
} from "@/lib/homepage-content";
import {
  homepageBannerTones,
  type HomepageBanner
} from "@/lib/homepage-banner";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdminPermission } from "@/lib/admin-authorization";
import { uploadAdminImageFromForm } from "@/lib/supabase-storage";
import { MPESA_SANDBOX_TEST_PRODUCT_SLUG } from "@/lib/payments/mpesa-sandbox-product";
import { HOMEPAGE_FEATURED_LIMIT } from "@/lib/homepage-featured";

type HomepageSectionRow = {
  id: string;
  slot: HomepageSectionSlot;
  eyebrow: string | null;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function nullableDate(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid ${key} date.`);
  return parsed.toISOString();
}

const safeLink = z.string().refine(
  (value) =>
    value.startsWith("/") ||
    value.startsWith("#") ||
    (() => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    })(),
  "Use an internal path, anchor or HTTPS URL."
);

const sectionSchema = z
  .object({
    slot: z.enum(homepageSectionSlots),
    eyebrow: z.string().max(120).nullable(),
    title: z.string().min(2).max(180),
    body: z.string().max(600).nullable(),
    imageUrl: z
      .string()
      .refine(
        (value) =>
          !value ||
          value.startsWith("/") ||
          (() => {
            try {
              return new URL(value).protocol === "https:";
            } catch {
              return false;
            }
          })(),
        "Image URL must be a local path or HTTPS URL."
      )
      .nullable(),
    ctaLabel: z.string().max(80).nullable(),
    ctaHref: safeLink.nullable(),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(1000),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    endsAt: z.string().datetime({ offset: true }).nullable()
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after the start time."
      });
    }
    if ((value.ctaLabel && !value.ctaHref) || (!value.ctaLabel && value.ctaHref)) {
      context.addIssue({
        code: "custom",
        path: ["ctaLabel"],
        message: "Provide both a CTA label and destination, or leave both blank."
      });
    }
  });

const bannerSchema = z
  .object({
    name: z.string().min(2).max(100),
    eyebrow: z.string().max(120).nullable(),
    title: z.string().min(2).max(180),
    body: z.string().max(600).nullable(),
    imageUrl: z
      .string()
      .min(1, "Upload a banner image or provide an image URL.")
      .refine(
        (value) =>
          value.startsWith("/") ||
          (() => {
            try {
              return new URL(value).protocol === "https:";
            } catch {
              return false;
            }
          })(),
        "Image URL must be a local path or HTTPS URL."
      ),
    mobileImageUrl: z
      .string()
      .refine(
        (value) =>
          value.startsWith("/") ||
          (() => {
            try {
              return new URL(value).protocol === "https:";
            } catch {
              return false;
            }
          })(),
        "Mobile image URL must be a local path or HTTPS URL."
      )
      .nullable(),
    altText: z.string().min(2).max(180),
    ctaLabel: z.string().max(80).nullable(),
    ctaHref: safeLink.nullable(),
    tone: z.enum(homepageBannerTones),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(1000),
    focalPointX: z.number().int().min(0).max(100),
    focalPointY: z.number().int().min(0).max(100),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    endsAt: z.string().datetime({ offset: true }).nullable()
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End time must be after the start time."
      });
    }
    if ((value.ctaLabel && !value.ctaHref) || (!value.ctaLabel && value.ctaHref)) {
      context.addIssue({
        code: "custom",
        path: ["ctaLabel"],
        message: "Provide both a CTA label and destination, or leave both blank."
      });
    }
  });

async function bannerFromForm(
  formData: FormData,
  fallbackImageUrl?: string,
  fallbackMobileImageUrl?: string | null
) {
  const name = z.string().min(2).max(100).parse(text(formData, "name"));
  const uploadedImageUrl = await uploadAdminImageFromForm(formData, {
    folder: "homepage",
    slug: name
  });
  const uploadedMobileImageUrl = await uploadAdminImageFromForm(formData, {
    fieldName: "mobileImageFile",
    folder: "homepage",
    slug: `${name}-mobile`
  });

  return bannerSchema.parse({
    name,
    eyebrow: nullableText(formData, "eyebrow"),
    title: text(formData, "title"),
    body: nullableText(formData, "body"),
    imageUrl:
      uploadedImageUrl ??
      nullableText(formData, "imageUrl") ??
      fallbackImageUrl ??
      "",
    mobileImageUrl:
      uploadedMobileImageUrl ??
      nullableText(formData, "mobileImageUrl") ??
      fallbackMobileImageUrl ??
      null,
    altText: text(formData, "altText"),
    ctaLabel: nullableText(formData, "ctaLabel"),
    ctaHref: nullableText(formData, "ctaHref"),
    tone: text(formData, "tone") || "navy",
    isActive: checkbox(formData, "isActive"),
    sortOrder: Number.parseInt(text(formData, "sortOrder") || "0", 10),
    focalPointX: Number.parseInt(text(formData, "focalPointX") || "50", 10),
    focalPointY: Number.parseInt(text(formData, "focalPointY") || "50", 10),
    startsAt: nullableDate(formData, "startsAt"),
    endsAt: nullableDate(formData, "endsAt")
  });
}

async function bannerById(id: string) {
  const [banner] = await sql<HomepageBanner[]>`
    select
      id::text,
      name,
      eyebrow,
      title,
      body,
      image_url as "imageUrl",
      mobile_image_url as "mobileImageUrl",
      alt_text as "altText",
      cta_label as "ctaLabel",
      cta_href as "ctaHref",
      tone,
      is_active as "isActive",
      sort_order as "sortOrder",
      focal_point_x as "focalPointX",
      focal_point_y as "focalPointY",
      starts_at::text as "startsAt",
      ends_at::text as "endsAt"
    from homepage_banners
    where id = ${id}
  `;

  return banner;
}

function finish(notice: string) {
  revalidatePath("/");
  revalidatePath("/offers");
  revalidatePath("/admin/homepage");
  redirect(`/admin/homepage?notice=${encodeURIComponent(notice)}`);
}

function fail(error: unknown): never {
  const message = error instanceof z.ZodError
    ? error.issues[0]?.message ?? "Please check the form values."
    : error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
  redirect(`/admin/homepage?error=${encodeURIComponent(message)}`);
}

export async function updateHomepageSection(formData: FormData) {
  const actor = await requireAdminPermission("homepage.manage", { mutation: true });

  try {
    const slot = z.enum(homepageSectionSlots).parse(text(formData, "slot"));
    const section = sectionSchema.parse({
      slot,
      eyebrow: nullableText(formData, "eyebrow"),
      title: text(formData, "title"),
      body: nullableText(formData, "body"),
      imageUrl: nullableText(formData, "imageUrl"),
      ctaLabel: nullableText(formData, "ctaLabel"),
      ctaHref: nullableText(formData, "ctaHref"),
      isActive: checkbox(formData, "isActive"),
      sortOrder: Number.parseInt(text(formData, "sortOrder") || "0", 10),
      startsAt: nullableDate(formData, "startsAt"),
      endsAt: nullableDate(formData, "endsAt")
    });

    const [before] = await sql<HomepageSectionRow[]>`
      select
        id::text,
        slot,
        eyebrow,
        title,
        body,
        image_url as "imageUrl",
        cta_label as "ctaLabel",
        cta_href as "ctaHref",
        is_active as "isActive",
        sort_order as "sortOrder",
        starts_at::text as "startsAt",
        ends_at::text as "endsAt"
      from homepage_sections
      where slot = ${section.slot}
    `;

    const [saved] = await sql<{ id: string }[]>`
      insert into homepage_sections (
        slot,
        eyebrow,
        title,
        body,
        image_url,
        mobile_image_url,
        cta_label,
        cta_href,
        is_active,
        sort_order,
        focal_point_x,
        focal_point_y,
        starts_at,
        ends_at
      )
      values (
        ${section.slot},
        ${section.eyebrow},
        ${section.title},
        ${section.body},
        ${section.imageUrl},
        ${section.ctaLabel},
        ${section.ctaHref},
        ${section.isActive},
        ${section.sortOrder},
        ${section.startsAt},
        ${section.endsAt}
      )
      on conflict (slot) do update set
        eyebrow = excluded.eyebrow,
        title = excluded.title,
        body = excluded.body,
        image_url = excluded.image_url,
        cta_label = excluded.cta_label,
        cta_href = excluded.cta_href,
        is_active = excluded.is_active,
        sort_order = excluded.sort_order,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        updated_at = now()
      returning id::text
    `;

    await recordAdminAudit(sql, actor, {
      action: "homepage.section.update",
      resourceType: "homepage_section",
      resourceId: saved?.id ?? before?.id ?? null,
      summary: `Updated homepage ${section.slot} content`,
      before: before ?? null,
      after: section
    });
  } catch (error) {
    fail(error);
  }

  finish("Homepage content saved.");
}

export async function updateHomepageFeaturedProducts(formData: FormData) {
  const actor = await requireAdminPermission("homepage.manage", { mutation: true });

  try {
    const ids = z
      .array(z.string().uuid())
      .max(HOMEPAGE_FEATURED_LIMIT, `Select ${HOMEPAGE_FEATURED_LIMIT} products or fewer for the homepage.`)
      .parse(formData.getAll("productIds").map(String));

    const before = await sql<{ id: string }[]>`
      select id::text
      from products
      where is_featured = true
      order by updated_at desc
    `;

    await sql.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(hashtext('talomart-featured-products'))`;
      if (ids.length) {
        const countRows = await transaction<{ count: number }[]>`
          select count(*)::int as count
          from products p
          join categories c on c.id = p.category_id
          where p.id = any(${ids}::uuid[])
            and p.is_active = true and c.is_active = true
            and p.price_minor > 0
            and p.stock_quantity > p.reserved_quantity
            and p.slug <> ${MPESA_SANDBOX_TEST_PRODUCT_SLUG}
            and exists (
              select 1 from product_images pi
              where pi.product_id = p.id and pi.url <> ''
                and pi.url not like 'https://images.unsplash.com/%'
            )
        `;
        if ((countRows[0]?.count ?? 0) !== ids.length) {
          throw new Error("One or more selected products cannot appear on the homepage. Check category, price, stock and image.");
        }
      }
      await transaction`update products set is_featured = false, updated_at = now() where is_featured = true`;
      if (ids.length) {
        await transaction`
          update products
          set is_featured = true, updated_at = now()
          where id = any(${ids}::uuid[]) and is_active = true
        `;
      }
    });

    await recordAdminAudit(sql, actor, {
      action: "homepage.featured_products.update",
      resourceType: "homepage",
      summary: `Updated homepage featured products (${ids.length} selected)`,
      before: { productIds: before.map((row) => row.id) },
      after: { productIds: ids }
    });
  } catch (error) {
    fail(error);
  }

  finish("Homepage featured products saved.");
}

export async function createHomepageBanner(formData: FormData) {
  const actor = await requireAdminPermission("homepage.manage", { mutation: true });

  try {
    const banner = await bannerFromForm(formData);
    const [created] = await sql<{ id: string }[]>`
      insert into homepage_banners (
        name,
        eyebrow,
        title,
        body,
        image_url,
        mobile_image_url,
        alt_text,
        cta_label,
        cta_href,
        tone,
        is_active,
        sort_order,
        focal_point_x,
        focal_point_y,
        starts_at,
        ends_at
      ) values (
        ${banner.name},
        ${banner.eyebrow},
        ${banner.title},
        ${banner.body},
        ${banner.imageUrl},
        ${banner.mobileImageUrl},
        ${banner.altText},
        ${banner.ctaLabel},
        ${banner.ctaHref},
        ${banner.tone},
        ${banner.isActive},
        ${banner.sortOrder},
        ${banner.focalPointX},
        ${banner.focalPointY},
        ${banner.startsAt},
        ${banner.endsAt}
      )
      returning id::text
    `;

    await recordAdminAudit(sql, actor, {
      action: "homepage.banner.create",
      resourceType: "homepage_banner",
      resourceId: created?.id ?? null,
      summary: `Created homepage banner ${banner.name}`,
      after: banner
    });
  } catch (error) {
    fail(error);
  }

  finish("Homepage banner created.");
}

export async function updateHomepageBanner(formData: FormData) {
  const actor = await requireAdminPermission("homepage.manage", { mutation: true });

  try {
    const id = z.string().uuid().parse(text(formData, "id"));
    const before = await bannerById(id);
    if (!before) throw new Error("That homepage banner no longer exists.");

    const banner = await bannerFromForm(
      formData,
      before.imageUrl,
      before.mobileImageUrl
    );
    await sql`
      update homepage_banners set
        name = ${banner.name},
        eyebrow = ${banner.eyebrow},
        title = ${banner.title},
        body = ${banner.body},
        image_url = ${banner.imageUrl},
        mobile_image_url = ${banner.mobileImageUrl},
        alt_text = ${banner.altText},
        cta_label = ${banner.ctaLabel},
        cta_href = ${banner.ctaHref},
        tone = ${banner.tone},
        is_active = ${banner.isActive},
        sort_order = ${banner.sortOrder},
        focal_point_x = ${banner.focalPointX},
        focal_point_y = ${banner.focalPointY},
        starts_at = ${banner.startsAt},
        ends_at = ${banner.endsAt},
        updated_at = now()
      where id = ${id}
    `;

    await recordAdminAudit(sql, actor, {
      action: "homepage.banner.update",
      resourceType: "homepage_banner",
      resourceId: id,
      summary: `Updated homepage banner ${banner.name}`,
      before,
      after: banner
    });
  } catch (error) {
    fail(error);
  }

  finish("Homepage banner saved.");
}

export async function archiveHomepageBanner(formData: FormData) {
  const actor = await requireAdminPermission("homepage.manage", { mutation: true });

  try {
    const id = z.string().uuid().parse(text(formData, "id"));
    const before = await bannerById(id);
    if (!before) throw new Error("That homepage banner no longer exists.");

    await sql`
      update homepage_banners
      set is_active = false, updated_at = now()
      where id = ${id}
    `;

    await recordAdminAudit(sql, actor, {
      action: "homepage.banner.archive",
      resourceType: "homepage_banner",
      resourceId: id,
      summary: `Archived homepage banner ${before.name}`,
      before,
      after: { ...before, isActive: false }
    });
  } catch (error) {
    fail(error);
  }

  finish("Homepage banner archived.");
}
