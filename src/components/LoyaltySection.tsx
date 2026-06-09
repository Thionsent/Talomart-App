import React, { useState, useEffect, useRef } from "react";
import { LoyaltyProfile, Order, Product } from "../types";
import {
  Award,
  Gift,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Share2,
  ShoppingCart,
  Trash2,
  Heart,
  Copy,
  Check,
  Bell,
  BellRing,
  Mail,
  Smartphone,
  MessageSquare,
  Bookmark,
  ShoppingBag,
  RotateCcw,
  User,
  Users,
  Lock,
  ChevronRight
} from "lucide-react";

interface LoyaltySectionProps {
  userEmail: string;
  setUserEmail: (email: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  loyaltyProfile: LoyaltyProfile | null;
  setLoyaltyProfile: (profile: LoyaltyProfile | null) => void;
  onApplyCoupon: (code: string, discount: number) => void;
  couponApplied: { code: string; discount: number } | null;
  orders: Order[];
  products: Product[];
  onAddToCart: (product: Product) => void;
  onNavigateToTab: (tab: "store" | "cart" | "wishlist" | "loyalty" | "dashboard") => void;
  wishlist: string[];
  onReorder: (items: any[]) => void;
}

export default function LoyaltySection({
  userEmail,
  setUserEmail,
  userName,
  setUserName,
  userPhone,
  setUserPhone,
  loyaltyProfile,
  setLoyaltyProfile,
  onApplyCoupon,
  couponApplied,
  orders,
  products,
  onAddToCart,
  onNavigateToTab,
  wishlist,
  onReorder
}: LoyaltySectionProps) {
  // Tabs: rewards, orders, wishlist, referral
  const [innerTab, setInnerTab] = useState<"rewards" | "orders" | "wishlist" | "referral">("rewards");
  const [inputEmail, setInputEmail] = useState(userEmail || "ngangaedward261@gmail.com");
  const [inputName, setInputName] = useState(userName || "Edward Nganga");
  const [inputPhone, setInputPhone] = useState(userPhone || "+254712345678");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Copy states
  const [copiedWishlistIdx, setCopiedWishlistIdx] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Price & Back-in-Stock alerts state
  // Keyed by productId
  const [savedAlerts, setSavedAlerts] = useState<{
    [productId: string]: {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
      priceDrop: boolean;
      backInStock: boolean;
    };
  }>(() => {
    try {
      const saved = localStorage.getItem("talomart_alerts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Simulated Alert Feed to show real actions when user modifies prices on Dashboard
  const [simulatedAlertsFeed, setSimulatedAlertsFeed] = useState<{
    id: string;
    productName: string;
    message: string;
    channel: "SMS" | "Email" | "WhatsApp";
    receivedAt: string;
  }[]>([]);

  // Ref to track old product prices / stocks for real-time drop detection
  const prevProductsRef = useRef<Product[]>([]);

  // Sync alerts to local storage
  useEffect(() => {
    localStorage.setItem("talomart_alerts", JSON.stringify(savedAlerts));
  }, [savedAlerts]);

  // Real-time alert simulation listener
  useEffect(() => {
    if (prevProductsRef.current.length > 0) {
      products.forEach((newP) => {
        const oldP = prevProductsRef.current.find((p) => p.id === newP.id);
        if (oldP) {
          const userAlertConfig = savedAlerts[newP.id];
          if (userAlertConfig) {
            // 1. Detect dynamic price drop
            if (newP.price < oldP.price && userAlertConfig.priceDrop) {
              const channels: ("SMS" | "Email" | "WhatsApp")[] = [];
              if (userAlertConfig.sms) channels.push("SMS");
              if (userAlertConfig.email) channels.push("Email");
              if (userAlertConfig.whatsapp) channels.push("WhatsApp");

              channels.forEach((chan) => {
                const newFeedEntry = {
                  id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  productName: newP.name,
                  message: `📉 PRICE DROP ALERT! "${newP.name}" just dropped from $${oldP.price} to $${newP.price}! Save $${Math.round((oldP.price - newP.price) * 100) / 100} instantly.`,
                  channel: chan,
                  receivedAt: new Date().toLocaleTimeString()
                };
                setSimulatedAlertsFeed((prev) => [newFeedEntry, ...prev]);
              });
            }

            // 2. Detect back-in-stock
            if (newP.stock > 0 && oldP.stock === 0 && userAlertConfig.backInStock) {
              const channels: ("SMS" | "Email" | "WhatsApp")[] = [];
              if (userAlertConfig.sms) channels.push("SMS");
              if (userAlertConfig.email) channels.push("Email");
              if (userAlertConfig.whatsapp) channels.push("WhatsApp");

              channels.forEach((chan) => {
                const newFeedEntry = {
                  id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  productName: newP.name,
                  message: `🔥 BACK IN STOCK ALERT! "${newP.name}" is now available at Talomart warehouse (${newP.stock} units left). Grab yours quick before it sells out!`,
                  channel: chan,
                  receivedAt: new Date().toLocaleTimeString()
                };
                setSimulatedAlertsFeed((prev) => [newFeedEntry, ...prev]);
              });
            }
          }
        }
      });
    }
    prevProductsRef.current = products;
  }, [products, savedAlerts]);

  // Fetch or link profile
  const fetchLoyalty = async (emailToFetch: string, nameToFetch?: string, phoneToFetch?: string) => {
    if (!emailToFetch) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/loyalty/${encodeURIComponent(emailToFetch)}`);
      if (resp.ok) {
        const data = await resp.json();
        setLoyaltyProfile(data);
        setUserEmail(emailToFetch);
        if (nameToFetch) setUserName(nameToFetch);
        if (phoneToFetch) setUserPhone(phoneToFetch);
        setMessage({
          text: `Successfully authenticated! Welcome to Talomart Rewards, ${nameToFetch || emailToFetch}. Your 100 PTS bonus is synced!`,
          success: true
        });
      } else {
        setMessage({ text: "Failed to retrieve loyalty profile data.", success: false });
      }
    } catch (e) {
      setMessage({ text: "Error connecting to loyalty system database.", success: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail && !loyaltyProfile) {
      fetchLoyalty(userEmail);
    }
  }, [userEmail]);

  const handleManualProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    fetchLoyalty(inputEmail.trim(), inputName.trim(), inputPhone.trim());
  };

  // Mock social authentication loop
  const triggerSocialLogin = (platform: "Google" | "Facebook" | "Apple") => {
    setSocialLoading(platform);
    setMessage(null);

    let mockEmail = "";
    let mockName = "";
    if (platform === "Google") {
      mockEmail = "edward.nganga.google@gmail.com";
      mockName = "Edward Nganga (Google)";
    } else if (platform === "Facebook") {
      mockEmail = "edward_facebook_rewards@feebook.org";
      mockName = "Nganga Edward (Facebook)";
    } else {
      mockEmail = "edward.apple.icloud@apple.com";
      mockName = "Edward Apple User";
    }

    setTimeout(() => {
      setSocialLoading(null);
      setInputEmail(mockEmail);
      setInputName(mockName);
      fetchLoyalty(mockEmail, mockName, "+254722000111");
    }, 1200);
  };

  const claimCoupon = async (code: string, cost: number, val: number) => {
    if (!loyaltyProfile) return;
    if (loyaltyProfile.points < cost) {
      setMessage({ text: `Inadequate Points. You need at least ${cost} PTS to claim this voucher.`, success: false });
      return;
    }

    try {
      setLoading(true);
      const resp = await fetch(`/api/loyalty/${encodeURIComponent(loyaltyProfile.userEmail)}/claim-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCost: cost,
          discountValue: val,
          couponCode: code
        })
      });

      if (resp.ok) {
        const result = await resp.json();
        setLoyaltyProfile(result.updatedProfile);
        onApplyCoupon(code, val);
        setMessage({
          text: `🎉 Voucher ${code} successfully activated! A $${val} direct deduction was loaded into your cart!`,
          success: true
        });
      } else {
        setMessage({ text: "Failed to claim reward coupon voucher.", success: false });
      }
    } catch (err) {
      setMessage({ text: "Connection failure with point ledger.", success: false });
    } finally {
      setLoading(false);
    }
  };

  // Toggle checklist for alerts
  const handleToggleAlertConfig = (productId: string, key: "email" | "sms" | "whatsapp" | "priceDrop" | "backInStock") => {
    setSavedAlerts((prev) => {
      const current = prev[productId] || {
        email: true,
        sms: false,
        whatsapp: true,
        priceDrop: true,
        backInStock: true
      };
      const updated = {
        ...current,
        [key]: !current[key]
      };
      return {
        ...prev,
        [productId]: updated
      };
    });
  };

  // Share Wishlist Link Generator
  const handleCopyWishlistLink = () => {
    if (wishlist.length === 0) return;
    const shareableUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?wishlist=${wishlist.join(",")}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedWishlistIdx(true);
    setTimeout(() => setCopiedWishlistIdx(false), 2500);
  };

  // Share referral Code generator
  const handleCopyReferralLink = () => {
    const referralUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?ref=${encodeURIComponent(userEmail)}`;
    navigator.clipboard.writeText(referralUrl);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  // Filter orders matching logged-in user email
  const myOrders = orders.filter(
    (order) => order.customerEmail.toLowerCase().trim() === userEmail.toLowerCase().trim()
  );

  const couponsAvailable = [
    { code: "TALO5", reward: "5% Discount Voucher", cost: 100, value: 5, bg: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300" },
    { code: "TALO15", reward: "15% Premium Discount", cost: 250, value: 15, bg: "bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300" },
    { code: "TALO30", reward: "30% Elite Direct Reduction", cost: 500, value: 30, bg: "bg-indigo-50 text-indigo-800 border-indigo-200 hover:border-indigo-300" }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum":
        return "from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/20";
      case "Gold":
        return "from-amber-600 via-amber-500 to-amber-700 text-white shadow-lg";
      case "Silver":
        return "from-slate-500 via-slate-450 to-slate-600 text-white shadow-sm";
      default:
        return "from-amber-800 to-amber-900 text-amber-100 shadow-xs";
    }
  };

  const currentWishlistProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8" id="profile-management-hub">
      {/* Header and Sync overview card */}
      <div className="bg-white rounded-2xl border border-gray-105 shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <Award className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-sans font-bold tracking-tight text-gray-900">
                  Customer Account & VIP Club
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Securely access orders, redeem reward loyalty multipliers, invite friends, and set stock alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Connected state badge */}
          {loyaltyProfile ? (
            <div className="bg-emerald-50 border border-emerald-150 px-4 py-2 rounded-xl flex items-center gap-2 max-w-full">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Logged In Securely</span>
                <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px] block">{loyaltyProfile.userEmail}</span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-150 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">Guest Browsing State</span>
                <span className="text-xs text-gray-600">Sync with email to claim your 100 PTS signup key!</span>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Simulated Alert Notifications Stream Bar */}
        {simulatedAlertsFeed.length > 0 && (
          <div className="mt-6 bg-amber-50 rounded-xl border border-amber-200/60 p-4">
            <h4 className="text-xs font-bold text-amber-850 flex items-center gap-1.5 mb-2.5">
              <BellRing className="h-4 w-4 text-amber-600 animate-bounce" />
              SIMULATED OUTGOING SUBSCRIBER NOTIFICATION TRIGGERS (Live price drops / stock alerts)
            </h4>
            <div className="space-y-2 max-h-[140px] overflow-y-auto">
              {simulatedAlertsFeed.map((feed) => (
                <div
                  key={feed.id}
                  className="bg-white/85 border border-amber-200/50 p-2.5 rounded-lg flex justify-between items-start text-xs text-gray-700 shadow-2xs"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-amber-900">{feed.message}</p>
                    <div className="flex items-center gap-2 text-[9px] text-gray-400 font-mono">
                      <span className="bg-amber-100 text-amber-800 px-1.5 rounded-sm">Channel: {feed.channel}</span>
                      <span>• Sent to: {userEmail}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono shrink-0">{feed.receivedAt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manage Details Form and Social logins card */}
        <div className="mt-6 border-t border-gray-100 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleManualProfileUpdate} className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Identify / Update Your Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-450 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  placeholder="e.g. Edward Nganga"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-450 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  placeholder="name@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-450 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden"
                  placeholder="e.g. +254 712 345 678"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {loading ? "Synchronizing..." : "Sync Details & Load Points Ledger"}
            </button>
          </form>

          {/* Social Sign In Options */}
          <div className="lg:col-span-5 bg-gray-50 border border-gray-150 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                <Lock className="h-3.5 w-3.5 text-gray-500" />
                Social Express Login & Linkage
              </h3>
              <p className="text-[11px] text-gray-400 mb-4">
                Reduces signup friction instantly. Click to simulate secure federated credentials.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => triggerSocialLogin("Google")}
                disabled={socialLoading !== null}
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 transition-all flex items-center justify-between shadow-3xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.94 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.77 2.92C5.92 6.96 8.71 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.54z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.01 10.64c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.24 3.11c-.78 1.56-1.24 3.31-1.24 5.22 0 1.91.46 3.66 1.24 5.22l3.77-2.91z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 18.96c-3.29 0-6.08-1.92-7-4.6l-3.77 2.92C3.2 21.27 7.24 23 12 23c2.94 0 5.64-.96 7.68-2.61l-3.66-2.84c-1.11.75-2.5 1.41-4.02 1.41z"
                    />
                  </svg>
                  <span>{socialLoading === "Google" ? "Authenticating..." : "Continue with Google"}</span>
                </span>
                <ChevronRight className="h-3 w-3 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={() => triggerSocialLogin("Facebook")}
                disabled={socialLoading !== null}
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 transition-all flex items-center justify-between shadow-3xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 fill-blue-600" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                  </svg>
                  <span>{socialLoading === "Facebook" ? "Connecting API..." : "Continue with Facebook"}</span>
                </span>
                <ChevronRight className="h-3 w-3 text-gray-400" />
              </button>

              <button
                type="button"
                onClick={() => triggerSocialLogin("Apple")}
                disabled={socialLoading !== null}
                className="w-full bg-white hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 transition-all flex items-center justify-between shadow-3xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 fill-gray-900" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.55 2.95-1.39z" />
                  </svg>
                  <span>{socialLoading === "Apple" ? "Connecting iOS..." : "Sign in with Apple"}</span>
                </span>
                <ChevronRight className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-xs font-medium transition-all ${
              message.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {message.success ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <div>{message.text}</div>
          </div>
        )}
      </div>

      {/* Main Hub Tabs list selector */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setInnerTab("rewards")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 px-3 ${
            innerTab === "rewards"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-450 hover:text-gray-750"
          }`}
        >
          <Award className="h-4 w-4" />
          My Rewards & Profile
        </button>

        <button
          onClick={() => setInnerTab("orders")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 px-3 ${
            innerTab === "orders"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-450 hover:text-gray-750"
          }`}
        >
          <Clock className="h-4 w-4" />
          My Orders History ({myOrders.length})
        </button>

        <button
          onClick={() => setInnerTab("wishlist")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 px-3 ${
            innerTab === "wishlist"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-450 hover:text-gray-750"
          }`}
        >
          <Heart className="h-4 w-4" />
          Wishlist & Live Alerts ({wishlist.length})
        </button>

        <button
          onClick={() => setInnerTab("referral")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all border-b-2 px-3 ${
            innerTab === "referral"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-450 hover:text-gray-750"
          }`}
        >
          <Users className="h-4 w-4" />
          Referral Credit Hub
        </button>
      </div>

      {/* INNER TAB CONTENT */}

      {/* 💳 TAB 1: Loyalty programs points ledger */}
      {innerTab === "rewards" && (
        <div className="space-y-6">
          {loyaltyProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Membership status card */}
              <div
                className={`rounded-2xl p-6 bg-gradient-to-br flex flex-col justify-between shadow-md text-white ${getTierColor(
                  loyaltyProfile.tier
                )}`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest opacity-80 block font-bold">
                        VIP Membership Tier
                      </span>
                      <h3 className="text-3xl font-black tracking-tight">{loyaltyProfile.tier}</h3>
                    </div>
                    <span className="bg-white/20 p-2.5 rounded-xl backdrop-blur-xs">
                      <Award className="h-6 w-6" />
                    </span>
                  </div>

                  <div className="mt-8">
                    <span className="text-[10px] font-bold uppercase opacity-80 block tracking-wider">
                      Redeemable Point Balance
                    </span>
                    <span className="text-4xl font-sans font-bold tracking-tight">
                      {loyaltyProfile.points}{" "}
                      <span className="text-sm font-semibold opacity-90">PTS</span>
                    </span>
                  </div>
                </div>

                <div className="mt-8 border-t border-white/20 pt-4 flex items-center gap-2.5 text-xs">
                  <Sparkles className="h-4 w-4 animate-pulse text-amber-300" />
                  <span className="font-medium">
                    {loyaltyProfile.tier === "Platinum" ? (
                      "Elite tier unlocked. Free Shipping + 15% cashback applied!"
                    ) : loyaltyProfile.tier === "Gold" ? (
                      "Need 500 PTS total for Platinum Elite upgrade!"
                    ) : loyaltyProfile.tier === "Silver" ? (
                      "Need 250 PTS total for Gold status level!"
                    ) : (
                      "Earn 100 PTS to advance onto Silver tier!"
                    )}
                  </span>
                </div>
              </div>

              {/* Redeem points card vouchers list */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Gift className="h-4.5 w-4.5 text-purple-600" />
                  Redeem Rewards Points for Vouchers
                </h3>
                <p className="text-xs text-gray-500">
                  Instantly convert points into direct savings applied at payment checkout.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {couponsAvailable.map((coupon) => {
                    const isAffordable = loyaltyProfile.points >= coupon.cost;
                    const isCurrentlyApplied = couponApplied?.code === coupon.code;
                    return (
                      <div
                        key={coupon.code}
                        className={`border rounded-xl p-4 flex flex-col justify-between gap-4 text-center transition-all shadow-3xs ${
                          coupon.bg
                        } ${isCurrentlyApplied ? "ring-2 ring-indigo-500 scale-[1.01]" : ""}`}
                      >
                        <div>
                          <span className="text-[10px] tracking-wider uppercase font-extrabold px-2 py-0.5 rounded-md bg-white text-gray-700 shadow-2xs border">
                            {coupon.code}
                          </span>
                          <h4 className="text-lg font-bold tracking-tight mt-3 text-gray-900">
                            -${coupon.value} OFF Total
                          </h4>
                          <span className="text-[11px] block text-gray-500 opacity-90 leading-tight">
                            {coupon.reward}
                          </span>
                        </div>

                        <button
                          onClick={() => claimCoupon(coupon.code, coupon.cost, coupon.value)}
                          disabled={!isAffordable || loading || isCurrentlyApplied}
                          className={`text-xs py-2 px-3 rounded-lg font-bold transition-all cursor-pointer ${
                            isCurrentlyApplied
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : isAffordable
                              ? "bg-slate-900 hover:bg-slate-950 text-white hover:scale-[1.02]"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {isCurrentlyApplied ? "Currently Loaded" : `Exchange ${coupon.cost} PTS`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Ledger dynamic list info */}
                <div className="border-t border-gray-150 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <Clock className="text-gray-400 h-3.5 w-3.5" />
                    Points Transactions Log Ledger
                  </h4>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {loyaltyProfile.history.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No points history available yet.</p>
                    ) : (
                      loyaltyProfile.history.map((hist, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-gray-50 hover:bg-gray-100/70 p-2.5 rounded-lg border border-gray-150/40 text-xs text-gray-700 transition"
                        >
                          <div className="font-semibold">{hist.reason}</div>
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="text-gray-400">
                              {new Date(hist.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric"
                              })}
                            </span>
                            <span
                              className={`font-bold ${
                                hist.pointsAdded >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {hist.pointsAdded >= 0 ? `+${hist.pointsAdded}` : hist.pointsAdded} PTS
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 border border-dashed rounded-2xl p-6">
              <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-md font-semibold text-gray-700">Retrieve Loyalty Passbook</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Enter your email address into our Identification form above to instantiate your premium VIP member reward account and credit 100 PTS instantly!
              </p>
            </div>
          )}
        </div>
      )}

      {/* 📦 TAB 2: Order logs with re-order option */}
      {innerTab === "orders" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-3 mb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Your Order History</h3>
              <p className="text-xs text-gray-500">
                Found {myOrders.length} processed orders linked to {userEmail}.
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab("store")}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              Back to Storefront <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {myOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-400">
              <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-xs text-gray-500 font-medium">No past purchases logged under this account yet.</p>
              <button
                onClick={() => onNavigateToTab("store")}
                className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer transition-colors"
              >
                Browse & Order Accessories
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-150 p-5 shadow-3xs hover:border-gray-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-gray-100 pb-3 mb-3 text-xs">
                    <div>
                      <span className="font-mono text-gray-400 text-[10px] block">ORDER ID</span>
                      <span className="font-bold text-gray-800 text-sm">{order.id}</span>
                    </div>

                    <div className="flex items-center gap-5">
                      <div>
                        <span className="text-gray-400 text-[10px] block font-mono">ORDER DATE</span>
                        <span className="font-semibold text-gray-700">
                          {new Date(order.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 text-[10px] block font-mono">STATUS</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === "delivered"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-150"
                              : order.status === "shipped"
                              ? "bg-cyan-50 text-cyan-800 border border-cyan-150"
                              : "bg-amber-50 text-amber-800 border border-amber-150"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-4 gap-x-6 items-center">
                    <div className="lg:col-span-8 space-y-2">
                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-gray-400 block">
                        Purchased Items Listing
                      </span>
                      <div className="divide-y divide-gray-50 max-h-[140px] overflow-y-auto pr-2">
                        {order.items.map((item, id) => (
                          <div key={id} className="flex justify-between py-1.5 text-xs">
                            <span className="text-gray-700 font-medium truncate max-w-[80%]">
                              {item.productName} <span className="text-gray-400 font-mono text-[10px]">x{item.quantity}</span>
                            </span>
                            <span className="font-semibold text-gray-900 font-mono">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick 1-Click Reorder Action card */}
                    <div className="lg:col-span-4 bg-gray-50 border border-gray-150 rounded-xl p-4 flex flex-col justify-between h-full space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Final Charge Paid:</span>
                        <span className="font-bold text-gray-900 text-sm font-mono">${order.finalAmount.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => onReorder(order.items)}
                        className="w-full bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-xs"
                      >
                        <RotateCcw className="h-4.5 w-4.5 shrink-0" />
                        1-Click Reorder All Items
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 💖 TAB 3: Wishlist items with alert settings and link generation */}
      {innerTab === "wishlist" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-3.5">
            <div>
              <h3 className="text-md font-bold text-gray-800">Your Saved Accessories List</h3>
              <p className="text-xs text-gray-500">
                You have {currentWishlistProducts.length} items flagged. Customize Price Alerts and share list configurations.
              </p>
            </div>

            {currentWishlistProducts.length > 0 && (
              <button
                onClick={handleCopyWishlistLink}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 px-3.5 rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
              >
                {copiedWishlistIdx ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    Copied Live Link!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 text-indigo-600" />
                    Share Saved List with Others
                  </>
                )}
              </button>
            )}
          </div>

          {currentWishlistProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-400">
              <Bookmark className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-xs text-gray-500 font-medium">No accessories inside your saved list currently.</p>
              <button
                onClick={() => onNavigateToTab("store")}
                className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer transition-colors"
              >
                Browse Premium Gadgets
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {currentWishlistProducts.map((p) => {
                const config = savedAlerts[p.id] || {
                  email: true,
                  sms: false,
                  whatsapp: true,
                  priceDrop: true,
                  backInStock: true
                };

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-gray-150 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-3xs hover:border-gray-300 transition-all"
                  >
                    {/* Access point image metadata info */}
                    <div className="flex items-center gap-4 max-w-sm">
                      <img
                        src={p.image}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover bg-gray-50 border shrink-0"
                      />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                          {p.category}
                        </h4>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight block mt-0.5">
                          {p.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="font-bold text-gray-950 font-mono">${p.price}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-sm text-[9px] font-bold ${
                              p.stock > 0
                                ? "bg-emerald-50 text-emerald-800 border"
                                : "bg-rose-50 text-rose-800 border"
                            }`}
                          >
                            {p.stock > 0 ? `${p.stock} in warehouse` : "Out of Stock"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Alert preferences subscription panel */}
                    <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 shrink-0 w-full md:w-auto md:min-w-[420px]">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                          <Bell className="h-3.5 w-3.5 text-indigo-505" />
                          ALERTS PREFERENCES
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-[9px] font-mono text-gray-400">Monitoring Active</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b pb-3 mb-2.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-650 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.priceDrop}
                            onChange={() => handleToggleAlertConfig(p.id, "priceDrop")}
                            className="rounded text-indigo-600 focus:ring-xs cursor-pointer h-3.5 w-3.5"
                          />
                          📉 Alert price drops
                        </label>

                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-650 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.backInStock}
                            onChange={() => handleToggleAlertConfig(p.id, "backInStock")}
                            className="rounded text-indigo-600 focus:ring-xs cursor-pointer h-3.5 w-3.5"
                          />
                          🔥 Alert restock status
                        </label>
                      </div>

                      {/* Outgoing channel preferences */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-550">
                        <span className="font-bold uppercase tracking-wider text-gray-400 text-[9px]">Notify via:</span>

                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.email}
                            onChange={() => handleToggleAlertConfig(p.id, "email")}
                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer h-3 w-3"
                          />
                          <Mail className="h-3 w-3 text-red-500" /> Email
                        </label>

                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.sms}
                            onChange={() => handleToggleAlertConfig(p.id, "sms")}
                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer h-3 w-3"
                          />
                          <Smartphone className="h-3 w-3 text-emerald-500" /> SMS
                        </label>

                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.whatsapp}
                            onChange={() => handleToggleAlertConfig(p.id, "whatsapp")}
                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer h-3 w-3"
                          />
                          <MessageSquare className="h-3 w-3 text-green-500" /> WhatsApp
                        </label>
                      </div>
                    </div>

                    {/* Quick cart conversion / actions button controls */}
                    <div className="flex md:flex-col gap-2 w-full md:w-auto justify-end">
                      <button
                        onClick={() => onAddToCart(p)}
                        disabled={p.stock === 0}
                        className="flex-1 md:flex-none py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all hover:scale-[1.02] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Buy Now
                      </button>

                      <button
                        onClick={() => handleToggleAlertConfig(p.id, "priceDrop")} // Uses toggle helper
                        className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                        title="Alert Configuration Details"
                      >
                        <BellRing className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 🔗 TAB 4: Invites and Referrals Code Hub */}
      {innerTab === "referral" && (
        <div className="space-y-6">
          <div className="border-b pb-3 opacity-95">
            <h3 className="text-md font-extrabold text-gray-800">Talomart Customer Referral Circle</h3>
            <p className="text-xs text-gray-500">
              Share your custom code to earn 150 loyalty points instantly when a friend processes their initial order purchase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-indigo-900 text-white rounded-2xl p-6 shadow-md">
            <div className="space-y-4">
              <span className="p-2.5 bg-indigo-800 rounded-xl inline-block">
                <Users className="h-6 w-6 text-indigo-300" />
              </span>
              <h4 className="text-xl font-bold tracking-tight">Earn Points While Sharing the Spark</h4>
              <p className="text-xs text-indigo-100 leading-relaxed font-sans opacity-90">
                Whenever a friend clicks on your exclusive personal invitation link, registers, and successfully verifies an accessory order, your system profile automatically locks a <strong>150 PTS</strong> instant voucher reward bonus, pushing you up the VIP membership tier ladder.
              </p>

              <div className="space-y-2 border-t border-indigo-800 pt-4">
                <div className="flex items-center gap-2.5 text-xs text-indigo-200">
                  <CheckCircle className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Friend gets 100 PTS instant signup wallet top-up</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-indigo-200">
                  <CheckCircle className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Referrer gets credited 150 PTS directly</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider block font-bold text-indigo-300">
                  YOUR PERSONALIZED RE-ROUTE LINK
                </span>
                <p className="text-xs text-indigo-100 mt-1">Copy and send via WhatsApp, email, or post directly.</p>
              </div>

              <div className="bg-white rounded-xl p-3 flex justify-between items-center text-gray-800 shadow-sm border">
                <span className="text-xs font-mono select-all truncate max-w-[70%] font-semibold">
                  {`${window.location.protocol}//${window.location.host}?ref=${encodeURIComponent(userEmail)}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReferralLink}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {copiedReferral ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              <div className="bg-indigo-950/20 rounded-xl p-4 border border-indigo-700/30">
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1 shadow-2xs">
                  Loyalty Referral Milestones
                </h5>
                <div className="flex justify-between items-center text-[10px] text-indigo-100">
                  <span>Current Referrer ID:</span>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">
                    {userEmail.split("@")[0].toUpperCase()}-REF
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
