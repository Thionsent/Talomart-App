import React, { useState } from "react";
import { Product, Review } from "../types";
import PromoCarousel from "./PromoCarousel";
import {
  Search,
  SlidersHorizontal,
  Heart,
  ShoppingCart,
  Star,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck,
  Send,
  BatteryCharging,
  HardDrive,
  Cpu,
  BookmarkCheck,
  Headphones,
  CheckCircle,
  Clock,
  MessageCircle,
  X,
  Award
} from "lucide-react";

interface ProductsSectionProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (productId: string) => void;
  wishlist: string[];
  onSelectProduct: (product: Product) => void;
  onNavigateToTab: (tab: "store" | "cart" | "wishlist" | "loyalty" | "dashboard") => void;
}

export default function ProductsSection({
  products,
  onAddToCart,
  onAddToWishlist,
  wishlist,
  onSelectProduct,
  onNavigateToTab
}: ProductsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("default");
  const [showInStockOnly, setShowInStockOnly] = useState<boolean>(false);

  const categories = [
    { id: "all", label: "Show All", icon: Compass },
    { id: "chargers", label: "Chargers & Power", icon: BatteryCharging },
    { id: "flash-drives", label: "Flash Drives", icon: HardDrive },
    { id: "memory-cards", label: "Memory Cards", icon: Cpu },
    { id: "audio", label: "Hi-Res Audio", icon: Headphones },
    { id: "cases", label: "Cases & Glass", icon: ShieldCheck }
  ];

  // Filtering products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock = !showInStockOnly || p.stock > 0;
    return matchesCategory && matchesSearch && matchesStock;
  });

  // Sorting products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-asc") {
      return a.price - b.price;
    }
    if (sortBy === "price-desc") {
      return b.price - a.price;
    }
    if (sortBy === "rating-desc") {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0; // Default order
  });

  const isFiltered = selectedCategory !== "all" || searchQuery !== "" || sortBy !== "default" || showInStockOnly;

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSearchQuery("");
    setSortBy("default");
    setShowInStockOnly(false);
  };

  return (
    <div id="store-explore" className="space-y-6">
      {/* High Fidelity animated PromoCarousel component */}
      <PromoCarousel
        products={products}
        onAddToCart={onAddToCart}
        onSelectProduct={onSelectProduct}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Control filters and Searching bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chargers, memory cards, flash drives, audio connectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-150 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-550 focus:border-indigo-550"
          />
        </div>

        {/* Filters and Sorting controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Price Sorting Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-gray-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-white border border-gray-150 rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-indigo-550 text-gray-700 font-medium font-sans"
              title="Sort items"
            >
              <option value="default">Sort: Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Rating: Highest Rated</option>
            </select>
          </div>

          {/* In Stock Filter Toggle */}
          <button
            onClick={() => setShowInStockOnly(!showInStockOnly)}
            className={`text-xs px-3 py-2 rounded-xl border transition-all cursor-pointer font-medium font-sans shrink-0 ${
              showInStockOnly
                ? "bg-emerald-50 text-emerald-750 border-emerald-250 font-bold"
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-150"
            }`}
          >
            {showInStockOnly ? "✓ In Stock Only" : "Show All Products"}
          </button>

          {/* Reset Filters CTA */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-xs px-3 py-2 rounded-xl text-red-655 hover:bg-red-50 border border-red-150/50 hover:border-red-200 transition-all font-semibold font-sans cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}

          {/* Custom counts */}
          <span className="text-xs text-gray-500 font-medium font-mono shrink-0">
            {sortedProducts.length} accessories found
          </span>
        </div>
      </div>

      {/* Category selector row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all cursor-pointer border shrink-0 text-nowrap ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-650 shadow-xs scale-102"
                  : "bg-white hover:bg-gray-50 text-gray-700 border-gray-150"
              }`}
            >
              <CatIcon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Products list grid */}
      {sortedProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 border border-dashed rounded-2xl">
          <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <h4 className="text-gray-750 font-bold">No retail phone accessories matches your query</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Try correcting spelling, choosing general tags, or switching filters to uncover other chargers and adapters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {sortedProducts.map((p) => {
            const isWish = wishlist.includes(p.id);
            const isOut = p.stock === 0;
            const isLow = p.stock < 15;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 transition-all duration-300 hover:shadow-md hover:border-gray-200/95 flex flex-col justify-between group"
              >
                <div>
                  {/* Photo area with status alerts */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-50 relative border border-gray-50">
                    <img
                      referrerPolicy="no-referrer"
                      src={p.image}
                      alt={p.name}
                      onClick={() => onSelectProduct(p)}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-350 cursor-pointer"
                    />

                    {/* Category Label badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                      <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-white/10 shadow-xs">
                        {p.category}
                      </span>
                    </div>

                    {/* Stock Alert overlay */}
                    <div className="absolute bottom-2 left-2 z-10">
                      {isOut ? (
                        <span className="bg-rose-600 text-white text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                          SOLD OUT
                        </span>
                      ) : isLow ? (
                        <span className="bg-amber-500 text-slate-950 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                          LOW STOCK: {p.stock} LEFT
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-85 w border border-emerald-200 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md shadow-xs">
                          IN STOCK
                        </span>
                      )}
                    </div>

                    {/* Heart wishlist */}
                    <button
                      onClick={() => onAddToWishlist(p.id)}
                      className={`absolute top-2 right-2 p-1.5 rounded-full shadow-xs transition-colors cursor-pointer z-10 ${
                        isWish
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : "bg-white/80 backdrop-blur-md text-gray-400 hover:text-rose-600 hover:bg-white"
                      }`}
                      title="Add to Wishlist"
                    >
                      <Heart className={`h-4 w-4 ${isWish ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  {/* Rating info & Details */}
                  <div className="mt-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <div className="flex items-center text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        <span className="ml-1 text-gray-800 font-bold font-sans">{p.rating || "NEW"}</span>
                      </div>
                      <span>•</span>
                      <span className="hover:underline cursor-pointer" onClick={() => onSelectProduct(p)}>
                        {p.reviewsCount} verified reviews
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectProduct(p)}
                      className="font-bold text-gray-850 hover:text-indigo-650 transition-colors cursor-pointer truncate text-xs leading-tight"
                      title={p.name}
                    >
                      {p.name}
                    </h3>

                    <p className="text-gray-450 line-clamp-2 text-[11px] leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-base font-black font-sans text-gray-900">${p.price.toFixed(2)}</span>
                  <button
                    onClick={() => onAddToCart(p)}
                    disabled={isOut}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                      isOut
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-705 text-white"
                    }`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {isOut ? "Out" : "Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
