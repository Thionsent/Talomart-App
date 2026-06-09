import React, { useState, useEffect } from "react";
import { Product, Review } from "../types";
import { X, Star, Send, ShieldCheck, Heart, User, CheckCircle2 } from "lucide-react";

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onAddToWishlist: (productId: string) => void;
  wishlist: string[];
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onAddToWishlist,
  wishlist
}: ProductDetailModalProps) {
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Review form states
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchReviews = async (pId: string) => {
    setLoadingReviews(true);
    try {
      const resp = await fetch(`/api/reviews/${pId}`);
      if (resp.ok) {
        const data = await resp.json();
        setReviewsList(data);
      }
    } catch (e) {
      console.error("Error loading reviews:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (product) {
      fetchReviews(product.id);
      // Reset form states
      setReviewName("");
      setReviewRating(5);
      setReviewComment("");
      setMsg("");
    }
  }, [product]);

  if (!product) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) {
      setMsg("Please provide your name and comments to submit active feedback.");
      return;
    }

    setSending(true);
    try {
      const resp = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          userName: reviewName,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      if (resp.ok) {
        setMsg("Thank you! Your verified user review has been logged and aggregate score adjusted.");
        setReviewName("");
        setReviewComment("");
        // Reload reviews dynamically
        fetchReviews(product.id);
      } else {
        setMsg("Failed to record review comments.");
      }
    } catch (err) {
      setMsg("Connection timeout while processing review data.");
    } finally {
      setSending(false);
    }
  };

  const isSaved = wishlist.includes(product.id);
  const isOut = product.stock === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-all overflow-y-auto" id="accessory-spec-overlay">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col justify-between max-h-[88vh] overflow-hidden">
        {/* Header bar */}
        <div className="flex justify-between items-center border-b border-gray-100 p-4 shrink-0 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-1.5 font-sans">
            <ShieldCheck className="h-5 w-5 text-indigo-650" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Talomart Spec Specs Checklist</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable details */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Visual Photo item */}
            <div className="space-y-3">
              <div className="w-full aspect-square rounded-xl overflow-hidden border bg-gray-50">
                <img
                  referrerPolicy="no-referrer"
                  src={product.image}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>

              {/* Real-time details */}
              <div className="bg-gray-50 border p-3.5 rounded-xl space-y-1.5 font-mono text-[10px] leading-snug">
                <span className="font-bold text-gray-700 block uppercase border-b pb-1 mb-1.5 text-[9px] tracking-wider">Telemetry data specs</span>
                <div className="flex justify-between">
                  <span>Product Model ID:</span>
                  <span className="font-bold text-gray-700">{product.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Warehouse Class:</span>
                  <span className="font-bold uppercase text-gray-700">{product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stock Status:</span>
                  <span className={`font-bold ${isOut ? "text-rose-600 animate-pulse" : product.stock < 15 ? "text-amber-650 font-black" : "text-emerald-600"}`}>
                    {isOut ? "SOLD OUT" : `${product.stock} Units Available`}
                  </span>
                </div>
              </div>
            </div>

            {/* Product details info & core buying controls */}
            <div className="flex flex-col justify-between h-full space-y-3.5">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 leading-snug tracking-tight">
                  {product.name}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-indigo-650">${product.price}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-55 px-2 py-0.5 rounded border leading-none font-bold uppercase tracking-wider">Free Pickup Eligible</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="ml-0.5 text-gray-800 font-bold">{product.rating || "NEW"}</span>
                  </div>
                  <span>•</span>
                  <span>{reviewsList.length} verified ratings submitted</span>
                </div>

                <p className="text-gray-500 font-medium leading-relaxed mt-1">
                  {product.description}
                </p>
              </div>

              {/* Dynamic Feature list details */}
              <div>
                <span className="block font-bold text-gray-800 uppercase tracking-widest text-[9px] mb-1.5">Key Performance details</span>
                <ul className="space-y-1">
                  {product.features && product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-550 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add to Cart wishlist buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAddToCart(product)}
                  disabled={isOut}
                  className={`flex-1 text-center py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    isOut
                      ? "bg-gray-150 text-gray-450 cursor-not-allowed"
                      : "bg-indigo-650 hover:bg-indigo-750 text-white"
                  }`}
                >
                  {isOut ? "SOLD OUT" : "Add to Checkout Cart"}
                </button>

                <button
                  onClick={() => onAddToWishlist(product.id)}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isSaved
                      ? "border-rose-450 bg-rose-50 text-rose-500 hover:bg-rose-100"
                      : "border-gray-200 text-gray-450 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                  title={isSaved ? "Saved" : "Save item to wishlist"}
                >
                  <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* REVIEWS SEGMENT */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-sans font-bold text-gray-900 border-b pb-2 mb-3">
              Verified User Reviews and Ratings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              {/* Left col: submit a review */}
              <div className="bg-slate-50 border border-gray-100 p-4 rounded-xl space-y-3 h-fit">
                <span className="block font-bold text-gray-800 uppercase tracking-wider text-[9px]">Submit verified Customer Feedback</span>
                <form onSubmit={handleReviewSubmit} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Edward"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-150 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Assign Rating</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-gray-150 rounded bg-white text-xs font-semibold"
                      >
                        <option value={5}>5 Stars Excellent</option>
                        <option value={4}>4 Stars Good</option>
                        <option value={3}>3 Stars Neutral</option>
                        <option value={2}>2 Stars Fair</option>
                        <option value={1}>1 Star Poor</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-semibold mb-0.5">Comment narrative</label>
                    <textarea
                      required
                      placeholder="Comment on cable material, charging metrics, durability speed etc."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-150 rounded bg-white h-16 text-xs"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-indigo-600 hover:bg-indigo-705 text-white py-1.5 px-3 rounded text-[11px] font-bold tracking-tight transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    {sending ? "Filing Feedback..." : "Submit Review"}
                  </button>

                  {msg && (
                    <div className="p-2 border bg-emerald-50 text-emerald-800 rounded font-semibold text-[10px] leading-snug">
                      {msg}
                    </div>
                  )}
                </form>
              </div>

              {/* Right col: past reviews feed */}
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
                {loadingReviews ? (
                  <div className="text-center py-6 text-gray-400 text-xs">Loading Past Reviews...</div>
                ) : reviewsList.length === 0 ? (
                  <p className="text-gray-400 italic text-center py-8">
                    No verified customer reviews logged for this product. Be the first to submit feedback!
                  </p>
                ) : (
                  reviewsList.map((review) => (
                    <div key={review.id} className="bg-white border p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <User className="h-3 w-3 text-indigo-600 shrink-0" /> {review.userName}
                        </span>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-2.5 w-2.5 ${i < review.rating ? "fill-current" : "text-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-550 leading-relaxed text-[11px]">
                        {review.comment}
                      </p>
                      <span className="text-[9px] text-gray-400 text-right block italic">
                        Logged on: {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
