import { sql } from "@talomart/db";

import { storefrontCategories, storefrontProducts } from "@/lib/catalog";
import {
  hasConfiguredDatabase,
  logFallback,
  withTimeout
} from "@/lib/database-resilience";

export interface CatalogueCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  count: number;
}

export interface CatalogueProduct {
  id: string;
  sku: string;
  slug: string;
  category: string;
  categorySlug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  oldPrice: number;
  discount: number;
  stock: number;
  lowStockThreshold: number;
  image: string;
  images: { url: string; altText: string }[];
  specifications: Record<string, string>;
  isFeatured: boolean;
}

const fallbackImage =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85";

function toDisplayPrice(value: number) {
  return Math.round(value / 100);
}

function toDiscount(priceMinor: number, compareAtPriceMinor: number | null) {
  if (!compareAtPriceMinor || compareAtPriceMinor <= priceMinor) return 0;
  return Math.round(
    ((compareAtPriceMinor - priceMinor) / compareAtPriceMinor) * 100
  );
}

function fallbackCategories(): CatalogueCategory[] {
  return storefrontCategories.map((category) => ({
      id: category.slug,
      name: category.name,
      slug: category.slug,
      description: null,
      imageUrl: null,
      count: category.count
  }));
}

export async function getCategories(): Promise<CatalogueCategory[]> {
  if (!hasConfiguredDatabase()) {
    return fallbackCategories();
  }

  try {
    const categories = await withTimeout(
      sql<CatalogueCategory[]>`
        select
          c.id::text,
          c.name,
          c.slug,
          c.description,
          c.image_url as "imageUrl",
          count(p.id)::int as count
        from categories c
        left join products p
          on p.category_id = c.id
          and p.is_active = true
        where c.is_active = true
        group by c.id
        order by c.sort_order asc, c.name asc
      `,
      { label: "Category catalogue" }
    );

    return categories.length ? categories : fallbackCategories();
  } catch (error) {
    logFallback("Category catalogue is unavailable", error);
    return fallbackCategories();
  }
}

export async function getProducts(options?: {
  categorySlug?: string | undefined;
  query?: string | undefined;
  sort?: string | undefined;
  limit?: number | undefined;
}): Promise<CatalogueProduct[]> {
  const fallback = storefrontProducts
    .filter((product) => {
      const categoryMatches =
        !options?.categorySlug ||
        product.category.toLowerCase() === options.categorySlug;
      const queryMatches =
        !options?.query ||
        product.name.toLowerCase().includes(options.query.toLowerCase());

      return categoryMatches && queryMatches;
    })
    .map((product) => ({
      ...product,
      sku: product.id,
      categorySlug: product.category.toLowerCase(),
      shortDescription: null,
      description: null,
      lowStockThreshold: 5,
      images: [{ url: product.image, altText: product.name }],
      specifications: {},
      isFeatured: true
    }));

  if (!hasConfiguredDatabase()) {
    return fallback;
  }

  let rows: {
    id: string;
    sku: string;
    slug: string;
    category: string;
    categorySlug: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    priceMinor: number;
    compareAtPriceMinor: number | null;
    stock: number;
    lowStockThreshold: number;
    image: string | null;
    specifications: Record<string, string>;
    isFeatured: boolean;
  }[];

  try {
    rows = await withTimeout(
      sql<typeof rows>`
        select
          p.id::text,
          p.sku,
          p.slug,
          c.name as category,
          c.slug as "categorySlug",
          p.name,
          p.short_description as "shortDescription",
          p.description,
          p.price_minor as "priceMinor",
          p.compare_at_price_minor as "compareAtPriceMinor",
          greatest(p.stock_quantity - p.reserved_quantity, 0)::int as stock,
          p.low_stock_threshold as "lowStockThreshold",
          p.specifications,
          p.is_featured as "isFeatured",
          (
            select pi.url
            from product_images pi
            where pi.product_id = p.id
            order by pi.sort_order asc, pi.created_at asc
            limit 1
          ) as image
        from products p
        inner join categories c on c.id = p.category_id
        where p.is_active = true
          and c.is_active = true
          and (${options?.categorySlug ?? null}::text is null or c.slug = ${options?.categorySlug ?? null})
          and (
            ${options?.query ?? null}::text is null
            or p.name ilike '%' || ${options?.query ?? null} || '%'
            or p.sku ilike '%' || ${options?.query ?? null} || '%'
            or c.name ilike '%' || ${options?.query ?? null} || '%'
          )
        order by
          case when ${options?.sort ?? "featured"} = 'price-low' then p.price_minor end asc,
          case when ${options?.sort ?? "featured"} = 'price-high' then p.price_minor end desc,
          case when ${options?.sort ?? "featured"} = 'newest' then p.created_at end desc,
          p.is_featured desc,
          p.created_at desc
        limit ${options?.limit ?? 60}
      `,
      { label: "Product catalogue" }
    );
  } catch (error) {
    logFallback("Product catalogue is unavailable", error);
    return fallback;
  }

  return rows.map((product) => {
    const oldPriceMinor = product.compareAtPriceMinor ?? product.priceMinor;
    const image = product.image ?? fallbackImage;

    return {
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      category: product.category,
      categorySlug: product.categorySlug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      price: toDisplayPrice(product.priceMinor),
      oldPrice: toDisplayPrice(oldPriceMinor),
      discount: toDiscount(product.priceMinor, product.compareAtPriceMinor),
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      image,
      images: [{ url: image, altText: product.name }],
      specifications: product.specifications ?? {},
      isFeatured: product.isFeatured
    };
  });
}

export async function getProductBySlug(slug: string) {
  if (!hasConfiguredDatabase()) {
    return (
      (await getProducts({ limit: 100 })).find((product) => product.slug === slug) ??
      null
    );
  }

  let rows: {
    id: string;
    sku: string;
    slug: string;
    category: string;
    categorySlug: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    priceMinor: number;
    compareAtPriceMinor: number | null;
    stock: number;
    lowStockThreshold: number;
    image: string | null;
    specifications: Record<string, string>;
    isFeatured: boolean;
  }[];

  try {
    rows = await withTimeout(
      sql<typeof rows>`
        select
          p.id::text,
          p.sku,
          p.slug,
          c.name as category,
          c.slug as "categorySlug",
          p.name,
          p.short_description as "shortDescription",
          p.description,
          p.price_minor as "priceMinor",
          p.compare_at_price_minor as "compareAtPriceMinor",
          greatest(p.stock_quantity - p.reserved_quantity, 0)::int as stock,
          p.low_stock_threshold as "lowStockThreshold",
          p.specifications,
          p.is_featured as "isFeatured",
          (
            select pi.url
            from product_images pi
            where pi.product_id = p.id
            order by pi.sort_order asc, pi.created_at asc
            limit 1
          ) as image
        from products p
        inner join categories c on c.id = p.category_id
        where p.is_active = true
          and c.is_active = true
          and p.slug = ${slug}
        limit 1
      `,
      { label: "Product detail" }
    );
  } catch (error) {
    logFallback("Product detail is unavailable", error);
    return (
      (await getProducts({ limit: 100 })).find((product) => product.slug === slug) ??
      null
    );
  }

  const product = rows[0];
  if (!product) return null;

  const oldPriceMinor = product.compareAtPriceMinor ?? product.priceMinor;
  const image = product.image ?? fallbackImage;

  return {
    id: product.id,
    sku: product.sku,
    slug: product.slug,
    category: product.category,
    categorySlug: product.categorySlug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    price: toDisplayPrice(product.priceMinor),
    oldPrice: toDisplayPrice(oldPriceMinor),
    discount: toDiscount(product.priceMinor, product.compareAtPriceMinor),
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    image,
    images: [{ url: image, altText: product.name }],
    specifications: product.specifications ?? {},
    isFeatured: product.isFeatured
  };
}
