import { CheckCircle2, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ProductActions } from "@/components/catalog/product-actions";
import { ProductGrid } from "@/components/catalog/product-grid";
import { getProductBySlug, getProducts } from "@/lib/catalog-queries";
import { absoluteUrl, isPlaceholderCatalogueImage, privatePageRobots, publicPageMetadata, safeJsonLd, siteUrl } from "@/lib/seo";
import { canOptimizeStoreImage } from "@/lib/storefront-image";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product not found", robots: privatePageRobots };

  return publicPageMetadata(
    product.name,
    product.shortDescription ?? product.description ?? `Shop ${product.name} at Talomart Stores in Kenya.`,
    `/products/${encodeURIComponent(product.slug)}`,
    isPlaceholderCatalogueImage(product.image) ? null : product.image
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (
    await getProducts({
      categorySlug: product.categorySlug,
      limit: 4
    })
  ).filter((item) => item.id !== product.id);
  const productImages = product.images
    .filter(({ url }) => !isPlaceholderCatalogueImage(url))
    .map(({ url }) => absoluteUrl(url));

  return (
    <section className="bg-[var(--color-cream)] py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": absoluteUrl(`/products/${encodeURIComponent(product.slug)}`),
            name: product.name,
            description: product.description ?? product.shortDescription ?? product.name,
            sku: product.sku,
            ...(productImages.length ? { image: productImages } : {}),
            category: product.category,
            offers: {
              "@type": "Offer",
              url: absoluteUrl(`/products/${encodeURIComponent(product.slug)}`),
              priceCurrency: "KES",
              price: product.price,
              availability: `https://schema.org/${product.stock > 0 ? "InStock" : "OutOfStock"}`,
              seller: { "@id": `${siteUrl}/#store` }
            }
          })
        }}
      />
      <div className="page-shell">
        <div className="grid gap-8 rounded-3xl bg-white p-5 shadow-sm lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-100">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              loading="eager"
              fetchPriority="high"
              unoptimized={!canOptimizeStoreImage(product.image)}
              className="object-contain"
            />
          </div>

          <div className="py-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-[var(--color-green)]">
              {product.category}
            </span>
            <h1 className="font-brand mt-4 text-4xl font-extrabold leading-tight text-[var(--color-navy)]">
              {product.name}
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {product.description ?? product.shortDescription}
            </p>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <strong className="text-4xl font-black text-[var(--color-navy)]">
                KSh {formatPrice(product.price)}
              </strong>
              {product.oldPrice > product.price && (
                <>
                  <del className="pb-1 text-lg text-slate-400">
                    KSh {formatPrice(product.oldPrice)}
                  </del>
                  <span className="mb-1 rounded-full bg-[var(--color-orange)] px-3 py-1 text-xs font-extrabold text-white">
                    Save {product.discount}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <CheckCircle2 className="mb-2 h-5 w-5 text-[var(--color-green)]" />
                <strong>{product.stock} in stock</strong>
                <p className="text-xs text-slate-500">Live availability</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <Truck className="mb-2 h-5 w-5 text-[var(--color-orange)]" />
                <strong>Fast delivery</strong>
                <p className="text-xs text-slate-500">Nairobi and beyond</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <ShieldCheck className="mb-2 h-5 w-5 text-[var(--color-green)]" />
                <strong>Genuine gear</strong>
                <p className="text-xs text-slate-500">Verified suppliers</p>
              </div>
            </div>

            <ProductActions product={product} />
          </div>
        </div>

        {!!Object.keys(product.specifications).length && (
          <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-brand text-2xl font-extrabold">
              Specifications
            </h2>
            <dl className="mt-5 grid gap-3 md:grid-cols-3">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    {key}
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--color-navy)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-10">
          <h2 className="font-brand mb-5 text-2xl font-extrabold">
            Related products
          </h2>
          <ProductGrid products={related} />
        </div>
      </div>
    </section>
  );
}
