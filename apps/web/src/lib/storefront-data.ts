import { sql } from "@talomart/db";

import {
  resolveCategoryImageUrl,
  type HomepagePreviewProduct,
  type StoreCategory,
  type StoreProduct
} from "@/lib/catalog";
import {
  hasConfiguredDatabase,
  logFallback,
  withTimeout
} from "@/lib/database-resilience";
import {
  resolveHomepageSections,
  type HomepageSection
} from "@/lib/homepage-content";
import {
  isHomepageBannerVisible,
  type HomepageBanner
} from "@/lib/homepage-banner";
import { MPESA_SANDBOX_TEST_PRODUCT_SLUG } from "@/lib/payments/mpesa-sandbox-product";
import { normalizeProductSpecifications } from "@/lib/product-specifications";
import { HOMEPAGE_FEATURED_LIMIT } from "@/lib/homepage-featured";

const categoryArt: Record<string, string> = {
  phones: "\u{1F4F1}",
  audio: "\u{1F3A7}",
  charging: "\u{1F50B}",
  storage: "\u{1F4BE}",
  cameras: "\u{1F4F7}",
  accessories: "\u231A"
};

type StoreProductRow = {
  id: string;
  slug: string;
  category: string;
  name: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  image: string | null;
  specifications: unknown;
};

function toStoreProduct(product: StoreProductRow): StoreProduct {
  const oldPrice = product.oldPrice ?? product.price;
  return {
    id: product.id,
    slug: product.slug,
    category: product.category,
    name: product.name,
    price: Math.round(product.price / 100),
    oldPrice: Math.round(oldPrice / 100),
    discount: oldPrice > product.price
      ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
      : 0,
    rating: 0,
    reviews: 0,
    stock: product.stock,
    image: product.image ?? "",
    specifications: normalizeProductSpecifications(product.specifications)
  };
}

const fallbackStorefrontData = {
  categories: [] as StoreCategory[],
  products: [] as StoreProduct[],
  discoveryProducts: [] as StoreProduct[],
  previewProducts: [] as HomepagePreviewProduct[],
  homepage: resolveHomepageSections([]),
  banners: [] as HomepageBanner[],
  catalogueUnavailable: true
};

export async function getStorefrontData(): Promise<{
  categories: StoreCategory[];
  products: StoreProduct[];
  discoveryProducts: StoreProduct[];
  previewProducts: HomepagePreviewProduct[];
  homepage: Record<HomepageSection["slot"], HomepageSection>;
  banners: HomepageBanner[];
  catalogueUnavailable: boolean;
}> {
  if (!hasConfiguredDatabase()) {
    return fallbackStorefrontData;
  }

  try {
    const queryResult = await withTimeout(
      Promise.all([
        sql<
          {
            name: string;
            slug: string;
            imageUrl: string | null;
            count: number;
          }[]
        >`
          select
            c.name,
            c.slug,
            c.image_url as "imageUrl",
            count(p.id)::int as count
          from categories c
          left join products p
            on p.category_id = c.id
            and p.is_active = true
            and p.slug <> ${MPESA_SANDBOX_TEST_PRODUCT_SLUG}
            and p.stock_quantity > p.reserved_quantity
          where c.is_active = true
          group by c.id, c.image_url
          order by c.sort_order asc, c.name asc
        `,
        sql<StoreProductRow[]>`
          select
            p.id::text,
            p.slug,
            c.name as category,
            p.name,
            p.specifications,
            p.price_minor as price,
            p.compare_at_price_minor as "oldPrice",
            greatest(p.stock_quantity - p.reserved_quantity, 0)::int as stock,
            (
              select pi.url
              from product_images pi
              where pi.product_id = p.id
                and pi.url <> ''
                and pi.url not like 'https://images.unsplash.com/%'
              order by pi.sort_order asc, pi.created_at asc
              limit 1
            ) as image
          from products p
          inner join categories c on c.id = p.category_id
          where p.is_active = true
            and c.is_active = true
            and p.slug <> ${MPESA_SANDBOX_TEST_PRODUCT_SLUG}
            and p.is_featured = true
            and p.stock_quantity > p.reserved_quantity
            and exists (
              select 1 from product_images pi
              where pi.product_id = p.id
                and pi.url <> ''
                and pi.url not like 'https://images.unsplash.com/%'
            )
          order by p.is_featured desc, p.created_at desc
          limit ${HOMEPAGE_FEATURED_LIMIT}
        `,
        sql<StoreProductRow[]>`
          with ranked as (
            select
              p.id::text,
              p.slug,
              c.name as category,
              p.name,
              p.specifications,
              p.price_minor as price,
              p.compare_at_price_minor as "oldPrice",
              greatest(p.stock_quantity - p.reserved_quantity, 0)::int as stock,
              (
                select pi.url
                from product_images pi
                where pi.product_id = p.id
                  and pi.url <> ''
                  and pi.url not like 'https://images.unsplash.com/%'
                order by pi.sort_order asc, pi.created_at asc
                limit 1
              ) as image,
              row_number() over (
                partition by p.category_id
                order by p.is_featured asc, md5(p.id::text || current_date::text)
              ) as category_position
            from products p
            inner join categories c on c.id = p.category_id
            where p.is_active = true
              and c.is_active = true
              and p.slug <> ${MPESA_SANDBOX_TEST_PRODUCT_SLUG}
              and p.price_minor > 0
              and p.stock_quantity > p.reserved_quantity
              and exists (
                select 1 from product_images pi
                where pi.product_id = p.id
                  and pi.url <> ''
                  and pi.url not like 'https://images.unsplash.com/%'
              )
          )
          select id, slug, category, name, specifications, price,
            "oldPrice", stock, image
          from ranked
          where category_position <= 5
          order by md5(id || current_date::text || 'talomart-discovery')
        `.catch((error) => {
          logFallback("Homepage discovery products are unavailable", error);
          return [] as StoreProductRow[];
        })
      ]),
      { label: "Storefront catalogue" }
    );
    const categories = queryResult?.[0] ?? null;
    const products = queryResult?.[1] ?? null;
    const discoveryProducts = queryResult?.[2] ?? [];
    const homepage = await withTimeout(
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
      { label: "Homepage content" }
    ).catch((error) => {
      logFallback("Homepage content is unavailable", error);
      return [] as HomepageSection[];
    });
    const banners = await withTimeout(
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
        order by sort_order asc, created_at desc
      `,
      { label: "Homepage banners" }
    ).catch((error) => {
      logFallback("Homepage banners are unavailable", error);
      return [] as HomepageBanner[];
    });

    // Empty results are a valid catalogue state. Query failures must never
    // turn sample merchandise into apparent live products.
    const catalogueUnavailable =
      !Array.isArray(categories) || !Array.isArray(products);
    if (catalogueUnavailable) {
      logFallback(
        "Storefront catalogue is unavailable",
        new Error("Catalogue query returned no result")
      );
    }

    // These are deliberately unpublished and unpriced. Never fetch or send
    // them to a production page, even if the live featured grid is empty.
    const previewProducts =
      process.env.NODE_ENV === "development" &&
      !catalogueUnavailable &&
      products?.length === 0
        ? await withTimeout(
            sql<HomepagePreviewProduct[]>`
              select
                p.sku,
                p.name,
                c.name as category,
                (
                  select pi.url
                  from product_images pi
                  where pi.product_id = p.id
                    and pi.url <> ''
                    and pi.url not like 'https://images.unsplash.com/%'
                  order by pi.sort_order asc, pi.created_at asc
                  limit 1
                ) as image
              from products p
              inner join categories c on c.id = p.category_id
              where p.sku like 'TLM-DRAFT-P%'
                and p.is_active = false
                and p.price_minor = 0
                and p.stock_quantity = 0
                and exists (
                  select 1 from product_images pi
                  where pi.product_id = p.id
                    and pi.url <> ''
                    and pi.url not like 'https://images.unsplash.com/%'
                )
              order by p.sku asc
              limit 10
            `,
            { label: "Local homepage product preview" }
          ).catch((error) => {
            logFallback("Local homepage product preview is unavailable", error);
            return [] as HomepagePreviewProduct[];
          })
        : [];

    return {
      categories: (categories ?? []).map((category) => ({
        ...category,
        art: categoryArt[category.slug] ?? "\u2728",
        imageUrl: resolveCategoryImageUrl(category.slug, category.imageUrl)
      })),
      products: (products ?? []).map(toStoreProduct),
      discoveryProducts: discoveryProducts.map(toStoreProduct),
      previewProducts,
      homepage: resolveHomepageSections(homepage),
      banners: banners.filter((banner) => isHomepageBannerVisible(banner)),
      catalogueUnavailable
    };
  } catch (error) {
    logFallback("Storefront catalogue is unavailable", error);

    return fallbackStorefrontData;
  }
}
