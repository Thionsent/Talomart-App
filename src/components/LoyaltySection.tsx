import React, { useState, useEffect } from "react";
import { LoyaltyProfile } from "../types";
import { Award, Gift, Clock, Sparkles, CheckCircle, AlertCircle } from "lucide-react";

interface LoyaltySectionProps {
  userEmail: string;
  setUserEmail: (email: string) => void;
  loyaltyProfile: LoyaltyProfile | null;
  setLoyaltyProfile: (profile: LoyaltyProfile | null) => void;
  onApplyCoupon: (code: string, MathValue: number) => void;
  couponApplied: { code: string; discount: number } | null;
}

export default function LoyaltySection({
  userEmail,
  setUserEmail,
  loyaltyProfile,
  setLoyaltyProfile,
  onApplyCoupon,
  couponApplied
}: LoyaltySectionProps) {
  const [inputEmail, setInputEmail] = useState(userEmail || "ngangaedward261@gmail.com");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const fetchLoyalty = async (emailToFetch: string) => {
    if (!emailToFetch) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/loyalty/${encodeURIComponent(emailToFetch)}`);
      if (resp.ok) {
        const data = await resp.json();
        setLoyaltyProfile(data);
        setUserEmail(emailToFetch);
        setMessage({ text: `Successfully linked loyalty profile for ${emailToFetch}!`, success: true });
      } else {
        setMessage({ text: "Failed to retrieve loyalty profile data.", success: false });
      }
    } catch (e) {
      setMessage({ text: "Error connecting to loyalty system.", success: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail && !loyaltyProfile) {
      fetchLoyalty(userEmail);
    }
  }, [userEmail]);

  const handleLinkProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    fetchLoyalty(inputEmail.trim());
  };

  const claimCoupon = async (code: string, cost: number, val: number) => {
    if (!loyaltyProfile) return;
    if (loyaltyProfile.points < cost) {
      setMessage({ text: "You do not have enough loyalty points to claim this coupon code.", success: false });
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
        setMessage({ text: `Successfully redeemed code ${code}! $${val} discount has been automatically added to your current active shopping checkout session.`, success: true });
      } else {
        setMessage({ text: "Failed to claim reward coupon.", success: false });
      }
    } catch (err) {
      setMessage({ text: "Error linking to point systems.", success: false });
    } finally {
      setLoading(false);
    }
  };

  const couponsAvailable = [
    { code: "TALO5", reward: "5% Direct Off Checkout", cost: 100, value: 5, bg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { code: "TALO15", reward: "15% Direct Off Checkout", cost: 250, value: 15, bg: "bg-amber-50 text-amber-800 border-amber-200" },
    { code: "TALO30", reward: "30% Direct Off Checkout", cost: 500, value: 30, bg: "bg-purple-50 text-purple-800 border-purple-200" }
  ];

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Platinum": return "from-indigo-600 to-cyan-500 text-white shadow-indigo-100";
      case "Gold": return "from-amber-500 to-yellow-400 text-white shadow-yellow-100";
      case "Silver": return "from-slate-400 to-zinc-300 text-gray-800 shadow-zinc-100";
      default: return "from-amber-700 to-orange-600 text-white shadow-orange-100";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 max-w-4xl mx-auto my-6" id="loyalty-hub">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-sans font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            Talomart Club Loyalty Rewards
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Earn 1 points for every dollar spent! Save big with dynamic, instant reward vouchers.
          </p>
        </div>

        <form onSubmit={handleLinkProfile} className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
          <input
            type="email"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            placeholder="Enter your email"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full md:w-60 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors cursor-pointer text-nowrap font-medium"
          >
            {loading ? "syncing..." : "Sync/Login"}
          </button>
        </form>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-2 mb-6 text-sm ${message.success ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-rose-50 text-rose-800 border border-rose-100"}`}>
          {message.success ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <div>{message.text}</div>
        </div>
      )}

      {loyaltyProfile ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card status info */}
          <div className={`rounded-2xl bg-linear-to-br p-6 shadow-md flex flex-col justify-between ${getTierColor(loyaltyProfile.tier)}`}>
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs uppercase tracking-widest opacity-80">Membership Tier</span>
                  <h3 className="text-2xl font-black tracking-tight">{loyaltyProfile.tier}</h3>
                </div>
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-xs">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6">
                <span className="text-xs opacity-80 block">Account Loyalty Point Balance</span>
                <span className="text-4xl font-sans font-bold tracking-tight">{loyaltyProfile.points} <span className="text-lg font-medium opacity-90">PTS</span></span>
              </div>
            </div>

            <div className="mt-6 border-t border-white/20 pt-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-semibold">
                {loyaltyProfile.tier === "Platinum" ? "You have reached the elite club!" : (
                  loyaltyProfile.tier === "Gold" ? "Need 500 PTS for Platinum Elite" : (
                    loyaltyProfile.tier === "Silver" ? "Need 320 PTS for Gold Tier Upgrade" : "Need 50 PTS for Silver Tier Upgrade"
                  )
                )}
              </span>
            </div>
          </div>

          {/* Claim Vouchers */}
          <div className="md:col-span-2 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                <Gift className="h-4 w-4 text-purple-600" />
                Redeem Reward Voucher Code
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {couponsAvailable.map((coupon) => {
                  const isAffordable = loyaltyProfile.points >= coupon.cost;
                  const isCurrentlyApplied = couponApplied?.code === coupon.code;
                  return (
                    <div
                      key={coupon.code}
                      className={`border p-4 rounded-xl flex flex-col justify-between gap-3 text-center transition-all ${coupon.bg} ${isCurrentlyApplied ? "ring-2 ring-indigo-500 scale-[1.02]" : ""}`}
                    >
                      <div>
                        <div className="text-xs font-bold uppercase py-0.5 rounded-full bg-white shadow-xs max-w-[80px] mx-auto mb-1 text-gray-700">
                          {coupon.code}
                        </div>
                        <div className="text-lg font-bold tracking-tight mt-1">
                          -${coupon.value} OFF
                        </div>
                        <div className="text-xs opacity-95">
                          {coupon.reward}
                        </div>
                      </div>
                      <button
                        onClick={() => claimCoupon(coupon.code, coupon.cost, coupon.value)}
                        disabled={!isAffordable || loading || isCurrentlyApplied}
                        className={`text-xs py-1.5 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                          isCurrentlyApplied
                            ? "bg-indigo-600 text-white"
                            : isAffordable
                              ? "bg-gray-905 hover:bg-gray-900 text-white shadow-xs"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-150"
                        }`}
                      >
                        {isCurrentlyApplied ? "Active Off" : `${coupon.cost} PTS`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* History ledger */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2.5">
                <Clock className="h-3 w-3" />
                Recent Points Activity Ledger
              </h4>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                {loyaltyProfile.history.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No points transactions recorded yet.</p>
                ) : (
                  loyaltyProfile.history.map((record, i) => (
                    <div key={i} className="flex justify-between items-center text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg">
                      <div className="truncate shrink max-w-[70%]">{record.reason}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(record.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <span className={`font-bold ${record.pointsAdded >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {record.pointsAdded >= 0 ? `+${record.pointsAdded}` : record.pointsAdded} PTS
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
        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-150">
          <Award className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <h3 className="text-gray-700 font-medium text-sm">Join Talomart Club Rewards Program</h3>
          <p className="text-xs text-gray-400 max-w-[340px] mx-auto mt-1 mb-4">
            Type your email above to automatically unlock your 100 PTS signup bonus and claim off discount coupons instantly!
          </p>
        </div>
      )}
    </div>
  );
}
