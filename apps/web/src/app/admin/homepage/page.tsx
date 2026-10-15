import {
  Archive,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  Pencil,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { AdminSubmitButton } from "@/app/admin/form-controls";
import { getAdminPrincipal } from "@/lib/admin-authorization";
import {
  defaultHomepageSections,
  homepageSectionSlots,
  mergeHomepageSections,
  type HomepageSection,
  type HomepageSectionSlot
} from "@/lib/homepage-content";
import { env } from "@/lib/env";
import {
  homepageBannerTones,
  isHomepageBannerVisible,
  type HomepageBanner
} from "@/lib/homepage-banner";
import { sql } from "@talomart/db";
import { MPESA_SANDBOX_TEST_PRODUCT_SLUG } from "@/lib/payments/mpesa-sandbox-product";
import { HOMEPAGE_FEATURED_LIMIT } from "@/lib/homepage-featured";

import {
  archiveHomepageBanner,
  createHomepageBanner,
  updateHomepageFeaturedProducts,
  updateHomepageBanner,
  updateHomepageSection
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage content" };

type HomepagePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FeaturedProduct = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  isFeatured: boolean;
  isActive: boolean;
  eligible: boolean;
};

const sectionLabels: Record<HomepageSectionSlot, { label: string; help: string }> = {
  hero: {
    label: "Fallback main hero",
    help: "Appears on the first screen only when no campaign banner is currently visible."
  },
  audio_promo: {
    label: "Fallback audio card",
    help: "Appears beside the fallback hero only when no campaign banner is visible."
  },
  power_promo: {
    label: "Fallback power card",
    help: "Appears beside the fallback hero; its power-bank illustration is part of the layout."
  },
  promise: {
    label: "Talomart promise",
    help: "The editable copy below the product sections. The three trust cards are fixed layout content."
  }
};

function publicationStatus(item: { isActive: boolean; startsAt: string | null; endsAt: string | null }, now: Date) {
  if (!item.isActive) return { label: "Unpublished", className: "bg-slate-100 text-slate-700" };
  if (item.startsAt && new Date(item.startsAt) > now) return { label: "Scheduled", className: "bg-blue-100 text-blue-800" };
  if (item.endsAt && new Date(item.endsAt) <= now) return { label: "Expired", className: "bg-amber-100 text-amber-800" };
  return { label: "Visible now", className: "bg-green-100 text-green-800" };
}

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return typeof item === "string" ? item : "";
}

function inputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function sectionBySlot(rows: HomepageSection[]) {
  return mergeHomepageSections(rows);
}

function BannerFields({ banner }: { banner?: HomepageBanner }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Internal name
          <input name="name" required minLength={2} maxLength={100} defaultValue={banner?.name ?? ""} placeholder="September phone campaign" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Eyebrow
          <input name="eyebrow" maxLength={120} defaultValue={banner?.eyebrow ?? ""} placeholder="LIMITED-TIME OFFER" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
      </div>

      <label className="mt-4 block text-sm font-bold text-slate-700">
        Customer-facing title
        <input name="title" required minLength={2} maxLength={180} defaultValue={banner?.title ?? ""} placeholder="Upgrade your everyday tech" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <label className="mt-4 block text-sm font-bold text-slate-700">
        Supporting text
        <textarea name="body" maxLength={600} defaultValue={banner?.body ?? ""} rows={3} placeholder="A short, clear description of this campaign." className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" />
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Desktop banner image
          <input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:font-bold file:text-green-800" />
          <span className="mt-1 block text-xs font-normal text-slate-500">JPG, PNG, WebP or AVIF, up to 5MB. Recommended 1800 × 720.</span>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Or image URL
          <input name="imageUrl" type="text" defaultValue={banner?.imageUrl ?? ""} placeholder="https://... or /images/..." className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
          <span className="mt-1 block text-xs font-normal text-slate-500">A new upload replaces the current URL.</span>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Mobile banner image
          <input name="mobileImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-1.5 file:font-bold file:text-green-800" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Optional portrait artwork. Recommended 900 × 1200. Desktop artwork is used when omitted.</span>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Or mobile image URL
          <input name="mobileImageUrl" type="text" defaultValue={banner?.mobileImageUrl ?? ""} placeholder="https://... or /images/..." className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
          <span className="mt-1 block text-xs font-normal text-slate-500">A new mobile upload replaces the current URL.</span>
        </label>
        <label className="text-sm font-bold text-slate-700 md:col-span-2">
          Image description for accessibility
          <input name="altText" required minLength={2} maxLength={180} defaultValue={banner?.altText ?? ""} placeholder="Describe what customers can see in the image" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Image focus — horizontal ({banner?.focalPointX ?? 50}%)
          <input name="focalPointX" type="range" min="0" max="100" defaultValue={banner?.focalPointX ?? 50} className="mt-3 w-full accent-[var(--color-green)]" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Move left or right to keep the important subject visible when cropped.</span>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Image focus — vertical ({banner?.focalPointY ?? 50}%)
          <input name="focalPointY" type="range" min="0" max="100" defaultValue={banner?.focalPointY ?? 50} className="mt-3 w-full accent-[var(--color-green)]" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Move up or down to control the crop across screen sizes.</span>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="text-sm font-bold text-slate-700">
          Button label
          <input name="ctaLabel" maxLength={80} defaultValue={banner?.ctaLabel ?? ""} placeholder="Shop now" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Button destination
          <input name="ctaHref" maxLength={300} defaultValue={banner?.ctaHref ?? ""} placeholder="/products or https://..." className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Text treatment
          <select name="tone" defaultValue={banner?.tone ?? "navy"} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3">
            {homepageBannerTones.map((tone) => (
              <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-bold text-slate-700">
          Display order
          <input name="sortOrder" type="number" min="0" max="1000" defaultValue={banner?.sortOrder ?? 0} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Starts
          <input name="startsAt" type="datetime-local" defaultValue={inputDate(banner?.startsAt ?? null)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-2" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Ends
          <input name="endsAt" type="datetime-local" defaultValue={inputDate(banner?.endsAt ?? null)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-2" />
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-slate-200 px-3 text-sm font-extrabold text-slate-700">
          <input type="checkbox" name="isActive" defaultChecked={banner?.isActive ?? true} className="h-4 w-4 accent-[var(--color-green)]" />
          Enabled for display
        </label>
      </div>
    </>
  );
}

function HomepageSectionForm({ section, now, fallbackStandby = false }: { section: HomepageSection; now: Date; fallbackStandby?: boolean }) {
  const meta = sectionLabels[section.slot];
  const publication = publicationStatus(section, now);
  const status = fallbackStandby && publication.label === "Visible now"
    ? { label: "Standby", className: "bg-slate-100 text-slate-700" }
    : publication;
  const hasRenderedImage = section.slot === "hero" || section.slot === "audio_promo";

  return (
    <form action={updateHomepageSection} className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
      <input type="hidden" name="slot" value={section.slot} />
      <input type="hidden" name="sortOrder" value={section.sortOrder} />
      {!hasRenderedImage && <input type="hidden" name="imageUrl" value={section.imageUrl ?? ""} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-green)]">{meta.label}</p>
          <p className="mt-1 text-sm text-slate-500">{meta.help}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>
          <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-700">
            <input type="checkbox" name="isActive" defaultChecked={section.isActive} className="h-4 w-4 accent-[var(--color-green)]" />
            Enabled
          </label>
        </div>
      </div>

      {(publication.label === "Scheduled" || publication.label === "Expired") && section.isActive && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          This saved copy is outside its schedule. {fallbackStandby ? "If the carousel stops showing, the approved default copy will be used instead." : "The approved default copy is shown instead until the schedule changes."}
        </p>
      )}

      <div className="mt-5">
        <label className="text-sm font-bold text-slate-700">
          Eyebrow
          <input name="eyebrow" defaultValue={section.eyebrow ?? ""} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
      </div>

      <label className="mt-4 block text-sm font-bold text-slate-700">
        Title
        <input name="title" required maxLength={180} defaultValue={section.title} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
      <label className="mt-4 block text-sm font-bold text-slate-700">
        Supporting text
        <textarea name="body" maxLength={600} defaultValue={section.body ?? ""} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3" />
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {hasRenderedImage && (
          <label className="text-sm font-bold text-slate-700">
            Image URL
            <input name="imageUrl" type="text" defaultValue={section.imageUrl ?? ""} placeholder="https://... or /images/..." className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
          </label>
        )}
        <label className="text-sm font-bold text-slate-700">
          CTA label
          <input name="ctaLabel" maxLength={80} defaultValue={section.ctaLabel ?? ""} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <label className="text-sm font-bold text-slate-700">
          CTA destination
          <input name="ctaHref" maxLength={300} defaultValue={section.ctaHref ?? ""} placeholder="/products or https://..." className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold text-slate-700">
            Starts
            <input name="startsAt" type="datetime-local" defaultValue={inputDate(section.startsAt)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-2" />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Ends
            <input name="endsAt" type="datetime-local" defaultValue={inputDate(section.endsAt)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-2" />
          </label>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <AdminSubmitButton className="min-h-11 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white" pendingLabel="Saving...">
          Save {meta.label.toLowerCase()}
        </AdminSubmitButton>
      </div>
    </form>
  );
}

export default async function AdminHomepagePage({ searchParams }: HomepagePageProps) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/sign-in");
  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) {
    redirect("/admin/security/setup");
  }
  if (!principal.can("homepage.manage")) redirect("/admin/no-access");

  const params = (await searchParams) ?? {};
  const notice = value(params, "notice");
  const error = value(params, "error");
  const [sections, products, banners] = await Promise.all([
    sql<HomepageSection[]>`
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
      order by sort_order asc, slot asc
    `,
    sql<FeaturedProduct[]>`
      select
        p.id::text,
        p.name,
        p.sku,
        c.name as "categoryName",
        p.is_featured as "isFeatured",
        p.is_active as "isActive",
        (p.is_active and c.is_active and p.price_minor > 0
          and p.stock_quantity > p.reserved_quantity
          and p.slug <> ${MPESA_SANDBOX_TEST_PRODUCT_SLUG}
          and exists (
            select 1 from product_images pi
            where pi.product_id = p.id and pi.url <> ''
              and pi.url not like 'https://images.unsplash.com/%'
          )) as eligible
      from products p
      inner join categories c on c.id = p.category_id
      order by p.is_featured desc, p.updated_at desc, p.name asc
      limit 200
    `,
    sql<HomepageBanner[]>`
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
      order by sort_order asc, updated_at desc
    `
  ]);
  const content = sectionBySlot(sections);
  const now = new Date();
  const activeFeaturedCount = products.filter((product) => product.isFeatured && product.eligible).length;
  const publishedBannerCount = banners.filter((banner) => banner.isActive).length;
  const visibleBannerCount = banners.filter((banner) => isHomepageBannerVisible(banner, now)).length;

  return (
    <AdminDashboardShell
      principal={principal}
      active="homepage"
      focus={{
        primary: `${visibleBannerCount} live banner${visibleBannerCount === 1 ? "" : "s"}`,
        secondary: `${activeFeaturedCount} featured product${activeFeaturedCount === 1 ? "" : "s"} · Keep merchandising current.`
      }}
    >
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-green)]">MERCHANDISING CONTROL</span>
            <h1 className="font-brand mt-2 text-4xl font-extrabold">Homepage content</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Manage the first screen, catalogue highlights and trust message in the order customers see them. The banner carousel takes priority; the old hero layout is a fallback only when no banner is visible.
            </p>
          </div>
          <Link href="/" target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold">
            View live homepage <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {notice && <div className="mt-6 flex gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-800"><CheckCircle2 className="h-5 w-5" /> {notice}</div>}
        {error && <div className="mt-6 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-800" role="alert"><XCircle className="h-5 w-5" /> {error}</div>}

        <section className="mt-7 rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-green-400">1 · Curated here</p>
              <h2 className="font-brand mt-2 text-2xl font-extrabold">Homepage banner carousel</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Add multiple responsive promotions, control their order, and schedule when each appears. Desktop and mobile artwork keep the first screen polished on every device. Unpublished or expired banners remain available here without appearing to customers.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-slate-200">
              {visibleBannerCount} visible now · {publishedBannerCount} enabled · {banners.length} total
            </span>
          </div>

          <details className="mt-6 rounded-2xl bg-white text-slate-900" open={banners.length === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-3 p-5 text-sm font-extrabold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-50 text-[var(--color-green)]"><ImagePlus className="h-5 w-5" /></span>
              Add a banner
            </summary>
            <form action={createHomepageBanner} className="border-t border-slate-100 p-5">
              <BannerFields />
              <div className="mt-5 flex justify-end">
                <AdminSubmitButton className="min-h-11 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white" pendingLabel="Creating banner...">
                  Create banner
                </AdminSubmitButton>
              </div>
            </form>
          </details>

          <div className="mt-5 grid gap-4">
            {banners.map((banner) => {
              const status = publicationStatus(banner, now);
              return (
              <article key={banner.id} className="overflow-hidden rounded-2xl bg-white text-slate-900">
                <div className="grid md:grid-cols-[220px_1fr]">
                  <div className="relative min-h-36 bg-slate-100 md:min-h-full">
                    <picture>
                      {banner.mobileImageUrl && <source media="(max-width: 767px)" srcSet={banner.mobileImageUrl} />}
                      <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${banner.focalPointX}% ${banner.focalPointY}%` }} />
                    </picture>
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="p-5">
                    <div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--color-green)]">Order {banner.sortOrder} · {banner.tone}</p>
                        <h3 className="font-brand mt-1 text-xl font-extrabold">{banner.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{banner.title}</p>
                      </div>
                    </div>
                    <details className="mt-4 rounded-2xl border border-slate-200">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-extrabold text-[var(--color-green)]"><Pencil className="h-4 w-4" /> Edit banner details</summary>
                      <form action={updateHomepageBanner} className="border-t border-slate-100 p-4">
                        <input type="hidden" name="id" value={banner.id} />
                        <BannerFields banner={banner} />
                        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                          <span className="text-xs leading-5 text-slate-500">Archiving removes the banner from the storefront while retaining its audit history.</span>
                          <AdminSubmitButton className="min-h-11 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white" pendingLabel="Saving banner...">
                            Save banner
                          </AdminSubmitButton>
                        </div>
                      </form>
                      <form action={archiveHomepageBanner} className="border-t border-slate-100 p-4">
                        <input type="hidden" name="id" value={banner.id} />
                        <AdminSubmitButton className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-extrabold text-red-700" pendingLabel="Archiving...">
                          <Archive className="h-4 w-4" /> Archive banner
                        </AdminSubmitButton>
                      </form>
                    </details>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <details className="mt-5 rounded-3xl border border-slate-200 bg-slate-50" open={visibleBannerCount === 0}>
          <summary className="cursor-pointer p-5 sm:p-6">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-green)]">First-screen backup</span>
            <span className="font-brand mt-1 block text-xl font-extrabold">Fallback hero and side cards</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              {visibleBannerCount > 0
                ? "On standby: the banner carousel is visible, so changes here will not appear on the first screen now."
                : "No banner is currently showing, so this older hero layout takes the first-screen slot."}
            </span>
          </summary>
          <div className="grid gap-5 border-t border-slate-200 p-5 sm:p-6">
            {homepageSectionSlots.filter((slot) => slot !== "promise").map((slot) => (
              <HomepageSectionForm key={slot} section={content[slot] ?? defaultHomepageSections[slot]} now={now} fallbackStandby={visibleBannerCount > 0} />
            ))}
          </div>
        </details>

        <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-green)]">2 · Managed in Categories</p>
              <h2 className="font-brand mt-2 text-2xl font-extrabold">Popular categories</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                The homepage shows active categories with available products. Names, images and category order come from Categories; the section heading is part of the storefront layout.
              </p>
            </div>
            <Link href="/admin?view=categories#categories" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-[var(--color-navy)]">
              Manage categories <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <form action={updateHomepageFeaturedProducts} className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-green)]">3 · Curated here</p>
              <h2 className="font-brand mt-2 text-2xl font-extrabold">Featured picks</h2>
              <p className="mt-1 text-sm text-slate-500">Choose up to {HOMEPAGE_FEATURED_LIMIT} ready-to-sell products. Inactive categories, missing images and out-of-stock items cannot be featured. The section heading is fixed; the products are managed here.</p>
            </div>
            <AdminSubmitButton className="min-h-11 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white" pendingLabel="Saving...">
              Save featured products
            </AdminSubmitButton>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {products.map((product) => (
              <label key={product.id} className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${product.eligible ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-60"}`}>
                <input type="checkbox" name="productIds" value={product.id} defaultChecked={product.isFeatured && product.eligible} disabled={!product.eligible} className="mt-1 h-4 w-4 accent-[var(--color-green)]" />
                <span className="min-w-0">
                  <strong className="block truncate">{product.name}</strong>
                  <span className="text-xs text-slate-500">{product.categoryName} · {product.sku}{!product.eligible && " · not ready for homepage"}</span>
                </span>
              </label>
            ))}
            {products.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                <LayoutTemplate className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2">Add active products before curating the homepage.</p>
              </div>
            )}
          </div>
        </form>

        <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-green)]">4 · Automatic selection</p>
              <h2 className="font-brand mt-2 text-2xl font-extrabold">Discover across Talomart</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                The store rotates up to five eligible, in-stock products from each category each day. This section is not manually curated; its heading is fixed in the storefront.
              </p>
            </div>
            <Link href="/admin?view=products#products" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-[var(--color-navy)]">
              Manage products <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-7">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--color-green)]">5 · Editable here</p>
          <HomepageSectionForm section={content.promise ?? defaultHomepageSections.promise} now={now} />
          <p className="mt-3 text-xs leading-5 text-slate-500">The secure checkout, order updates and returns cards beside this message are fixed storefront content, not controlled by this form.</p>
        </section>
      </section>
    </AdminDashboardShell>
  );
}
