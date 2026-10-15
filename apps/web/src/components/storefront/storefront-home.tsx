"use client";

import {
  ArrowRight,
  Check,
  Clock3,
  Heart,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  addProductToLocalCart,
  persistCartAddition
} from "@/lib/cart-storage";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import {
  defaultCategoryImages,
  type HomepagePreviewProduct,
  type StoreCategory,
  type StoreProduct
} from "@/lib/catalog";
import { businessInfo } from "@/lib/business-info";
import {
  isDemoCartProductId,
  isUuidCartProductId
} from "@/lib/cart-product-id";
import {
  defaultHomepageSections,
  isHomepageSectionVisible,
  type HomepageSection,
  type HomepageSectionSlot
} from "@/lib/homepage-content";
import {
  storefrontBannerImageUrl,
  type HomepageBanner
} from "@/lib/homepage-banner";
import { HomepageBannerCarousel } from "@/components/storefront/homepage-banner-carousel";
import { productCardSpecifications } from "@/lib/product-card-specifications";
import { canOptimizeStoreImage } from "@/lib/storefront-image";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

function CategoryArtwork({ category }: { category: StoreCategory }) {
  const fallback = defaultCategoryImages[category.slug.toLowerCase()] ?? null;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const requested = category.imageUrl?.trim() || null;
  const source = requested && requested !== failedSource
    ? requested
    : fallback && fallback !== failedSource
      ? fallback
      : null;

  return (
    <span className={`category-art${source ? " has-image" : ""}`}>
      <span className="emoji-art" aria-hidden="true">{category.art}</span>
      {source && source === fallback ? (
        // The bundled artwork is already a tiny, correctly sized WebP.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="category-image" src={source} alt="" width={160} height={160} loading="lazy" decoding="async" onError={() => setFailedSource(source)} />
      ) : source ? (
        <Image className="category-image" src={source} alt="" fill sizes="68px" loading="lazy" unoptimized={!canOptimizeStoreImage(source)} onError={() => setFailedSource(source)} />
      ) : null}
    </span>
  );
}

interface StorefrontHomeProps {
  categories?: StoreCategory[];
  products?: StoreProduct[];
  discoveryProducts?: StoreProduct[];
  previewProducts?: HomepagePreviewProduct[];
  homepage?: Record<HomepageSectionSlot, HomepageSection>;
  banners?: HomepageBanner[];
  catalogueUnavailable?: boolean;
}

export function StorefrontHome({
  categories = [],
  products = [],
  discoveryProducts = [],
  previewProducts = [],
  homepage = defaultHomepageSections,
  banners = [],
  catalogueUnavailable = false
}: StorefrontHomeProps) {
  const router = useRouter();
  const [priceFilter, setPriceFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const {
    isSaved,
    toggle: toggleSavedProduct,
    ready: wishlistReady,
    pendingIds: pendingWishlistIds
  } = useWishlist();
  const [selectedProduct, setSelectedProduct] =
    useState<StoreProduct | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct]);

  const visibleProducts = useMemo(() => {
    const visible = products.filter((product) => {
      const priceMatches =
        priceFilter === "all" ||
        (priceFilter === "under-3000" && product.price < 3000) ||
        (priceFilter === "3000-10000" &&
          product.price >= 3000 &&
          product.price <= 10000) ||
        (priceFilter === "over-10000" && product.price > 10000);
      return priceMatches;
    });
    if (sort === "price-low") visible.sort((a, b) => a.price - b.price);
    if (sort === "price-high") visible.sort((a, b) => b.price - a.price);
    if (sort === "rating") visible.sort((a, b) => b.rating - a.rating);
    return visible;
  }, [priceFilter, products, sort]);
  const hasPreviewProducts = products.some((product) =>
    isDemoCartProductId(product.id)
  );
  const visibleCategories = categories.filter((category) => category.count > 0);
  const hasRatings = products.some((product) => product.reviews > 0);
  const hero = homepage.hero;
  const audioPromo = homepage.audio_promo;
  const powerPromo = homepage.power_promo;
  const promise = homepage.promise;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1900);
  }

  function addToCart(product: StoreProduct) {
    if (!isUuidCartProductId(product.id) || product.stock <= 0) {
      showToast(product.stock <= 0 ? "This item is currently out of stock." : "Preview products cannot be purchased.");
      return;
    }

    addProductToLocalCart(product);
    window.dispatchEvent(new CustomEvent("talomart:open-cart"));
    showToast(`${product.name.split(" ").slice(0, 4).join(" ")} added to cart`);
    void persistCartAddition(product.id).catch(() => {
      showToast("Saved on this device. Server cart sync is unavailable.");
    });
  }

  async function buyNow(product: StoreProduct) {
    if (!isUuidCartProductId(product.id) || product.stock <= 0) {
      showToast(product.stock <= 0 ? "This item is currently out of stock." : "Preview products cannot be purchased.");
      return;
    }

    addProductToLocalCart(product);

    try {
      await persistCartAddition(product.id);
    } catch {
      // The checkout page can still hydrate the locally stored cart.
    }

    router.push("/checkout");
  }

  async function toggleWishlist(productId: string) {
    if (!isUuidCartProductId(productId)) {
      showToast("Preview products cannot be saved.");
      return;
    }

    const saved = await toggleSavedProduct(productId);
    showToast(saved ? "Saved to your wishlist" : "Removed from wishlist");
  }

  function renderProductCard(product: StoreProduct) {
    const saved = isSaved(product.id);
    const specs = productCardSpecifications(product.specifications, product.name);
    const purchasable = isUuidCartProductId(product.id) && product.stock > 0;

    return (
      <article className="product-card" key={product.id}>
        {product.discount > 0 && <span className="discount">-{product.discount}%</span>}
        <button
          type="button"
          className={`wish-button ${saved ? "active" : ""}`}
          onClick={() => void toggleWishlist(product.id)}
          aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          disabled={!isUuidCartProductId(product.id) || !wishlistReady || pendingWishlistIds.has(product.id)}
        >
          <Heart />
        </button>
        <button
          type="button"
          className="product-image"
          onClick={() => setSelectedProduct(product)}
          aria-label={`View ${product.name}`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 580px) 50vw, (max-width: 820px) 33vw, (max-width: 1080px) 25vw, 20vw"
              loading="lazy"
              unoptimized={!canOptimizeStoreImage(product.image)}
            />
          ) : (
            <ShoppingBag aria-hidden="true" />
          )}
          <span className="product-stock">
            {!isUuidCartProductId(product.id)
              ? "Preview only"
              : product.stock === 0
              ? "Out of stock"
              : product.stock > 5
              ? "In stock"
              : `Only ${product.stock} left`}
          </span>
        </button>
        <div className="product-info">
          <span className="product-category">{product.category}</span>
          <h3 onClick={() => setSelectedProduct(product)}>{product.name}</h3>
          {specs.length > 0 && (
            <div className="product-card-specs">
              {specs.map(({ label, detail }) => (
                <span key={label} title={`${label}: ${detail}`}>
                  <strong>{label}:</strong> {detail}
                </span>
              ))}
            </div>
          )}
          {product.reviews > 0 && (
            <div className="rating">
              <span className="stars">★★★★★</span> {product.rating} ({product.reviews})
            </div>
          )}
          <div className="price-line">
            <strong>KSh {formatPrice(product.price)}</strong>
            {product.oldPrice > product.price && <del>KSh {formatPrice(product.oldPrice)}</del>}
          </div>
        </div>
        <div className="home-product-actions">
          <button
            type="button"
            className="add-button"
            onClick={() => addToCart(product)}
            aria-label={`Add ${product.name} to cart`}
            disabled={!purchasable}
          >
            {product.stock <= 0 ? "Sold out" : isUuidCartProductId(product.id) ? "Add to cart" : "Unavailable"}
          </button>
          <button
            type="button"
            className="buy-button"
            onClick={() => void buyNow(product)}
            aria-label={`Buy ${product.name} now`}
            disabled={!purchasable}
          >
            {product.stock <= 0 ? "Sold out" : isUuidCartProductId(product.id) ? "Buy now" : "Preview"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <>
      {banners.length > 0 ? (
        <HomepageBannerCarousel banners={banners} />
      ) : (
      <section className="hero">
        <div className="container hero-grid">
          <article className="hero-main">
            <div className="hero-copy">
              {isHomepageSectionVisible(hero) && (
                <>
              {hero.eyebrow && <span className="eyebrow">{hero.eyebrow}</span>}
              <h1>{hero.title}</h1>
              {hero.body && <p>{hero.body}</p>}
              <div className="hero-cta">
                {hero.ctaLabel && hero.ctaHref && (
                  <Link className="primary-button" href={hero.ctaHref}>
                    {hero.ctaLabel} <ArrowRight />
                  </Link>
                )}
                <button
                  className="text-button"
                  onClick={() =>
                    document
                      .querySelector("#categories")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Explore categories
                </button>
              </div>
              <div className="trust-row">
                <span>
                  <ShieldCheck /> Shop with Talomart support
                </span>
                <span>
                  <Truck /> Delivery options at checkout
                </span>
              </div>
                </>
              )}
            </div>
            <div className="hero-visual">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-glow" />
              {hero.imageUrl && isHomepageSectionVisible(hero) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storefrontBannerImageUrl(hero.imageUrl)} alt={hero.title} loading="lazy" decoding="async" />
              )}
            </div>
          </article>

          <aside className="hero-side">
            <article className="mini-banner audio-banner">
              {isHomepageSectionVisible(audioPromo) && (
                <div>
                  {audioPromo.eyebrow && <span className="mini-label">{audioPromo.eyebrow}</span>}
                  <h3>{audioPromo.title}</h3>
                  {audioPromo.body && <p>{audioPromo.body}</p>}
                  {audioPromo.ctaLabel && audioPromo.ctaHref && (
                    <Link href={audioPromo.ctaHref}>
                      {audioPromo.ctaLabel} <ArrowRight />
                    </Link>
                  )}
                </div>
              )}
              {audioPromo.imageUrl && isHomepageSectionVisible(audioPromo) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storefrontBannerImageUrl(audioPromo.imageUrl)} alt={audioPromo.title} loading="lazy" decoding="async" />
              )}
            </article>
            <article className="mini-banner power-banner">
              {isHomepageSectionVisible(powerPromo) && (
                <div>
                  {powerPromo.eyebrow && <span className="mini-label">{powerPromo.eyebrow}</span>}
                  <h3>{powerPromo.title}</h3>
                  {powerPromo.body && <p>{powerPromo.body}</p>}
                  {powerPromo.ctaLabel && powerPromo.ctaHref && (
                    <Link href={powerPromo.ctaHref}>
                      {powerPromo.ctaLabel} <ArrowRight />
                    </Link>
                  )}
                </div>
              )}
              <div className="powerbank-art">
                <span className="cable" />
                <span className="power-body">
                  100<span>%</span>
                </span>
              </div>
            </article>
          </aside>
        </div>
      </section>
      )}

      {visibleCategories.length > 0 && <section className="section categories-section" id="categories">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SHOP YOUR WAY</span>
              <h2>Popular categories</h2>
              <p className="category-intro">Start with the tech you are looking for.</p>
            </div>
            <Link className="view-all" href="/products">
              Browse all products <ArrowRight />
            </Link>
          </div>
          <div className="category-grid">
            {visibleCategories.map((category) => (
              <Link
                className={`category-card category-card-${category.slug}`}
                key={category.slug}
                href={`/categories/${category.slug}`}
                aria-label={`Shop ${category.name}`}
              >
                <CategoryArtwork category={category} />
                <span className="category-card-copy">
                  <strong>{category.name}</strong>
                  <small>{category.count} {category.count === 1 ? "product" : "products"}</small>
                </span>
                <span className="category-card-arrow" aria-hidden="true">
                  <ArrowRight />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {products.length > 0 ? <section className="section deal-section" id="products">
        <div className="container">
          <div className="deal-heading">
            <div className="deal-title">
              <span className="deal-bolt">
                <Zap />
              </span>
              <div>
                <span className="section-kicker orange">CURATED FOR YOU</span>
                <h2>Featured picks</h2>
                <p>Explore current favourites from the Talomart catalogue.</p>
              </div>
            </div>
            <Link className="view-all light" href="/products">
              Browse catalogue <ArrowRight />
            </Link>
          </div>

          {hasPreviewProducts && (
            <div
              className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
              role="status"
            >
              The live catalogue is temporarily unavailable. These preview
              products are visible for browsing only and cannot be purchased
              or saved.
            </div>
          )}

          <div className="shop-toolbar" aria-label="Product filters">
            <div className="results-summary">
              <strong>
                {visibleProducts.length} product
                {visibleProducts.length === 1 ? "" : "s"}
              </strong>
              <span>From the current Talomart catalogue</span>
            </div>
            <div className="toolbar-controls">
              <label className="toolbar-select">
                <span>Price</span>
                <select
                  value={priceFilter}
                  onChange={(event) => setPriceFilter(event.target.value)}
                  aria-label="Filter by price"
                >
                  <option value="all">All prices</option>
                  <option value="under-3000">Under KSh 3,000</option>
                  <option value="3000-10000">KSh 3,000 – 10,000</option>
                  <option value="over-10000">Over KSh 10,000</option>
                </select>
              </label>
              <label className="toolbar-select">
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort products"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to high</option>
                  <option value="price-high">Price: High to low</option>
                  {hasRatings && <option value="rating">Top rated</option>}
                </select>
              </label>
            </div>
          </div>

          <div className="product-grid">
            {visibleProducts.map(renderProductCard)}
          </div>
          {!visibleProducts.length && (
            <div className="no-results show">
              <span>
                <Search />
              </span>
              <h3>No products found</h3>
              <p>Try a different price range.</p>
              <button className="primary-button" onClick={() => setPriceFilter("all")}>
                View all products
              </button>
            </div>
          )}
        </div>
      </section> : previewProducts.length > 0 ? <section className="section deal-section homepage-preview-section" id="products">
        <div className="container">
          <div className="deal-heading">
            <div className="deal-title">
              <span className="deal-bolt" aria-hidden="true"><ShoppingBag /></span>
              <div>
                <span className="section-kicker orange">COMING TO TALOMART</span>
                <h2>Featured products preview</h2>
                <p>A first look at products we are preparing for the catalogue.</p>
              </div>
            </div>
          </div>
          <p className="homepage-preview-notice" role="status">
            Local preview only. These products are not yet for sale; prices and availability still need confirmation.
          </p>
          <div className="product-grid">
            {previewProducts.map((product) => (
              <article className="product-card homepage-preview-card" key={product.sku}>
                <span className="homepage-preview-badge">Preview</span>
                <span className="homepage-preview-mark" aria-hidden="true"><Clock3 /></span>
                <div className="product-image">
                  {/* Preview drafts cannot be opened or added to cart. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <span className="product-stock">Coming soon</span>
                </div>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <span className="homepage-preview-detail">Details being verified</span>
                  <div className="price-line homepage-preview-price"><strong>Price pending</strong></div>
                </div>
                <div className="home-product-actions homepage-preview-actions">
                  <button type="button" className="add-button" disabled title="Not yet available for purchase">Add to cart</button>
                  <button type="button" className="buy-button" disabled title="Not yet available for purchase">Buy now</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section> : <section className="section homepage-catalogue-callout" id="products">
        <div className="container">
          <div className="catalogue-callout-inner">
            <span className="catalogue-callout-icon" aria-hidden="true"><ShoppingBag /></span>
            <div className="catalogue-callout-copy">
              <span className="section-kicker">EXPLORE TALOMART</span>
              <h2>{catalogueUnavailable ? "The catalogue is temporarily unavailable" : visibleCategories.length ? "See what is in stock today." : "New products are on the way."}</h2>
              <p>{catalogueUnavailable ? "Please check back shortly or ask our team about an item you need." : visibleCategories.length ? "Explore the current selection and choose what fits your day." : "Our team can help you find what you need while we prepare the catalogue."}</p>
            </div>
            {visibleCategories.length && !catalogueUnavailable ? (
              <Link className="primary-button" href="/products">Browse all products <ArrowRight /></Link>
            ) : (
              <a className="primary-button" href={businessInfo.whatsappUrl} target="_blank" rel="noopener noreferrer">Ask us on WhatsApp <ArrowRight /></a>
            )}
          </div>
        </div>
      </section>}

      {discoveryProducts.length > 0 && (
        <section className="section discovery-section" id="discover">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">MORE TO EXPLORE</span>
                <h2>Discover across Talomart</h2>
                <p className="category-intro">A rotating mix of in-stock finds from our categories.</p>
              </div>
              <Link className="view-all" href="/products">
                Browse all products <ArrowRight />
              </Link>
            </div>
            <div className="product-grid">
              {discoveryProducts.map(renderProductCard)}
            </div>
          </div>
        </section>
      )}

      <section className="section promise-section" id="why">
        <div className="container promise">
          {isHomepageSectionVisible(promise) && (
            <div className="promise-copy">
              {promise.eyebrow && <span className="section-kicker">{promise.eyebrow}</span>}
              <h2>{promise.title}</h2>
              {promise.body && <p>{promise.body}</p>}
              {promise.ctaLabel && promise.ctaHref && (
                <Link href={promise.ctaHref}>
                  {promise.ctaLabel} <ArrowRight />
                </Link>
              )}
            </div>
          )}
          <div className="promise-stats">
            <div>
              <span className="promise-stat-icon" aria-hidden="true"><ShieldCheck /></span>
              <strong>Secure checkout</strong>
              <span>Clear M-Pesa and cash on delivery guidance</span>
            </div>
            <div>
              <span className="promise-stat-icon" aria-hidden="true"><Truck /></span>
              <strong>Order updates</strong>
              <span>Follow your order as it progresses</span>
            </div>
            <div>
              <span className="promise-stat-icon" aria-hidden="true"><RefreshCw /></span>
              <strong>Clear returns</strong>
              <span>Simple policy guidance when you need it</span>
            </div>
          </div>
        </div>
      </section>

      {selectedProduct && (
        <>
          <section
            className="app-modal product-modal open"
            aria-hidden="false"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              <X />
            </button>
            <div className="product-detail">
              <div className="product-gallery">
                {selectedProduct.discount > 0 && <span className="discount">Save {selectedProduct.discount}%</span>}
                {selectedProduct.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedProduct.image} alt={selectedProduct.name} />
                ) : (
                  <ShoppingBag aria-hidden="true" />
                )}
              </div>
              <div className="product-detail-copy">
                <span className="product-category">
                  {selectedProduct.category}
                </span>
                <h2 id="product-modal-title">{selectedProduct.name}</h2>
                {selectedProduct.reviews > 0 && (
                  <div className="product-detail-rating">
                    <span className="stars">★★★★★</span>
                    <strong>{selectedProduct.rating}</strong>
                    <span>{selectedProduct.reviews} reviews</span>
                  </div>
                )}
                <div className="detail-price">
                  <strong>KSh {formatPrice(selectedProduct.price)}</strong>
                  {selectedProduct.oldPrice > selectedProduct.price && (
                    <del>KSh {formatPrice(selectedProduct.oldPrice)}</del>
                  )}
                </div>
                <p className="detail-description">
                  Check the full listing for specifications, product photos and
                  any warranty details before ordering.
                </p>
                <ul className="detail-features">
                  <li><Check /> Delivery choices and fees appear at checkout</li>
                  <li><Check /> Returns are subject to the published policy</li>
                </ul>
                <Link className="detail-full-link" href={`/products/${selectedProduct.slug}`}>
                  View full product details <ArrowRight />
                </Link>
                <div className="stock-status">
                  {!isUuidCartProductId(selectedProduct.id)
                    ? "Preview only · purchasing unavailable"
                    : selectedProduct.stock > 0
                    ? `${selectedProduct.stock} units available`
                    : "Currently out of stock"}
                </div>
                <div className="detail-actions">
                  <button
                    className="primary-button"
                    onClick={() => addToCart(selectedProduct)}
                    disabled={!isUuidCartProductId(selectedProduct.id) || selectedProduct.stock <= 0}
                  >
                    <ShoppingBag />{" "}
                    {selectedProduct.stock <= 0 ? "Sold out" : isUuidCartProductId(selectedProduct.id) ? "Add to cart" : "Unavailable"}
                  </button>
                  <button
                    type="button"
                    className={`detail-wish ${isSaved(selectedProduct.id) ? "active" : ""}`}
                    onClick={() => toggleWishlist(selectedProduct.id)}
                    aria-label={`${isSaved(selectedProduct.id) ? "Remove" : "Save"} ${selectedProduct.name} ${isSaved(selectedProduct.id) ? "from" : "to"} wishlist`}
                    aria-pressed={isSaved(selectedProduct.id)}
                    disabled={
                      !isUuidCartProductId(selectedProduct.id) ||
                      !wishlistReady ||
                      pendingWishlistIds.has(selectedProduct.id)
                    }
                  >
                    <Heart />
                  </button>
                </div>
              </div>
            </div>
          </section>
          <button
            className="overlay show"
            onClick={() => setSelectedProduct(null)}
            aria-label="Close product overlay"
          />
        </>
      )}

      <div className={`toast ${toast ? "show" : ""}`}>
        <Check />
        <span>{toast}</span>
      </div>
    </>
  );
}
