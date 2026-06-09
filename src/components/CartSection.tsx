import React from "react";
import { CartItem } from "../types";
import { Trash2, ShoppingBag, Plus, Minus, ArrowRight, Award, BadgePercent } from "lucide-react";

interface CartSectionProps {
  cartItems: CartItem[];
  onUpdateCartQuantity: (productId: string, mathAction: "increase" | "decrease") => void;
  onRemoveFromCart: (productId: string) => void;
  couponApplied: { code: string; discount: number } | null;
  onRemoveCoupon: () => void;
  onOpenCheckout: () => void;
  onNavigateToTab: (tab: "store" | "loyalty" | "dashboard") => void;
}

export default function CartSection({
  cartItems,
  onUpdateCartQuantity,
  onRemoveFromCart,
  couponApplied,
  onRemoveCoupon,
  onOpenCheckout,
  onNavigateToTab
}: CartSectionProps) {

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-10 max-w-4xl mx-auto my-6 text-center" id="empty-cart-view">
        <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed text-gray-400">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">Your shopping cart is empty</h3>
        <p className="text-xs text-gray-450 mt-1 mb-6 max-w-sm mx-auto">
          You haven't added any premium phone accessories to your checkout yet. Browse chargers, top-grade MicroSD memory cards, and fast flash drives now!
        </p>
        <button
          onClick={() => onNavigateToTab("store")}
          className="bg-indigo-650 hover:bg-indigo-750 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          Browse Talomart Store
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-6" id="cart-workspace">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
        <span>Cart Items Summary ({totalItemsCount})</span>
        <button
          onClick={() => onNavigateToTab("store")}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          + Add more products
        </button>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cart Item list */}
        <div className="md:col-span-2 space-y-3.5">
          {cartItems.map((item) => {
            const rowTotal = item.product.price * item.quantity;
            return (
              <div
                key={item.product.id}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs flex justify-between items-center gap-4 transition-all hover:border-gray-150"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.product.image}
                    className="h-14 w-14 rounded-lg object-cover border"
                    alt=""
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-850 text-xs truncate max-w-[180px]" title={item.product.name}>
                      {item.product.name}
                    </h4>
                    <span className="text-[10px] uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded text-gray-400 font-bold font-mono border mt-1 inline-block">
                      {item.product.category}
                    </span>
                    <div className="text-xs font-bold text-gray-800 mt-1.5 font-sans">
                      ${item.product.price} <span className="text-[10px] text-gray-400 font-normal">each</span>
                    </div>
                  </div>
                </div>

                {/* Control elements */}
                <div className="flex items-center gap-5">
                  <div className="flex items-center border border-gray-150 rounded-lg overflow-hidden shrink-0 bg-gray-50">
                    <button
                      onClick={() => onUpdateCartQuantity(item.product.id, "decrease")}
                      className="px-2 py-1 hover:bg-gray-150 text-gray-600 text-xs transition-colors cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-bold text-gray-800 font-mono w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateCartQuantity(item.product.id, "increase")}
                      className="px-2 py-1 hover:bg-gray-150 text-gray-600 text-xs transition-colors cursor-pointer"
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-gray-800">
                      ${rowTotal.toFixed(2)}
                    </div>
                    {item.product.stock < 10 && (
                      <span className="text-[9px] text-amber-600 block leading-tight font-bold mt-1">
                        Only {item.product.stock} available
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveFromCart(item.product.id)}
                    className="p-1.5 rounded-lg text-gray-405 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Sidebar breakdown */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-xs h-fit space-y-4">
          <h4 className="font-bold text-gray-750 uppercase tracking-wider text-[10px] pb-2 border-b">
            Payment Recap
          </h4>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-gray-400">
              <span>Items Total:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {couponApplied && (
              <div className="flex items-center justify-between text-emerald-600 font-semibold bg-emerald-50/40 p-2.5 rounded-lg border border-dashed border-emerald-200">
                <span className="flex items-center gap-1">
                  <BadgePercent className="h-4 w-4 shrink-0" />
                  Claimed OFF {couponApplied.code}:
                </span>
                <span className="flex items-center gap-2">
                  -${couponApplied.discount.toFixed(2)}
                  <button
                    onClick={onRemoveCoupon}
                    className="text-[10px] text-gray-400 hover:text-rose-500 font-bold"
                    title="Remove coupon discount"
                  >
                    [X]
                  </button>
                </span>
              </div>
            )}

            <div className="flex justify-between text-gray-800 font-bold border-t pt-2 mt-2">
              <span className="font-sans">Checkout Total:</span>
              <span className="text-indigo-650 font-sans font-black text-sm">
                ${Math.max(0, subtotal - (couponApplied?.discount || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenCheckout}
              className="w-full bg-indigo-600 hover:bg-indigo-705 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Secure Checkout Gateway
              <ArrowRight className="h-4 w-4 animate-bounce-right" />
            </button>
          </div>

          {/* Loyalty system motivation reminder banner */}
          <div className="bg-amber-50/30 border border-amber-100/50 rounded-xl p-3 flex gap-2 items-start mt-4">
            <Award className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[10px] text-gray-550 leading-relaxed">
              <span className="font-bold text-amber-800">Earn dynamic Club Points:</span> Checkout this cart to automatically earn <span className="font-bold">+{Math.floor(subtotal)} points</span> redeemable for immediate money discount vouchers!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
