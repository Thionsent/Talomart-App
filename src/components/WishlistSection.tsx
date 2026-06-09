import React, { useState } from "react";
import { Product } from "../types";
import { Heart, Trash2, ShoppingCart, ArrowLeft, Headphones, Share2, Check } from "lucide-react";

interface WishlistSectionProps {
  wishlist: string[];
  products: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onNavigateToTab: (tab: "store" | "cart" | "loyalty") => void;
}

export default function WishlistSection({
  wishlist,
  products,
  onRemoveFromWishlist,
  onAddToCart,
  onNavigateToTab
}: WishlistSectionProps) {
  const [copied, setCopied] = useState(false);

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  const handleShareWishlist = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?wishlist=${wishlist.join(",")}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch((err) => {
      console.error("Could not copy link: ", err);
    });
  };

  if (wishlistProducts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-10 max-w-4xl mx-auto my-6 text-center" id="empty-wish-view">
        <div className="bg-rose-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed text-rose-400">
          <Heart className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 font-sans">Your wishlist is empty</h3>
        <p className="text-xs text-gray-450 mt-1 mb-6 max-w-sm mx-auto">
          Save your favourite high speed adapters, dual-port car charges, or micro SD cards to review and purchase them later. Click on the heart icons!
        </p>
        <button
          onClick={() => onNavigateToTab("store")}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          Explore Phone Accessories catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-6" id="wishlist-workspace">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
          <Heart className="h-5 w-5 text-rose-550 fill-current" />
          Saved Accessories Wishlist ({wishlistProducts.length})
        </h3>
        <button
          onClick={handleShareWishlist}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            copied
              ? "bg-emerald-50 text-emerald-800 border-emerald-250"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-350"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-650" />
              Wishlist Link Copied!
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 text-indigo-500" />
              Share Wishlist with Friends
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {wishlistProducts.map((p) => {
          const isOut = p.stock === 0;
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-105 p-4 shadow-sm flex gap-4 hover:border-indigo-100 transition-all justify-between items-center"
            >
              <div className="flex gap-3 min-w-0 flex-1">
                <img src={p.image} className="h-14 w-14 rounded-lg object-cover border shrink-0" alt="" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-gray-800 text-xs truncate leading-snug" title={p.name}>
                    {p.name}
                  </h4>
                  <span className="text-[9px] uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded text-gray-400 font-bold font-mono border mt-1 inline-block">
                    {p.category}
                  </span>
                  <div className="text-xs font-bold text-indigo-650 mt-1">
                    ${p.price.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 shrink-0 ml-2">
                <button
                  onClick={() => onAddToCart(p)}
                  disabled={isOut}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    isOut
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-none"
                      : "bg-indigo-600 hover:bg-indigo-705 text-white"
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Add to Cart
                </button>

                <button
                  onClick={() => onRemoveFromWishlist(p.id)}
                  className="p-1.5 rounded-lg border border-gray-150 text-gray-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-colors cursor-pointer"
                  title="Remove from Saved List"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
