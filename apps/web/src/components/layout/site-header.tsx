"use client";

import {
  ChevronDown,
  Flame,
  Grid2X2,
  Headphones,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  Trash2,
  Truck
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  CART_KEY,
  changeCartItemQuantity,
  removeProductFromCart,
  type LocalCartItem,
  writeLocalCart
} from "@/lib/cart-storage";
import type { StoreProduct } from "@/lib/catalog";
import {
  CustomerAccountMenu,
  type HeaderCustomer
} from "@/components/auth/customer-account-menu";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

export function SiteHeader({
  initialCart = [],
  customer = null,
  sessionUnavailable = false
}: {
  initialCart?: LocalCartItem[];
  customer?: HeaderCustomer | null;
  sessionUnavailable?: boolean;
}) {
  const [cart, setCart] = useState<LocalCartItem[]>(initialCart);
  const [cartOpen, setCartOpen] = useState(false);
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      try {
        const localCart = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
        if (initialCart.length) {
          setCart(initialCart);
          writeLocalCart(initialCart);
        } else if (localCart.length) {
          setCart(localCart);
        }
      } catch {
        setCart([]);
      }
    });

    const addToCart = (event: Event) => {
      const product = (event as CustomEvent<StoreProduct>).detail;
      setCart((current) => {
        const existing = current.find(
          (item) => item.product.id === product.id
        );
        const updated = existing
          ? current.map((item) =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          : [...current, { product, quantity: 1 }];
        writeLocalCart(updated);
        return updated;
      });
    };
    const cartSynced = (event: Event) => {
      setCart((event as CustomEvent<LocalCartItem[]>).detail);
    };
    const openCart = () => setCartOpen(true);

    window.addEventListener("talomart:add-to-cart", addToCart);
    window.addEventListener("talomart:cart-sync", cartSynced);
    window.addEventListener("talomart:open-cart", openCart);
    return () => {
      window.cancelAnimationFrame(hydrationFrame);
      window.removeEventListener("talomart:add-to-cart", addToCart);
      window.removeEventListener("talomart:cart-sync", cartSynced);
      window.removeEventListener("talomart:open-cart", openCart);
    };
  }, [initialCart]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cart]
  );

  function updateQuantity(productId: string, delta: number) {
    const nextCart = changeCartItemQuantity(cart, productId, delta);
    setCart(nextCart);
    writeLocalCart(nextCart);
  }

  function removeItem(productId: string) {
    const nextCart = removeProductFromCart(cart, productId);
    setCart(nextCart);
    writeLocalCart(nextCart);
  }

  return (
    <>
      <div className="announcement">
        <div className="container announcement-inner">
          <p>
            <span className="pulse" /> Free delivery in Nairobi on orders over
            KSh 5,000
          </p>
          <div className="announcement-links">
            <Link href="/help">Help Center</Link>
            <Link href="/track">Track Order</Link>
            <Link href="/contact">Sell on Talomart</Link>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="container header-main">
          <Link className="brand" href="/" aria-label="Talomart Stores home">
            <span className="brand-mark">
              <span />
            </span>
            <span className="brand-name">
              Talo<span>mart</span>
              <small>STORES</small>
            </span>
          </Link>

          <form className="search" action="/search" role="search">
            <Search aria-hidden="true" />
            <input
              name="q"
              type="search"
              placeholder="What are you looking for today?"
              aria-label="Search products"
            />
            <button type="submit">Search</button>
          </form>

          <div className="header-actions">
            <CustomerAccountMenu
              customer={customer}
              sessionUnavailable={sessionUnavailable}
            />
            <Link
              href="/wishlist"
              className="header-action wishlist-header"
              aria-label="Wishlist"
            >
              <span className="action-icon">
                <Heart />
                <b>{wishlistCount}</b>
              </span>
              <span>
                <small>Your saved</small>
                <strong>Wishlist</strong>
              </span>
            </Link>
            <Link
              href="/cart"
              className="cart-button"
              aria-label="Shopping cart"
            >
              <ShoppingBag />
              <span>
                <small>My cart</small>
                <strong>KSh {formatPrice(subtotal)}</strong>
              </span>
              <b>{itemCount}</b>
            </Link>
            <Link
              href="/categories"
              className="mobile-menu"
              aria-label="Open menu"
            >
              <Menu />
            </Link>
          </div>
        </div>

        <nav className="category-nav">
          <div className="container nav-inner">
            <Link
              href="/categories"
              className="departments"
            >
              <Grid2X2 />
              All Categories
              <ChevronDown className="chevron" />
            </Link>
            <div className="nav-links">
              <Link href="/categories/phones">
                Phones
              </Link>
              <Link href="/categories/audio">
                Audio
              </Link>
              <Link href="/categories/charging">
                Chargers &amp; Power
              </Link>
              <Link href="/categories/storage">
                Storage
              </Link>
              <Link href="/categories/cameras">
                Cameras
              </Link>
              <Link href="/categories/accessories">
                Accessories
              </Link>
              <Link
                href="/offers"
                className="deals-link"
              >
                <Flame /> Today&apos;s Deals
              </Link>
            </div>
            <a className="support-line" href="tel:+254700000000">
              <Headphones />
              <span>
                <small>Need help?</small>
                <strong>+254 700 000 000</strong>
              </span>
            </a>
          </div>
        </nav>
      </header>

      <aside
        className={`cart-drawer ${cartOpen ? "open" : ""}`}
        aria-hidden={!cartOpen}
      >
        <div className="drawer-head">
          <h2>Your cart</h2>
          <button onClick={() => setCartOpen(false)} aria-label="Close cart">
            ×
          </button>
        </div>
        <div className="drawer-items">
          {cart.map((item) => (
            <div className="drawer-item" key={item.product.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.product.image} alt="" />
              <div>
                <h4>{item.product.name}</h4>
                <p>
                  KSh {formatPrice(item.product.price * item.quantity)}
                </p>
                <div className="item-quantity">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    aria-label={`Decrease ${item.product.name} quantity`}
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    aria-label={`Increase ${item.product.name} quantity`}
                    disabled={item.quantity >= item.product.stock}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                onClick={() => removeItem(item.product.id)}
                aria-label={`Remove ${item.product.name}`}
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        {!cart.length && (
          <div className="drawer-empty">
            <ShoppingBag />
            <h3>Your cart is empty</h3>
            <p>Good tech is waiting.</p>
          </div>
        )}
        {!!cart.length && (
          <div className="drawer-footer">
            <div>
              <span>Subtotal</span>
              <strong>KSh {formatPrice(subtotal)}</strong>
            </div>
            <p className="delivery-note">
              <Truck /> Delivery is calculated at checkout
            </p>
            <Link
              href="/checkout"
              className="primary-button"
            >
              Proceed to checkout
            </Link>
          </div>
        )}
      </aside>
      <button
        className={`overlay ${cartOpen ? "show" : ""}`}
        onClick={() => setCartOpen(false)}
        aria-label="Close cart overlay"
      />
    </>
  );
}
