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
  changeCartItemQuantity,
  clearGuestLocalCart,
  persistCartMutation,
  readLocalCart,
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
import { businessInfo } from "@/lib/business-info";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-KE").format(value);

export function SiteHeader({
  cartScope,
  initialCart = [],
  customer = null,
  sessionUnavailable = false
}: {
  cartScope: string;
  initialCart?: LocalCartItem[];
  customer?: HeaderCustomer | null;
  sessionUnavailable?: boolean;
}) {
  const [cart, setCart] = useState<LocalCartItem[]>(initialCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartSyncError, setCartSyncError] = useState("");
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      const localCart = readLocalCart(cartScope);
      const guestCart = customer ? readLocalCart("guest") : [];
      const nextCart = initialCart.length
        ? initialCart
        : localCart.length
          ? localCart
          : guestCart;

      setCart(nextCart);
      writeLocalCart(nextCart, cartScope);

      if (customer) {
        clearGuestLocalCart();
        if (!initialCart.length && !localCart.length && guestCart.length) {
          for (const item of guestCart) {
            void persistCartMutation({
              productId: item.product.id,
              intent: "set",
              quantity: item.quantity
            });
          }
        }
      }
    });

    const addToCart = (event: Event) => {
      const product = (event as CustomEvent<StoreProduct>).detail;
      if (!product) return;

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
        writeLocalCart(updated, cartScope);
        return updated;
      });
    };
    const cartSynced = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!detail || typeof detail !== "object") return;
      const change = detail as { scope?: unknown; items?: unknown };
      if (change.scope !== cartScope || !Array.isArray(change.items)) return;
      setCart(change.items as LocalCartItem[]);
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
  }, [cartScope, customer, initialCart]);

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
    const updatedItem = nextCart.find(
      (item) => item.product.id === productId
    );

    setCart(nextCart);
    writeLocalCart(nextCart, cartScope);
    setCartSyncError("");
    void persistCartMutation({
      productId,
      intent: updatedItem ? "set" : "remove",
      quantity: updatedItem?.quantity ?? 0
    }).catch(() => {
      setCartSyncError(
        "Your cart is saved on this device, but server synchronization failed."
      );
    });
  }

  function removeItem(productId: string) {
    const nextCart = removeProductFromCart(cart, productId);

    setCart(nextCart);
    writeLocalCart(nextCart, cartScope);
    setCartSyncError("");
    void persistCartMutation({ productId, intent: "remove" }).catch(() => {
      setCartSyncError(
        "Your cart is saved on this device, but server synchronization failed."
      );
    });
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
            <a className="support-line" href={`tel:${businessInfo.phone}`}>
              <Headphones />
              <span>
                <small>Call or WhatsApp</small>
                <strong>{businessInfo.phoneDisplay}</strong>
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
        {cartSyncError && (
          <p
            className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800"
            role="alert"
          >
            {cartSyncError}
          </p>
        )}
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
