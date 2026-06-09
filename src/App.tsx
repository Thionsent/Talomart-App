import React, { useState, useEffect } from "react";
import { Product, CartItem, Order, LoyaltyProfile } from "./types";
import ProductsSection from "./components/ProductsSection";
import CartSection from "./components/CartSection";
import WishlistSection from "./components/WishlistSection";
import LoyaltySection from "./components/LoyaltySection";
import DashboardSection from "./components/DashboardSection";
import RecommendationsSection from "./components/RecommendationsSection";
import ProductDetailModal from "./components/ProductDetailModal";
import CheckoutModal from "./components/CheckoutModal";

import {
  ShoppingBag,
  Heart,
  Award,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Menu,
  X,
  Store,
  HelpCircle,
  MapPin,
  Lock,
  Gift
} from "lucide-react";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [browsingHistory, setBrowsingHistory] = useState<string[]>([]);

  // User details
  const [userEmail, setUserEmail] = useState("ngangaedward261@gmail.com");
  const [userPhone, setUserPhone] = useState("+254712345678");
  const [userName, setUserName] = useState("Edward Nganga");
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);

  // Layout states
  const [activeTab, setActiveTab] = useState<"store" | "cart" | "wishlist" | "loyalty" | "dashboard">("store");
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Status Alerts
  const [alertMsg, setAlertMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Fetch core products and orders
  const loadData = async () => {
    try {
      const respP = await fetch("/api/products");
      if (respP.ok) {
        const dataP = await respP.json();
        setProducts(dataP);
      }
      const respO = await fetch("/api/orders");
      if (respO.ok) {
        const dataO = await respO.json();
        setOrders(dataO);
      }
    } catch (e) {
      console.error("Connection failed on core loading", e);
    }
  };

  useEffect(() => {
    loadData();
    // Pre-populate loyalty account signup reward immediately
    fetchLoyaltyProfile("ngangaedward261@gmail.com");
  }, []);

  const fetchLoyaltyProfile = async (email: string) => {
    try {
      const resp = await fetch(`/api/loyalty/${encodeURIComponent(email)}`);
      if (resp.ok) {
        const data = await resp.json();
        setLoyaltyProfile(data);
      }
    } catch (err) {
      console.error("Failed fetching loyalty status:", err);
    }
  };

  const handleUpdateProductStock = async (productId: string, newStock: number) => {
    try {
      const resp = await fetch(`/api/products/${productId}/adjust-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ absoluteStock: newStock })
      });
      if (resp.ok) {
        loadData(); // Re-sync state
        // Raise system brief alert notification
        showNotification("Warehouse stock level successfully adjusted in real-time!", true);
      }
    } catch (err) {
      showNotification("Error updating product stock levels.", false);
    }
  };

  const handleAddNewProductInput = async (newProductData: Partial<Product>): Promise<boolean> => {
    try {
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProductData)
      });
      if (resp.ok) {
        loadData();
        showNotification("New accessory successfully published and synced with retail storefront!", true);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleUpdateProductPrice = async (productId: string, newPrice: number): Promise<boolean> => {
    try {
      const resp = await fetch(`/api/products/${productId}/adjust-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ absolutePrice: newPrice })
      });
      if (resp.ok) {
        loadData();
        showNotification(`Price updated to $${newPrice.toFixed(2)} in real-time catalog!`, true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleBulkUploadProducts = async (productsList: any[]): Promise<boolean> => {
    try {
      const resp = await fetch("/api/products/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productsList })
      });
      if (resp.ok) {
        loadData();
        showNotification("Bulk inventory records loaded & synced successfully!", true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // Notification Banner triggers
  const showNotification = (text: string, success: boolean) => {
    setAlertMsg({ text, success });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4500);
  };

  // CART WORKFLOW OPERATIONS
  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) {
      showNotification("This accessory is out of stock in real-time warehouse data.", false);
      return;
    }

    setCart((prevCart) => {
      const target = prevCart.find((it) => it.product.id === product.id);
      if (target) {
        if (target.quantity >= product.stock) {
          showNotification(`Cannot add. Exceeds current live stock limit of ${product.stock} units!`, false);
          return prevCart;
        }
        showNotification(`Increased ${product.name} count in cart.`, true);
        return prevCart.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      } else {
        showNotification(`${product.name} added to cart!`, true);
        return [...prevCart, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateCartQuantity = (productId: string, action: "increase" | "decrease") => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.product.id === productId) {
          const prod = products.find((p) => p.id === productId);
          if (action === "increase") {
            if (prod && item.quantity >= prod.stock) {
              showNotification(`Sourcing limit reached for ${item.product.name}`, false);
              return item;
            }
            return { ...item, quantity: item.quantity + 1 };
          } else {
            return { ...item, quantity: Math.max(1, item.quantity - 1) };
          }
        }
        return item;
      });
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
    showNotification("Removed item from cart.", true);
  };

  // WISHLIST WORKFLOW OPERATIONS
  const handleAddToWishlist = (pId: string) => {
    setWishlist((prev) => {
      if (prev.includes(pId)) {
        showNotification("Removed item from saved wishlist.", true);
        return prev.filter((id) => id !== pId);
      } else {
        showNotification("Added item to saved wishlist!", true);
        return [...prev, pId];
      }
    });
  };

  // USER CHOSE A PRODUCT OVERLAY MODAL SPEC DETAILS
  const handleOpenProductDetailSpecs = (product: Product) => {
    setSelectedDetailProduct(product);
    // Push Product into browsing history safely to trigger fresh Gemini recommendations
    setBrowsingHistory((prev) => {
      const filtered = prev.filter((id) => id !== product.id);
      return [product.id, ...filtered].slice(0, 6); // Keep top 6 items
    });
  };

  // PAYMENTS & ORDER TELEMETRY ON COMPLETION
  const handleOrderCompleted = (payload: any) => {
    const { order, loyaltyReward } = payload;
    setCart([]); // Clear cart
    setCouponApplied(null); // Reset applied coupon
    loadData(); // Reload stock quantities and order logs
    fetchLoyaltyProfile(userEmail); // Synchronize updated balance

    // Raise custom congratulations summary modal or banners
    showNotification(`Success! ${order.id} has been securely logged with dynamic ${loyaltyReward.pointsAdded} Club rewards!`, true);
    setActiveTab("dashboard"); // Settle onto dashboard to trace the telemetry status!
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-gray-800 font-sans">
      {/* Dynamic alert banner overlay */}
      {alertMsg && (
        <div className="fixed top-4 right-4 z-50 animate-bounce cursor-pointer max-w-sm" onClick={() => setAlertMsg(null)}>
          <div className={`p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-start gap-2.5 ${
            alertMsg.success ? "bg-emerald-600 text-white border-emerald-500" : "bg-rose-600 text-white border-rose-500"
          }`}>
            {alertMsg.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <div>
              <p className="font-bold">{alertMsg.success ? "System Update Sync:" : "Safety Warning alert:"}</p>
              <p className="mt-0.5 leading-normal opacity-90">{alertMsg.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating corporate header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-150 shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-xs">
              <Store className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-gray-900 leading-none flex items-center gap-1.5">
                Talomart Stores
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-800 border border-indigo-100 font-bold px-1.5 py-0.2 rounded-full">
                  Retail Specs Hub
                </span>
              </h1>
              <p className="text-[9px] text-gray-400 font-mono tracking-widest mt-1 uppercase">Sleek Phone Accessories Retailer</p>
            </div>
          </div>

          {/* Desktop view anchors */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold font-sans">
            <button
              onClick={() => setActiveTab("store")}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === "store" ? "bg-indigo-50 text-indigo-700" : "text-gray-650 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              Shop Accessories
            </button>

            <button
              onClick={() => setActiveTab("wishlist")}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "wishlist" ? "bg-indigo-50 text-indigo-705" : "text-gray-650 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Heart className={`h-4.5 w-4.5 ${wishlist.length > 0 ? "text-rose-600 fill-current animate-pulse" : ""}`} />
              Saved List
              {wishlist.length > 0 && <span className="bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.2">{wishlist.length}</span>}
            </button>

            <button
              onClick={() => setActiveTab("cart")}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "cart" ? "bg-indigo-50 text-indigo-705" : "text-gray-650 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <ShoppingBag className="h-4.5 w-4.5 text-gray-500" />
              Cart Summary
              {cartItemsCount > 0 && <span className="bg-indigo-650 text-white rounded-full text-[9px] px-1.5 py-0.2">{cartItemsCount}</span>}
            </button>

            <button
              onClick={() => setActiveTab("loyalty")}
              className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "loyalty" ? "bg-indigo-50 text-indigo-705" : "text-gray-650 hover:bg-gray-50"
              }`}
            >
              <Award className="h-4.5 w-4.5 text-amber-500" />
              Club Loyalty
              {loyaltyProfile && (
                <span className="bg-amber-100 border border-amber-200 text-amber-800 rounded px-1.5 py-0.2 text-[9px]">
                  {loyaltyProfile.points} PTS
                </span>
              )}
            </button>

            <span className="h-5 w-[1px] bg-gray-200 mx-1"></span>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer font-bold border ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-white border-slate-950"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
              }`}
            >
              <Sliders className="h-4 w-4 inline mr-1 text-indigo-550 shrink-0" />
              Inventory Dashboard
            </button>
          </nav>

          {/* User profile floating summary right side details */}
          <div className="hidden lg:flex items-center gap-2.5 text-right font-mono text-[10px] text-gray-500 border-l border-gray-150 pl-4">
            <div>
              <span className="font-bold text-gray-700 block text-[9px]">{userName}</span>
              <span className="opacity-80 block truncate max-w-[120px]">{userEmail}</span>
            </div>
            {loyaltyProfile?.tier && (
              <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                loyaltyProfile.tier === "Platinum" ? "bg-indigo-600 text-white" :
                loyaltyProfile.tier === "Gold" ? "bg-amber-500 text-white" :
                loyaltyProfile.tier === "Silver" ? "bg-slate-300 text-gray-800" :
                "bg-amber-700 text-white"
              }`}>
                {loyaltyProfile.tier} club
              </span>
            )}
          </div>

          {/* Quick burger triggers for small screen mobile checkouts */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border hover:bg-gray-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Small Screen mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-150 bg-white p-4 space-y-2 text-xs font-bold">
            <button
              onClick={() => { setActiveTab("store"); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 hover:bg-gray-50 rounded"
            >
              Shop Accessories
            </button>
            <button
              onClick={() => { setActiveTab("wishlist"); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 hover:bg-gray-50 rounded flex justify-between"
            >
              <span>Saved Wishlist</span>
              <span>{wishlist.length} saved</span>
            </button>
            <button
              onClick={() => { setActiveTab("cart"); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 hover:bg-gray-50 rounded flex justify-between"
            >
              <span>Shopping Cart</span>
              <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded-full">{cartItemsCount}</span>
            </button>
            <button
              onClick={() => { setActiveTab("loyalty"); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 hover:bg-gray-50 rounded flex justify-between"
            >
              <span>Club Loyalty</span>
              {loyaltyProfile && <span className="text-amber-600">{loyaltyProfile.points} PTS</span>}
            </button>
            <div className="pt-2 border-t">
              <button
                onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
                className="w-full text-center py-2 bg-slate-900 text-white rounded font-bold"
              >
                Go to Inventory Dashboard
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* VIEW A: Main retail storefront */}
        {activeTab === "store" && (
          <div className="space-y-6">
            <ProductsSection
              products={products}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
              wishlist={wishlist}
              onSelectProduct={handleOpenProductDetailSpecs}
              onNavigateToTab={setActiveTab}
            />

            {/* Smart Gemini AI recommendations panel */}
            <RecommendationsSection
              browsingHistory={browsingHistory}
              products={products}
              onSelectProduct={handleOpenProductDetailSpecs}
              onAddToWishlist={handleAddToWishlist}
              wishlist={wishlist}
              onAddToCart={handleAddToCart}
            />
          </div>
        )}

        {/* VIEW B: Wishlist */}
        {activeTab === "wishlist" && (
          <WishlistSection
            wishlist={wishlist}
            products={products}
            onRemoveFromWishlist={handleAddToWishlist}
            onAddToCart={handleAddToCart}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* VIEW C: Cart section */}
        {activeTab === "cart" && (
          <CartSection
            cartItems={cart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            couponApplied={couponApplied}
            onRemoveCoupon={() => setCouponApplied(null)}
            onOpenCheckout={() => setCheckoutOpen(true)}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* VIEW D: Loyalty accounts points voucher redemption */}
        {activeTab === "loyalty" && (
          <LoyaltySection
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            loyaltyProfile={loyaltyProfile}
            setLoyaltyProfile={setLoyaltyProfile}
            onApplyCoupon={(code, val) => setCouponApplied({ code, discount: val })}
            couponApplied={couponApplied}
          />
        )}

        {/* VIEW E: Merchant Custom inventory control dashboard */}
        {activeTab === "dashboard" && (
          <DashboardSection
            products={products}
            orders={orders}
            onRefreshData={loadData}
            onUpdateProductStock={handleUpdateProductStock}
            onAddNewProduct={handleAddNewProductInput}
            onUpdateProductPrice={handleUpdateProductPrice}
            onBulkUploadProducts={handleBulkUploadProducts}
          />
        )}
      </main>

      {/* Secure footer */}
      <footer className="bg-white border-t border-gray-150 py-6 text-center text-xs text-gray-400 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© 2026 Talomart Stores Ltd • Inspired by Amazon, Jumia & Kilimall phone accessory retailing</p>
          <div className="flex justify-center items-center gap-2.5 text-[10px] uppercase font-mono tracking-widest text-gray-500">
            <span>256-Bit SSL PagShield</span>
            <span>•</span>
            <span>Active Real-Time stock tracking</span>
            <span>•</span>
            <span>Gemini AI Smart Rec Engine</span>
          </div>
        </div>
      </footer>

      {/* OVERLAY MODAL 1: Product detail specs sheet reviews panel */}
      {selectedDetailProduct && (
        <ProductDetailModal
          product={selectedDetailProduct}
          onClose={() => setSelectedDetailProduct(null)}
          onAddToCart={handleAddToCart}
          onAddToWishlist={handleAddToWishlist}
          wishlist={wishlist}
        />
      )}

      {/* OVERLAY MODAL 2: Step-by-step mobile payments checkout gateway */}
      {checkoutOpen && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          cartItems={cart}
          userEmail={userEmail}
          userPhone={userPhone}
          userName={userName}
          couponApplied={couponApplied}
          onOrderCompleted={handleOrderCompleted}
          subtotal={cartSubtotal}
        />
      )}
    </div>
  );
}
