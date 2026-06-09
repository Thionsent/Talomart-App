import React, { useState } from "react";
import { CartItem } from "../types";
import { X, Lock, CreditCard, ShieldCheck, PhoneCall, ShoppingBag, Truck, MapPin, Award } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  userEmail: string;
  userPhone: string;
  userName: string;
  couponApplied: { code: string; discount: number } | null;
  onOrderCompleted: (orderData: any) => void;
  subtotal: number;
  referrerEmail?: string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  userEmail,
  userPhone,
  userName,
  couponApplied,
  onOrderCompleted,
  subtotal,
  referrerEmail
}: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Form parameters
  const [customerName, setCustomerName] = useState(userName || "");
  const [customerPhone, setCustomerPhone] = useState(userPhone || "");
  const [customerEmail, setCustomerEmail] = useState(userEmail || "");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "doorstep">("pickup");

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"mobile-money" | "card" | "cash-on-delivery">("mobile-money");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState(userPhone || "");
  const [mobileOperator, setMobileOperator] = useState<"mpesa" | "airtel" | "orange">("mpesa");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!isOpen) return null;

  // Pricing calculations
  const deliveryFee = deliveryOption === "pickup" ? 1.50 : 4.99;
  const discountAmount = couponApplied ? couponApplied.discount : 0;
  const totalAmount = Math.max(0, subtotal + deliveryFee - discountAmount);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!customerName || !customerPhone || !customerEmail || !shippingAddress) {
        setErr("Please fulfill all delivery field parameters to proceed.");
        return;
      }
      setErr("");
      setStep(2);
      return;
    }

    // Process payment validation
    if (paymentMethod === "card") {
      if (!cardHolder || !cardNumber || !cardExpiry || !cardCVV) {
        setErr("Please complete your simulated credit card gateway details.");
        return;
      }
    } else if (paymentMethod === "mobile-money") {
      if (!mobileMoneyNumber) {
        setErr("Please fill your mobile gateway phone number.");
        return;
      }
    }

    setErr("");
    setLoading(true);

    try {
      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          })),
          customerName,
          customerPhone,
          customerEmail,
          shippingAddress: `${deliveryOption === "pickup" ? "TALOMART PICKUP: " : "DOORSTEP: "} ${shippingAddress}`,
          paymentMethod,
          cardDetails: paymentMethod === "card" ? { cardNumber, cardHolder } : null,
          mobileMoneyNumber: paymentMethod === "mobile-money" ? `${mobileOperator.toUpperCase()} - ${mobileMoneyNumber}` : null,
          discountApplied: discountAmount,
          deliveryFee,
          referrerEmail
        })
      });

      if (resp.ok) {
        const orderResult = await resp.json();
        onOrderCompleted(orderResult);
        onClose();
      } else {
        const errorData = await resp.json();
        setErr(errorData.error || "Execution failed. Check warehouse inventory levels.");
      }
    } catch (e) {
      setErr("Gateway connection timeout error. Please retry again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-all overflow-y-auto" id="checkout-gateway-overlay">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 relative max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-650" />
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Talomart Secure PagShield Checkout</h3>
              <p className="text-[10px] text-gray-400 font-mono">GATEWAY VERSION v2.5 SECURED</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Visualizer */}
        <div className="flex bg-indigo-50/50 p-2.5 px-5 border-b border-indigo-50/30 text-xs text-indigo-858 justify-between font-medium">
          <span className={`flex items-center gap-1 ${step === 1 ? "font-bold text-indigo-700 underline underline-offset-4" : "opacity-60"}`}>
            1. Deliveries Location
          </span>
          <span className={`flex items-center gap-1 ${step === 2 ? "font-bold text-indigo-700 underline underline-offset-4" : "opacity-60"}`}>
            2. Secure Gateway Payment
          </span>
        </div>

        {err && (
          <div className="mx-5 my-3 bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-800 text-xs font-semibold">
            {err}
          </div>
        )}

        {/* Checkout Forms Body (Scrollable if mobile device viewport is tiny) */}
        <form onSubmit={handleCheckoutSubmit} className="overflow-y-auto p-5 space-y-4 text-xs flex-1">
          {/* STEP 1: DELIVERY DATA */}
          {step === 1 && (
            <div className="space-y-3.5">
              <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gray-400" /> Specify shipping Address
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Edward Nganga"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Active Phone/M-Pesa</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g., +254712345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Email Address (Loyalty Match)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., name@gmail.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-indigo-505"
                />
                <span className="text-[10px] text-gray-400 leading-none mt-1 block">
                  Ensure to use your loyalty-registered email to auto-claim points.
                </span>
              </div>

              {/* Delivery Speed / options */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div
                  onClick={() => setDeliveryOption("pickup")}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${
                    deliveryOption === "pickup" ? "border-indigo-600 bg-indigo-50/20 shadow-xs" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <ShoppingBag className="h-3.5 w-3.5 text-indigo-600 animate-bounce" />
                    Pickup Station
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Pickup at Talomart CBD Station. Ready in 1 hr.
                  </p>
                  <span className="text-xs font-bold text-indigo-600 block mt-1.5">$1.50 Fee</span>
                </div>

                <div
                  onClick={() => setDeliveryOption("doorstep")}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${
                    deliveryOption === "doorstep" ? "border-indigo-600 bg-indigo-50/20 shadow-xs" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <Truck className="h-3.5 w-3.5 text-indigo-600" />
                    Doorstep Express
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Delivery straight to your office or doorstep. Same day.
                  </p>
                  <span className="text-xs font-bold text-indigo-600 block mt-1.5">$4.99 Fee</span>
                </div>
              </div>

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Provide Physical Target Location</label>
                <input
                  type="text"
                  required
                  placeholder={deliveryOption === "pickup" ? "e.g., CBD Nairobi Store Box" : "e.g., Suite 4B, Roysambu Towers, Nairobi"}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: GATEWAY PAYMENT CHANNELS */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] flex items-center gap-1 pb-1 border-b">
                <Lock className="h-3.5 w-3.5 text-emerald-500" /> Select PayShield secure gateway channel
              </h4>

              {/* Mobile, Card, Cash tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mobile-money")}
                  className={`py-2 px-1 rounded-lg border font-bold capitalize transition-all cursor-pointer ${
                    paymentMethod === "mobile-money" ? "bg-indigo-600 text-white border-indigo-650 shadow-xs" : "bg-gray-50 hover:bg-gray-100 text-gray-650"
                  }`}
                >
                  Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`py-2 px-1 rounded-lg border font-bold capitalize transition-all cursor-pointer ${
                    paymentMethod === "card" ? "bg-indigo-600 text-white border-indigo-650 shadow-xs" : "bg-gray-50 hover:bg-gray-100 text-gray-650"
                  }`}
                >
                  Card Channel
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash-on-delivery")}
                  className={`py-2 px-1 rounded-lg border font-bold capitalize transition-all cursor-pointer ${
                    paymentMethod === "cash-on-delivery" ? "bg-indigo-600 text-white border-indigo-650 shadow-xs" : "bg-gray-50 hover:bg-gray-100 text-gray-650"
                  }`}
                >
                  Cash on Delivery
                </button>
              </div>

              {/* PAYMENT OPTION A: MOBILE MONEY (Highly recommended for Jumia/Kilimall African inspired feel) */}
              {paymentMethod === "mobile-money" && (
                <div className="border border-green-150 bg-emerald-50/10 p-3.5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">Choose Mobile Money Operator:</span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">AUTO-PROMPTS PUSH</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {["mpesa", "airtel", "orange"].map((op) => (
                      <div
                        key={op}
                        onClick={() => setMobileOperator(op as any)}
                        className={`border p-2 rounded-lg text-center cursor-pointer capitalize font-semibold transition-all ${
                          mobileOperator === op ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        {op === "mpesa" ? "Safaricom M-Pesa" : op === "airtel" ? "Airtel Money" : "Orange Money"}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-gray-500 font-semibold mb-1">Mobile Money Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g., +254712345678"
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-gray-400 italic mt-1 leading-normal">
                      On clicking Place Order, a secure prompt will appear on your device requesting your mobile money PIN code to authorize the charge of ${totalAmount.toFixed(2)}.
                    </p>
                  </div>
                </div>
              )}

              {/* PAYMENT OPTION B: CREDIT DEBIT CARD GATEWAY */}
              {paymentMethod === "card" && (
                <div className="border border-gray-150 bg-slate-50 p-3.5 rounded-xl space-y-3">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-950 text-white p-3.5 rounded-lg flex flex-col justify-between h-28 shadow-xs">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">Secure PayShield Node</span>
                    <span className="text-sm font-mono tracking-widest">{cardNumber || "•••• •••• •••• ••••"}</span>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span>{cardHolder || "HOLDER NAME"}</span>
                      <span>{cardExpiry || "MM/YY"}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-gray-500 font-semibold mb-1">Card Holder Name</label>
                      <input
                        type="text"
                        required={paymentMethod === "card"}
                        placeholder="e.g. Edward Nganga"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-500 font-semibold mb-1">16-Digit Card Number</label>
                      <input
                        type="text"
                        required={paymentMethod === "card"}
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-500 font-semibold mb-1">Expiry Date (MM/YY)</label>
                        <input
                          type="text"
                          required={paymentMethod === "card"}
                          placeholder="09/28"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 font-semibold mb-1">CVV / Security Code</label>
                        <input
                          type="password"
                          required={paymentMethod === "card"}
                          maxLength={4}
                          placeholder="•••"
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value)}
                          className="w-full px-3 py-1.5 border rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYMENT OPTION C: CASH ON DELIVERY */}
              {paymentMethod === "cash-on-delivery" && (
                <div className="border border-indigo-100 bg-indigo-50/10 p-4 rounded-xl text-center">
                  <Truck className="h-6 w-6 text-indigo-600 mx-auto mb-1 animate-bounce" />
                  <p className="font-bold text-gray-800">Postpaid Offline Cash Checkout</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[320px] mx-auto">
                    Complete your order and pay our courier agent in cash or via mobile money on direct delivery to your specified location. No advanced fee required.
                  </p>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer Summary & Checkout buttons */}
        <div className="bg-gray-50 border-t border-gray-100 p-5 rounded-b-2xl">
          <div className="grid grid-cols-2 gap-4 text-xs mb-3.5 font-mono">
            <div className="space-y-0.5 text-gray-450 text-right">
              <div>Subtotal:</div>
              <div>Shipping Fee:</div>
              {discountAmount > 0 && <div>Coupon applied:</div>}
              <div className="text-gray-900 font-sans font-bold pt-1">Total to Pay:</div>
            </div>
            <div className="space-y-0.5 text-gray-800 text-right font-bold">
              <div>${subtotal.toFixed(2)}</div>
              <div>${deliveryFee.toFixed(2)}</div>
              {discountAmount > 0 && <div className="text-rose-600">-${discountAmount.toFixed(2)}</div>}
              <div className="text-indigo-650 font-sans text-sm font-black pt-1">${totalAmount.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex justify-between gap-3 mt-1.5">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Back to delivery
              </button>
            )}

            <button
              onClick={handleCheckoutSubmit}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? "Authorizing Payments..." : (step === 1 ? "Proceed to Payment Gateway" : "Place Secure Order")}
            </button>
          </div>

          <div className="flex justify-center items-center gap-1 mt-4 text-[10px] text-gray-400">
            <Lock className="h-3 w-3 text-emerald-500" />
            256-Bit SSL Secured Connection • Talomart Stores
          </div>
        </div>
      </div>
    </div>
  );
}
