import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Award,
  Clock,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  BadgePercent,
  Cpu,
  ShieldCheck,
  Eye
} from "lucide-react";

interface PromoCarouselProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateToTab: (tab: "store" | "cart" | "loyalty" | "dashboard") => void;
}

export default function PromoCarousel({
  products,
  onAddToCart,
  onSelectProduct,
  onNavigateToTab
}: PromoCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  // We find some relevant flagship accessories to showcase inline inside the carousel slides!
  const premiumCharger = products.find(p => p.category === "chargers" && p.stock > 0);
  const extremeMemory = products.find(p => p.category === "memory-cards" && p.stock > 0);
  const flashDrive = products.find(p => p.category === "flash-drives" && p.stock > 0);

  const slides = [
    {
      id: "black-friday",
      tag: "⚡ BLACK FRIDAY SPECIAL DEALS",
      title: "Insane 50% Off Phone Essentials",
      desc: "The largest mobile accessory event is active! Secure military-grade GaN warp travel chargers, extreme endurance microSDs, and armored glass with automatic price slashes.",
      badge: "BF50 PROMO LIVE",
      colorSchema: "from-slate-950 via-red-950 to-neutral-900 border-red-900/40",
      textColor: "text-red-400",
      accentBg: "bg-red-500/10 text-red-400 border-red-500/20",
      mainButtonLabel: "Claim Coupon in Clubs Tab",
      action: () => onNavigateToTab("loyalty"),
      featuredProduct: premiumCharger,
      promoCode: "BF50"
    },
    {
      id: "latest-arrivals",
      tag: "🔥 NEW FAST CHARGING ARRIVALS",
      title: "120W SuperVOOC GaN Adapters",
      desc: "Warp charge three dynamic high-demand electronics simultaneously. Features dual GaN smart chips, automatic power-distribution sensing, and real-time safe thermals.",
      badge: "FLUID WARP SPEED",
      colorSchema: "from-slate-900 via-indigo-950 to-slate-900 border-indigo-950/50",
      textColor: "text-indigo-400",
      accentBg: "bg-indigo-505/10 text-indigo-400 border-indigo-500/25",
      mainButtonLabel: "Explore Storefront Accessories",
      action: () => onNavigateToTab("store"),
      featuredProduct: flashDrive,
      promoCode: "NONE"
    },
    {
      id: "loyalty-perks",
      tag: "🎁 THE TALOMART CLUB REWARDS",
      title: "Turn checkout points into cash!",
      desc: "Join the VIP Club to acquire cash back vouchers & free doorstep deliveries! Earn points dynamically with every phone accessory purchase on your registered email.",
      badge: "EARN 2X CLUB POINTS",
      colorSchema: "from-purple-950 via-slate-900 to-indigo-950 border-purple-900/45",
      textColor: "text-amber-400",
      accentBg: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      mainButtonLabel: "Sign up & claim 500 Points",
      action: () => onNavigateToTab("loyalty"),
      featuredProduct: extremeMemory,
      promoCode: "ACTIVE"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleNextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const activeSlide = slides[currentSlide];

  return (
    <div 
      className="relative rounded-2xl overflow-hidden shadow-2xl border bg-slate-950 text-white select-none group min-h-[340px] md:min-h-[300px] flex items-stretch"
      id="homepage-interactive-carousel"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.12),transparent)] opacity-90 z-0"></div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          initial={{ opacity: 0, x: direction * 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction * 50 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className={`w-full bg-gradient-to-r ${activeSlide.colorSchema} p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6 z-10`}
        >
          {/* Main textual campaign content */}
          <div className="space-y-4 max-w-lg text-center md:text-left flex-1">
            <span className={`inline-flex items-center gap-1.5 border px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest ${activeSlide.accentBg} animate-pulse`}>
              <Sparkles className="h-3.5 w-3.5" />
              {activeSlide.tag}
            </span>

            <h2 className="text-2xl md:text-3.5xl font-sans tracking-tight font-extrabold text-white leading-tight">
              {activeSlide.title}
            </h2>

            <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-md font-sans opacity-95">
              {activeSlide.desc}
            </p>

            {/* Campaign buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={activeSlide.action}
                id={`carousel-slide-cta-${activeSlide.id}`}
                className="bg-indigo-650 hover:bg-indigo-550 border border-indigo-500 font-sans font-bold text-xs py-2 px-4 rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-1.5 hover:scale-102 transform duration-150"
              >
                <span>{activeSlide.mainButtonLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {activeSlide.promoCode !== "NONE" && (
                <div className="bg-white/10 backdrop-blur-md text-amber-300 border border-white/15 px-3 py-2 rounded-xl text-[10px] font-mono font-bold">
                  Code: <span className="underline decoration-indigo-400 decoration-2 tracking-wider">{activeSlide.id === "black-friday" ? "BF50" : "Auto-applied"}</span>
                </div>
              )}
            </div>

            {/* Quality check indicators */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4 border-t border-white/5 mx-auto md:mx-0 w-fit">
              <span className="flex items-center gap-1.5 text-slate-350 text-[10px] font-semibold">
                <CheckCircle className="h-3 w-3 text-emerald-400" /> Genuine Retail Adapter
              </span>
              <span className="flex items-center gap-1.5 text-slate-350 text-[10px] font-semibold">
                <Clock className="h-3 w-3 text-indigo-400" /> Free Pickup 1H
              </span>
              <span className="flex items-center gap-1.5 text-slate-350 text-[10px] font-semibold">
                <Award className="h-3 w-3 text-amber-400" /> PayShield Safeguard
              </span>
            </div>
          </div>

          {/* Featured product highlight segment */}
          {activeSlide.featuredProduct ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="bg-slate-900/80 backdrop-blur-md border border-white/15 rounded-2xl p-4 w-60 shrink-0 text-left relative shadow-2xl hidden md:block"
              id={`carousel-featured-${activeSlide.featuredProduct.id}`}
            >
              <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-slate-950 font-sans text-[8px] font-black rounded-md px-1.5 py-0.5 tracking-wider uppercase">
                Best Seller
              </div>
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 mb-3 relative">
                <img 
                  src={activeSlide.featuredProduct.image} 
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-mono text-indigo-300 tracking-widest font-bold">
                  {activeSlide.featuredProduct.category} Catalog
                </span>
                <h4 className="text-[11px] font-bold text-white truncate leading-tight">
                  {activeSlide.featuredProduct.name}
                </h4>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-black text-white">
                    ${activeSlide.featuredProduct.price.toFixed(2)}
                  </span>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onSelectProduct(activeSlide.featuredProduct!)}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Quick Specs Details"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onAddToCart(activeSlide.featuredProduct!)}
                      className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      title="Add to Checkout"
                    >
                      <ShoppingBag className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0 z-10 hidden sm:block">
              <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <img
                referrerPolicy="no-referrer"
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=600&auto=format&fit=crop"
                className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 hover:scale-105"
                alt=""
              />
              <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-white/15 text-white font-mono text-[9px] px-2.5 py-1 rounded shadow-lg flex items-center gap-1 z-20 font-bold">
                <Sparkles className="h-2.5 w-2.5 animate-spin text-amber-400" /> {activeSlide.badge}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Carousel control buttons: Left */}
      <button
        onClick={handlePrevSlide}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/45 hover:bg-black/70 text-white p-2.5 rounded-full border border-white/10 transition-colors backdrop-blur-xs cursor-pointer focus:outline-hidden opacity-0 group-hover:opacity-100 duration-200"
        title="Previous Special Offer"
      >
        <ChevronLeft className="h-4.5 w-4.5" />
      </button>

      {/* Carousel control buttons: Right */}
      <button
        onClick={handleNextSlide}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/45 hover:bg-black/70 text-white p-2.5 rounded-full border border-white/10 transition-colors backdrop-blur-xs cursor-pointer focus:outline-hidden opacity-0 group-hover:opacity-100 duration-200"
        title="Next Special Offer"
      >
        <ChevronRight className="h-4.5 w-4.5" />
      </button>

      {/* Dots navigation indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-1 bg-black/35 rounded-full backdrop-blur-md border border-white/5">
        {slides.map((_, dotIdx) => (
          <button
            key={dotIdx}
            onClick={() => {
              setDirection(dotIdx > currentSlide ? 1 : -1);
              setCurrentSlide(dotIdx);
            }}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              dotIdx === currentSlide ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/75"
            }`}
            title={`Go to slide ${dotIdx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
