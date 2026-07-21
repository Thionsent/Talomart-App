"use client";

import {
  ArrowRight,
  Check,
  CreditCard,
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

import { addProductToLocalCart } from "@/lib/cart-storage";
import {
  storefrontCategories,
  storefrontProducts,
  type StoreCategory,
  type StoreProduct
} from "@/lib/catalog";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

interface StorefrontHomeProps {
  categories?: StoreCategory[];
  products?: StoreProduct[];
}

export function StorefrontHome({
  categories = storefrontCategories,
  products = storefrontProducts
}: StorefrontHomeProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] =
    useState<StoreProduct | null>(null);
  const [toast, setToast] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(
    4 * 3600 + 26 * 60 + 18
  );

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      try {
        setWishlist(
          new Set(
            JSON.parse(
              localStorage.getItem("talomart-production-wishlist") ?? "[]"
            )
          )
        );
      } catch {
        setWishlist(new Set());
      }
    });
    const timer = window.setInterval(
      () =>
        setSecondsRemaining((current) =>
          current > 0 ? current - 1 : 6 * 3600
        ),
      1000
    );
    return () => {
      window.cancelAnimationFrame(hydrationFrame);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedProduct ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProduct]);

  const visibleProducts = useMemo(() => {
    const visible = products.filter((product) => {
      const categoryMatches =
        activeFilter === "all" || product.category === activeFilter;
      const priceMatches =
        priceFilter === "all" ||
        (priceFilter === "under-3000" && product.price < 3000) ||
        (priceFilter === "3000-10000" &&
          product.price >= 3000 &&
          product.price <= 10000) ||
        (priceFilter === "over-10000" && product.price > 10000);
      return categoryMatches && priceMatches;
    });
    if (sort === "price-low") visible.sort((a, b) => a.price - b.price);
    if (sort === "price-high") visible.sort((a, b) => b.price - a.price);
    if (sort === "rating") visible.sort((a, b) => b.rating - a.rating);
    return visible;
  }, [activeFilter, priceFilter, products, sort]);

  const hours = String(Math.floor(secondsRemaining / 3600)).padStart(2, "0");
  const minutes = String(
    Math.floor((secondsRemaining % 3600) / 60)
  ).padStart(2, "0");
  const seconds = String(secondsRemaining % 60).padStart(2, "0");

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1900);
  }

  function addToCart(product: StoreProduct) {
    addProductToLocalCart(product);
    window.dispatchEvent(new CustomEvent("talomart:open-cart"));
    showToast(`${product.name.split(" ").slice(0, 4).join(" ")} added to cart`);
  }

  function toggleWishlist(productId: string) {
    const updated = new Set(wishlist);
    if (updated.has(productId)) updated.delete(productId);
    else updated.add(productId);
    setWishlist(updated);
    localStorage.setItem(
      "talomart-production-wishlist",
      JSON.stringify([...updated])
    );
    window.dispatchEvent(
      new CustomEvent("talomart:wishlist-change", { detail: updated.size })
    );
    showToast(
      updated.has(productId)
        ? "Saved to your wishlist"
        : "Removed from wishlist"
    );
  }

  function filterAndScroll(category: string) {
    setActiveFilter(category);
    document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <article className="hero-main">
            <div className="hero-copy">
              <span className="eyebrow">SMART TECH. SMARTER PRICES.</span>
              <h1>
                Power up your <em>everyday.</em>
              </h1>
              <p>
                Genuine phones and accessories, picked for performance and
                priced for real life.
              </p>
              <div className="hero-cta">
                <button
                  className="primary-button"
                  onClick={() =>
                    document
                      .querySelector("#products")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Shop latest tech <ArrowRight />
                </button>
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
                  <ShieldCheck /> Genuine products
                </span>
                <span>
                  <Truck /> Fast delivery
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-glow" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=750&q=90"
                alt="Modern smartphone"
              />
              <div className="floating-card fc-one">
                <span className="float-icon">
                  <Zap />
                </span>
                <span>
                  <small>Fast charge</small>
                  <strong>65W power</strong>
                </span>
              </div>
              <div className="floating-card fc-two">
                <span className="float-icon green">
                  <Check />
                </span>
                <span>
                  <small>Quality checked</small>
                  <strong>1-year warranty</strong>
                </span>
              </div>
            </div>
          </article>

          <aside className="hero-side">
            <article className="mini-banner audio-banner">
              <div>
                <span className="mini-label">PURE SOUND</span>
                <h3>Hear every detail.</h3>
                <p>
                  Up to <strong>35% off</strong> audio
                </p>
                <button onClick={() => filterAndScroll("Audio")}>
                  Shop audio <ArrowRight />
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85"
                alt="Wireless headphones"
              />
            </article>
            <article className="mini-banner power-banner">
              <div>
                <span className="mini-label">STAY CHARGED</span>
                <h3>Power that travels.</h3>
                <p>
                  From <strong>KSh 1,299</strong>
                </p>
                <button onClick={() => filterAndScroll("Charging")}>
                  Shop power <ArrowRight />
                </button>
              </div>
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

      <section className="benefits">
        <div className="container benefits-grid">
          <div>
            <span>
              <Truck />
            </span>
            <p>
              <strong>Countrywide delivery</strong>
              <small>Fast, tracked &amp; reliable</small>
            </p>
          </div>
          <div>
            <span>
              <ShieldCheck />
            </span>
            <p>
              <strong>Genuine guarantee</strong>
              <small>Verified quality products</small>
            </p>
          </div>
          <div>
            <span>
              <RefreshCw />
            </span>
            <p>
              <strong>Easy returns</strong>
              <small>7-day return policy</small>
            </p>
          </div>
          <div>
            <span>
              <CreditCard />
            </span>
            <p>
              <strong>Secure payments</strong>
              <small>M-Pesa &amp; card accepted</small>
            </p>
          </div>
        </div>
      </section>

      <section className="section categories-section" id="categories">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SHOP YOUR WAY</span>
              <h2>Popular categories</h2>
            </div>
            <button className="view-all" onClick={() => filterAndScroll("all")}>
              View all categories <ArrowRight />
            </button>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <button
                className="category-card"
                key={category.slug}
                onClick={() => filterAndScroll(category.name)}
                aria-label={`Shop ${category.name}`}
              >
                <span className="category-art">
                  <span className="emoji-art" aria-hidden="true">
                    {category.art}
                  </span>
                </span>
                <strong>{category.name}</strong>
                <small>{category.count} products</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section deal-section" id="products">
        <div className="container">
          <div className="deal-heading">
            <div className="deal-title">
              <span className="deal-bolt">
                <Zap />
              </span>
              <div>
                <span className="section-kicker orange">LIMITED TIME</span>
                <h2>Flash deals</h2>
              </div>
            </div>
            <div className="countdown-wrap">
              <span>Ends in</span>
              <div className="countdown">
                <b>{hours}</b>
                <i>:</i>
                <b>{minutes}</b>
                <i>:</i>
                <b>{seconds}</b>
              </div>
            </div>
            <button className="view-all light" onClick={() => setActiveFilter("all")}>
              See all deals <ArrowRight />
            </button>
          </div>

          <div className="shop-toolbar" aria-label="Product filters">
            <div className="results-summary">
              <strong>
                {visibleProducts.length} product
                {visibleProducts.length === 1 ? "" : "s"}
              </strong>
              <span>
                {activeFilter === "all"
                  ? "Curated deals for you"
                  : `${activeFilter} collection`}
              </span>
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
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <span className="discount">-{product.discount}%</span>
                <button
                  className={`wish-button ${wishlist.has(product.id) ? "active" : ""}`}
                  onClick={() => toggleWishlist(product.id)}
                  aria-label={`Save ${product.name}`}
                >
                  <Heart />
                </button>
                <button
                  className="product-image"
                  onClick={() => setSelectedProduct(product)}
                  aria-label={`View ${product.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} />
                  <span className="product-stock">
                    {product.stock > 5
                      ? "In stock"
                      : `Only ${product.stock} left`}
                  </span>
                </button>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3 onClick={() => setSelectedProduct(product)}>
                    {product.name}
                  </h3>
                  <div className="rating">
                    <span className="stars">★★★★★</span> {product.rating} (
                    {product.reviews})
                  </div>
                  <div className="price-line">
                    <strong>KSh {formatPrice(product.price)}</strong>
                    <del>KSh {formatPrice(product.oldPrice)}</del>
                  </div>
                </div>
                <div className="home-product-actions">
                  <form action="/api/cart" method="post">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="quantity" value="1" />
                    <input type="hidden" name="next" value="/cart" />
                    <button
                      className="add-button"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      Add to cart
                    </button>
                  </form>
                  <form action="/api/cart" method="post">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="quantity" value="1" />
                    <input type="hidden" name="next" value="/checkout" />
                    <button
                      className="buy-button"
                      aria-label={`Buy ${product.name} now`}
                    >
                      Buy now
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
          {!visibleProducts.length && (
            <div className="no-results show">
              <span>
                <Search />
              </span>
              <h3>No products found</h3>
              <p>Try a different price range or category.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setActiveFilter("all");
                  setPriceFilter("all");
                }}
              >
                View all products
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="section promise-section">
        <div className="container promise">
          <div className="promise-copy">
            <span className="section-kicker">THE TALOMART PROMISE</span>
            <h2>Tech shopping, without the guesswork.</h2>
            <p>
              From your first click to unboxing, we make every step simple,
              secure and satisfying.
            </p>
            <a href="#why">
              Why shop with us? <ArrowRight />
            </a>
          </div>
          <div className="promise-stats">
            <div>
              <strong>10K+</strong>
              <span>Happy customers</span>
            </div>
            <div>
              <strong>500+</strong>
              <span>Quality products</span>
            </div>
            <div>
              <strong>4.8/5</strong>
              <span>Customer rating</span>
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
                <span className="discount">
                  Save {selectedProduct.discount}%
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedProduct.image} alt={selectedProduct.name} />
              </div>
              <div className="product-detail-copy">
                <span className="product-category">
                  {selectedProduct.category}
                </span>
                <h2 id="product-modal-title">{selectedProduct.name}</h2>
                <div className="product-detail-rating">
                  <span className="stars">★★★★★</span>
                  <strong>{selectedProduct.rating}</strong>
                  <span>{selectedProduct.reviews} verified reviews</span>
                </div>
                <div className="detail-price">
                  <strong>KSh {formatPrice(selectedProduct.price)}</strong>
                  <del>KSh {formatPrice(selectedProduct.oldPrice)}</del>
                </div>
                <p className="detail-description">
                  Genuine Talomart technology selected for dependable everyday
                  performance, supported by local service and a straightforward
                  return policy.
                </p>
                <ul className="detail-features">
                  {[
                    "Quality checked",
                    "Genuine product",
                    "1-year warranty",
                    "Countrywide delivery"
                  ].map((feature) => (
                    <li key={feature}>
                      <Check /> {feature}
                    </li>
                  ))}
                </ul>
                <div className="stock-status">
                  {selectedProduct.stock} units available
                </div>
                <div className="detail-actions">
                  <button
                    className="primary-button"
                    onClick={() => addToCart(selectedProduct)}
                  >
                    <ShoppingBag /> Add to cart
                  </button>
                  <button
                    className={`detail-wish ${wishlist.has(selectedProduct.id) ? "active" : ""}`}
                    onClick={() => toggleWishlist(selectedProduct.id)}
                    aria-label={`Save ${selectedProduct.name}`}
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
