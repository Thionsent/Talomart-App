import React, { useEffect, useState } from "react";
import { Product, RecommendationResponse } from "../types";
import { Sparkles, BrainCircuit, ArrowUpRight, BatteryCharging, HardDrive, Cpu, Heart } from "lucide-react";

interface RecommendationsSectionProps {
  browsingHistory: string[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToWishlist: (pId: string) => void;
  wishlist: string[];
  onAddToCart: (product: Product) => void;
}

export default function RecommendationsSection({
  browsingHistory,
  products,
  onSelectProduct,
  onAddToWishlist,
  wishlist,
  onAddToCart
}: RecommendationsSectionProps) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyProductIds: browsingHistory })
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed fetching recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [browsingHistory]); // Reload whenever browsing history is updated

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100/50 my-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="h-5 w-5 text-indigo-500 animate-spin" />
          <div className="h-5 bg-indigo-200 rounded-md w-48"></div>
        </div>
        <div className="h-4 bg-indigo-150 rounded-md w-full mb-2"></div>
        <div className="h-4 bg-indigo-150 rounded-md w-3/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 h-36 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.recommendedIds || data.recommendedIds.length === 0) return null;

  // Retrieve products matching the recommended IDs
  const recommendedProducts = products.filter((p) => data.recommendedIds.includes(p.id));

  // If filtered products turns out empty, grab first 3
  const finalProducts = recommendedProducts.length > 0 ? recommendedProducts : products.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-900 my-6" id="ai-recommends">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-indigo-900 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600/30 p-2 rounded-xl border border-indigo-500/30 animate-pulse">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-indigo-200">Talomart Smart AI Recommendations</h3>
            <p className="text-xs text-slate-400 font-mono">POWERED BY GEMINI 3.5 FLASH</p>
          </div>
        </div>

        {browsingHistory.length > 0 ? (
          <span className="text-[10px] uppercase font-mono bg-indigo-950 font-bold tracking-widest text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-800">
            Based on {browsingHistory.length} viewed item{browsingHistory.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-[10px] uppercase font-mono bg-slate-800 font-bold tracking-widest text-slate-350 px-2.5 py-1 rounded-full border border-slate-700">
            Tending highlights
          </span>
        )}
      </div>

      {/* Explanation dialogue */}
      <div className="bg-indigo-950/40 backdrop-blur-md rounded-xl p-4 border border-indigo-805/30 mb-6 flex items-start gap-3">
        <BrainCircuit className="h-10 w-10 text-indigo-400 shrink-0 mt-0.5 border border-indigo-500/20 p-2 rounded-lg bg-indigo-950" />
        <div>
          <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-semibold block">Talomart Digital Assistant:</span>
          <p className="text-sm font-sans text-slate-200 leading-relaxed mt-1 italic">
            "{data.explanation}"
          </p>
        </div>
      </div>

      {/* Recommendations Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {finalProducts.map((product) => {
          const isWish = wishlist.includes(product.id);
          return (
            <div
              key={product.id}
              className="bg-slate-900/60 rounded-xl border border-indigo-950/50 hover:border-indigo-650 hover:bg-slate-900/90 transition-all duration-300 p-4 flex flex-col justify-between group"
            >
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-800 bg-slate-950 relative">
                  <img
                    referrerPolicy="no-referrer"
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.category === "chargers" && (
                    <div className="absolute top-1 left-1 bg-amber-500 p-1 rounded-md text-[9px] font-black text-slate-950 shadow-xs">
                      <BatteryCharging className="h-2.5 w-2.5" />
                    </div>
                  )}
                  {product.category === "flash-drives" && (
                    <div className="absolute top-1 left-1 bg-cyan-500 p-1 rounded-md text-[9px] font-black text-slate-950 shadow-xs">
                      <HardDrive className="h-2.5 w-2.5" />
                    </div>
                  )}
                  {product.category === "memory-cards" && (
                    <div className="absolute top-1 left-1 bg-purple-500 p-1 rounded-md text-[9px] font-black text-slate-950 shadow-xs">
                      <Cpu className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between min-w-0">
                  <div>
                    <h4
                      onClick={() => onSelectProduct(product)}
                      className="text-xs font-semibold text-white tracking-tight hover:text-indigo-300 transition-colors cursor-pointer truncate max-w-[150px]"
                      title={product.name}
                    >
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-indigo-400 font-sans mt-1">
                    ${product.price}
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-4 pt-3 border-t border-slate-800/60">
                <button
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock === 0}
                  className={`flex-1 text-center py-1 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    product.stock > 0
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
                <button
                  onClick={() => onAddToWishlist(product.id)}
                  className={`p-1.5 rounded border transition-all cursor-pointer ${
                    isWish
                      ? "border-rose-800 bg-rose-950/45 text-rose-400 hover:bg-rose-900 hover:text-white"
                      : "border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                  title="Add to wishlist"
                >
                  <Heart className="h-3.5 w-3.5 fill-current" />
                </button>
                <button
                  onClick={() => onSelectProduct(product)}
                  className="p-1.5 rounded border border-slate-850 text-slate-400 hover:text-indigo-300 hover:border-indigo-800 hover:bg-slate-800 transition-all cursor-pointer"
                  title="View Specs details"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
