import React, { useState, useEffect } from "react";
import { Product, Order } from "../types";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  PlusCircle,
  RefreshCcw,
  CheckCircle,
  Truck,
  Ban,
  Clock,
  Layers,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  DollarSign,
  Users,
  Percent,
  Target,
  Sparkles,
  Code,
  FileText,
  Zap,
  BarChart3,
  Database,
  ArrowUpRight,
  Check,
  Calendar,
  Layers3,
  Search,
  Eye,
  Tag
} from "lucide-react";

interface DashboardSectionProps {
  products: Product[];
  orders: Order[];
  onRefreshData: () => void;
  onUpdateProductStock: (productId: string, newStock: number) => void;
  onAddNewProduct: (newProductData: Partial<Product>) => Promise<boolean>;
  onUpdateProductPrice: (productId: string, newPrice: number) => Promise<boolean>;
  onBulkUploadProducts: (productsList: any[]) => Promise<boolean>;
}

interface Campaign {
  id: string;
  name: string;
  discountRate: number; // e.g., 0.2 for 20%
  type: "flash-sale" | "bundle-discount" | "seasonal";
  endsAt: Date;
  active: boolean;
  targetCategory: string;
}

interface BlogPost {
  title: string;
  author: string;
  category: string;
  readTime: string;
  snippet: string;
  content: string;
  publishedAt: string;
  slug: string;
}

export default function DashboardSection({
  products,
  orders,
  onRefreshData,
  onUpdateProductStock,
  onAddNewProduct,
  onUpdateProductPrice,
  onBulkUploadProducts
}: DashboardSectionProps) {
  const [activeTab, setActiveTab] = useState<
    "sales" | "inventory" | "customers" | "dynamic-pricing" | "campaigns" | "seo-content" | "add-product"
  >("sales");

  // State for absolute stock overrides or quick adjustments
  const [stockOverrideVals, setStockOverrideVals] = useState<{ [pId: string]: string }>({});
  
  // Custom states for the requested features:
  
  // Feature 2: Bulk Upload and Variant Tracking states
  const [bulkInputText, setBulkInputText] = useState("");
  const [bulkStatus, setBulkStatus] = useState<{ text: string; success: boolean } | null>(null);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<string | null>(null);
  const [productVariantsStock, setProductVariantsStock] = useState<{
    [productId: string]: { [variantName: string]: number };
  }>({
    "talo-warp-ga65": { "Cosmic Matte Black (65W)": 18, "Lunar Shield White (65W)": 15 },
    "talo-micro-sd1": { "128GB Pro Extreme": 45, "256GB Ultimate Endurance": 30 },
    "talo-supervooc-120": { "Dual-Port Onyx Black": 12, "Dual-Port Pearl White": 8 }
  });

  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantStock, setNewVariantStock] = useState("");

  // Feature 4: Dynamic Pricing state controls
  const [priceAdjustmentMsg, setPriceAdjustmentMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [demandLevel, setDemandLevel] = useState<"low" | "normal" | "extreme">("normal");
  const [competitorPricing, setCompetitorPricing] = useState<"undercutting" | "matching" | "premium">("matching");
  const [smartPriceAutomation, setSmartPriceAutomation] = useState<boolean>(true);

  // Feature 5: Campaign management states
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: "camp-bf50",
      name: "⚡ Extreme Black Friday Blitz",
      discountRate: 0.50,
      type: "flash-sale",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 123), // 2 days & some mins
      active: true,
      targetCategory: "all"
    },
    {
      id: "camp-charge-combo",
      name: "🔌 Warp Supercharger Bundle Discount",
      discountRate: 0.20,
      type: "bundle-discount",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 15), // 15 hours
      active: true,
      targetCategory: "chargers"
    },
    {
      id: "camp-winter-audio",
      name: "❄️ Mid-season Winter Audio Carnival",
      discountRate: 0.15,
      type: "seasonal",
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 120), // 5 days
      active: false,
      targetCategory: "audio"
    }
  ]);

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDiscount, setNewCampaignDiscount] = useState("");
  const [newCampaignType, setNewCampaignType] = useState<"flash-sale" | "bundle-discount" | "seasonal">("flash-sale");
  const [newCampaignCategory, setNewCampaignCategory] = useState("all");
  const [newCampaignHours, setNewCampaignHours] = useState("48");

  // Real countdown display state (re-updates every second for accuracy)
  const [timeRemainingStr, setTimeRemainingStr] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const interval = setInterval(() => {
      const updated: {[key: string]: string} = {};
      campaigns.forEach(c => {
        const diff = c.endsAt.getTime() - Date.now();
        if (diff <= 0) {
          updated[c.id] = "Expired";
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          
          let str = "";
          if (days > 0) str += `${days}d `;
          str += `${hours.toString().padStart(2, "0")}h:${mins.toString().padStart(2, "0")}m:${secs.toString().padStart(2, "0")}s`;
          updated[c.id] = str;
        }
      });
      setTimeRemainingStr(updated);
    }, 1000);
    return () => clearInterval(interval);
  }, [campaigns]);

  // Feature 6: SEO & content states
  const [selectedSeoProductId, setSelectedSeoProductId] = useState<string>("");
  const [draftedBlogTitle, setDraftedBlogTitle] = useState("");
  const [draftedBlogCategory, setDraftedBlogCategory] = useState("Guides");
  const [draftedBlogSnippet, setDraftedBlogSnippet] = useState("");
  const [draftedBlogContent, setDraftedBlogContent] = useState("");
  const [blogMessage, setBlogMessage] = useState<string | null>(null);

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([
    {
      title: "How GaN Technology is Revolutionizing Phone Chargers",
      author: "Talomart Tech Editors",
      category: "Tech Guides",
      readTime: "4 min read",
      snippet: "Discover why Gallium Nitride (GaN) allows 120W chargers to remain incredibly cool and compact compared to legacy silicon.",
      content: "Gallium Nitride, or GaN, is a semiconductor material that has started to replace silicon as the preferred material for phone power bricks...",
      publishedAt: "June 08, 2026",
      slug: "gan-technology-revolution"
    },
    {
      title: "Selecting the Perfect MicroSD Card speed for 4K video recording",
      author: "Edward Nganga",
      category: "Mobile Accessories",
      readTime: "6 min read",
      snippet: "Avoid stuttering video streams. Understand the critical distinction between UHS Speed Class 3, V30, and A2 performance levels.",
      content: "When expanding your smartphone or camera storage, simply looking at '128GB' is not enough. You need extreme speed parameters...",
      publishedAt: "June 02, 2026",
      slug: "selecting-perfect-microsd-speed"
    }
  ]);

  // Tab 3 add product states
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState<"chargers" | "flash-drives" | "memory-cards" | "audio" | "cases">("chargers");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdFeatures, setNewProdFeatures] = useState("");
  const [formMsg, setFormMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock || !newProdImage || !newProdDesc) {
      setFormMsg({ text: "Please complete all fields to publish this accessory", success: false });
      return;
    }

    const priceNum = Number(newProdPrice);
    const stockNum = Number(newProdStock);

    if (isNaN(priceNum) || priceNum <= 0) {
      setFormMsg({ text: "Please insert a valid currency price", success: false });
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFormMsg({ text: "Please insert a valid stock amount", success: false });
      return;
    }

    let finalImgUrl = newProdImage.trim();
    if (!finalImgUrl.startsWith("http")) {
      if (newProdCategory === "chargers") finalImgUrl = "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop";
      else if (newProdCategory === "flash-drives") finalImgUrl = "https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?q=80&w=600&auto=format&fit=crop";
      else if (newProdCategory === "memory-cards") finalImgUrl = "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=600&auto=format&fit=crop";
      else if (newProdCategory === "audio") finalImgUrl = "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=600&auto=format&fit=crop";
      else finalImgUrl = "https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?q=80&w=600&auto=format&fit=crop";
    }

    const cleanFeatures = newProdFeatures
      ? newProdFeatures.split(",").map((f) => f.trim()).filter((f) => f.length > 0)
      : [];

    const result = await onAddNewProduct({
      name: newProdName,
      category: newProdCategory,
      price: priceNum,
      stock: stockNum,
      image: finalImgUrl,
      description: newProdDesc,
      features: cleanFeatures
    });

    if (result) {
      setFormMsg({ text: "Success! Product has been published of immediate storefront availability.", success: true });
      setNewProdName("");
      setNewProdPrice("");
      setNewProdStock("");
      setNewProdImage("");
      setNewProdDesc("");
      setNewProdFeatures("");
      onRefreshData();
    } else {
      setFormMsg({ text: "Failed to create product. Check connection.", success: false });
    }
  };

  const handleStockAdjust = (pId: string, current: number, adjust: number) => {
    const fresh = Math.max(0, current + adjust);
    onUpdateProductStock(pId, fresh);
  };

  const handleStockOverride = (pId: string) => {
    const inputVal = stockOverrideVals[pId];
    if (inputVal === undefined || inputVal === "") return;
    const num = parseInt(inputVal, 10);
    if (!isNaN(num) && num >= 0) {
      onUpdateProductStock(pId, num);
      setStockOverrideVals((prev) => ({ ...prev, [pId]: "" }));
    }
  };

  // Feature 2: Handle Bulk upload insertion
  const handleBulkUploadFromState = async () => {
    if (!bulkInputText.trim()) {
      setBulkStatus({ text: "JSON input field cannot be empty.", success: false });
      return;
    }

    try {
      const parsed = JSON.parse(bulkInputText);
      const isArr = Array.isArray(parsed);
      const itemsToUpload = isArr ? parsed : [parsed];

      // Simple structural validation
      const valid = itemsToUpload.every(item => item.name && item.category && item.price !== undefined && item.stock !== undefined);
      if (!valid) {
        setBulkStatus({ text: "Every item MUST contain name, category, price, and stock.", success: false });
        return;
      }

      setBulkStatus({ text: "Sending secure payload to inventory server...", success: true });
      const success = await onBulkUploadProducts(itemsToUpload);
      if (success) {
        setBulkStatus({ text: `Successfully imported ${itemsToUpload.length} accessories list! Real-time catalog synchronized.`, success: true });
        setBulkInputText("");
        onRefreshData();
      } else {
        setBulkStatus({ text: "Server rejected bulk upload. Please check your data fields format.", success: false });
      }
    } catch (err: any) {
      setBulkStatus({ text: `Failed parsing JSON syntax: ${err.message}`, success: false });
    }
  };

  // Helper template inserters for bulk upload
  const handleLoadBulkTemplate = (type: "cases" | "chargers") => {
    if (type === "cases") {
      setBulkInputText(JSON.stringify([
        {
          "name": "Talomart Carbon Fiber Armored Shell Case",
          "category": "cases",
          "price": 14.99,
          "stock": 45,
          "image": "https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?q=80&w=600&auto=format&fit=crop",
          "description": "Premium military-grade drop protections built with real textured carbon fiber shields.",
          "features": ["3m Drop Tested", "Tactile Buttons", "Carbon Texture"]
        },
        {
          "name": "Talomart Clear Anti-Yellowing Hybrid Case",
          "category": "cases",
          "price": 11.99,
          "stock": 80,
          "image": "https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?q=80&w=600&auto=format&fit=crop",
          "description": "Ultra slim TPU casing treated with active ultraviolet defense layers to preserve absolute transparency.",
          "features": ["UV-Resistant Shield", "Raised Bezel", "Wireless Charge Ready"]
        }
      ], null, 2));
    } else {
      setBulkInputText(JSON.stringify([
        {
          "name": "Talomart 3-in-1 Fabric Braided Warp Cord",
          "category": "chargers",
          "price": 9.99,
          "stock": 120,
          "image": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop",
          "description": "One heavy cord to rule them all. Interlaced nylon containing Type-C, Lightning, and Micro-USB ports.",
          "features": ["3A High Speed Fast Charge", "Double-Stitch Braid", "Alloy Connectors"]
        }
      ], null, 2));
    }
  };

  // Feature 2: Variants Addition
  const handleAddVariant = (productId: string) => {
    if (!newVariantName.trim() || !newVariantStock) return;
    const stockVal = parseInt(newVariantStock, 10);
    if (isNaN(stockVal) || stockVal < 0) return;

    setProductVariantsStock(prev => {
      const existing = prev[productId] || {};
      return {
        ...prev,
        [productId]: {
          ...existing,
          [newVariantName.trim()]: stockVal
        }
      };
    });
    setNewVariantName("");
    setNewVariantStock("");
  };

  const handleRemoveVariant = (productId: string, variantKey: string) => {
    setProductVariantsStock(prev => {
      const existing = { ...prev[productId] };
      delete existing[variantKey];
      return {
        ...prev,
        [productId]: existing
      };
    });
  };

  // Feature 4: AI Dynamic Pricing calculations
  const calculateAutoPricing = (p: Product) => {
    let base = p.price;
    // Apply Demand factor
    if (demandLevel === "low") base *= 0.88; // 12% markdown
    else if (demandLevel === "extreme") base *= 1.25; // 25% premium for hot traffic

    // Apply Stock deficiency multiplier
    if (p.stock === 0) {
      base *= 1.0; 
    } else if (p.stock < 10) {
      base *= 1.15; // 15% increase for low-stock scarcity
    } else if (p.stock > 100) {
      base *= 0.90; // 10% discount to move slow stock
    }

    // Competitor factor
    if (competitorPricing === "undercutting") {
      base *= 0.92; // slash to match competitor drop
    } else if (competitorPricing === "premium") {
      base *= 1.10; // charge higher based on brand authority
    }

    return Number(base.toFixed(2));
  };

  const handleApplySmartPricingGlobally = async () => {
    setPriceAdjustmentMsg({ text: "Registering dynamic prices in master catalog...", success: true });
    let successesCount = 0;
    
    for (const p of products) {
      const targetPrice = calculateAutoPricing(p);
      if (targetPrice !== p.price) {
        const ok = await onUpdateProductPrice(p.id, targetPrice);
        if (ok) successesCount++;
      }
    }
    
    setPriceAdjustmentMsg({ 
      text: `Pricing synchronization completed! Automatically updated the price of ${successesCount} phone accessories in real-time.`, 
      success: true 
    });
    onRefreshData();
  };

  // Feature 5: Campaign Creation
  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim() || !newCampaignDiscount) return;
    const rate = Number(newCampaignDiscount) / 100;
    if (isNaN(rate) || rate <= 0 || rate >= 1) return;

    const hours = parseInt(newCampaignHours, 10) || 24;
    const endsAt = new Date(Date.now() + 1000 * 60 * 60 * hours);

    const fresh: Campaign = {
      id: `camp-${Date.now()}`,
      name: newCampaignName,
      discountRate: rate,
      type: newCampaignType,
      endsAt,
      active: true,
      targetCategory: newCampaignCategory
    };

    setCampaigns([fresh, ...campaigns]);
    setNewCampaignName("");
    setNewCampaignDiscount("");
    setNewCampaignHours("48");
  };

  const handleTriggerCampaignSlash = async (campaign: Campaign) => {
    setPriceAdjustmentMsg({ text: `Applying ${campaign.name} discount directly to the pricing database...`, success: true });
    let changed = 0;
    for (const p of products) {
      if (campaign.targetCategory === "all" || p.category === campaign.targetCategory) {
        const slashedPrice = Number((p.price * (1 - campaign.discountRate)).toFixed(2));
        const ok = await onUpdateProductPrice(p.id, slashedPrice);
        if (ok) changed++;
      }
    }
    setPriceAdjustmentMsg({ text: `Slashed prices on ${changed} products targeted by campaign!`, success: true });
    onRefreshData();
  };

  // Feature 6: Blog creation
  const handlePublishBlogPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftedBlogTitle.trim() || !draftedBlogContent.trim()) {
      setBlogMessage("Please complete title and content body before publishing.");
      return;
    }

    const slug = draftedBlogTitle.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const newPost: BlogPost = {
      title: draftedBlogTitle,
      author: "Storefront Administrator",
      category: draftedBlogCategory,
      readTime: `${Math.max(2, Math.ceil(draftedBlogContent.split(" ").length / 200))} min read`,
      snippet: draftedBlogSnippet || draftedBlogContent.slice(0, 120) + "...",
      content: draftedBlogContent,
      publishedAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      slug
    };

    setBlogPosts([newPost, ...blogPosts]);
    setDraftedBlogTitle("");
    setDraftedBlogSnippet("");
    setDraftedBlogContent("");
    setBlogMessage("Organic growth blog article successfully compiled & injected into search directories!");
    setTimeout(() => setBlogMessage(null), 5000);
  };

  // Math Metrics & Real-time values
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockProducts = products.filter((p) => p.stock < 15);
  const totalRevenue = orders.reduce((sum, o) => sum + o.finalAmount, 0);
  
  // Real-time sales conversion rate simulator values
  const estimatedVisitsCount = 3450 + (orders.length * 15);
  const conversionRate = estimatedVisitsCount > 0 
    ? ((orders.length / estimatedVisitsCount) * 100).toFixed(2) 
    : "0.00";

  // Calculate highest-selling product dynamically from actual orders
  const productSalesMap: { [pName: string]: number } = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      productSalesMap[it.productName] = (productSalesMap[it.productName] || 0) + it.quantity;
    });
  });

  const sortedTopProducts = Object.entries(productSalesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case "shipped": return <Truck className="h-4 w-4 text-amber-500" />;
      case "cancelled": return <Ban className="h-4 w-4 text-rose-500" />;
      case "processing": return <TrendingUp className="h-4 w-4 text-indigo-505" />;
      default: return <Clock className="h-4 w-4 text-gray-400 animate-pulse" />;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "delivered": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "shipped": return "bg-amber-50 text-amber-800 border-amber-200";
      case "cancelled": return "bg-rose-50 text-rose-800 border-rose-200";
      default: return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
  };

  // SEO product tags generator helper
  const activeSeoProduct = products.find(p => p.id === selectedSeoProductId) || products[0];

  return (
    <div className="max-w-7xl mx-auto my-6 px-4" id="merchant-dashboard-core">
      {/* 🚀 Top Unified Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Accessory Catalog</span>
            <span className="text-2xl font-sans font-bold text-gray-800">
              {totalProducts} <span className="text-xs font-normal text-gray-500">Items</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="bg-teal-50 p-3 rounded-lg text-teal-600">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Unified Stock Load</span>
            <span className="text-2xl font-sans font-bold text-gray-800">
              {totalStock} <span className="text-xs font-normal text-gray-500">Units</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
            <AlertTriangle className={`h-6 w-6 ${lowStockProducts.length > 0 ? "animate-bounce" : ""}`} />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
              Low Stock Warnings
              {lowStockProducts.length > 0 && (
                <span className="bg-rose-500 text-white rounded-full text-[9px] px-1.5 py-0.2 animate-pulse font-mono font-bold">
                  {lowStockProducts.length}
                </span>
              )}
            </div>
            <span className="text-2xl font-sans font-bold text-gray-800">
              {lowStockProducts.length} <span className="text-xs font-normal text-gray-450">items deficient</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-xs flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Sales Revenue</span>
            <span className="text-2xl font-sans font-bold text-gray-800">${totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar panel */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-4 shadow-xs h-fit space-y-1.5">
          <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest px-3 mb-2.5">📊 Admin & Intelligence</h3>

          <button
            onClick={() => setActiveTab("sales")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "sales" ? "bg-indigo-600 text-white" : "text-gray-650 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Real-time Sales
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "inventory" ? "bg-indigo-600 text-white" : "text-gray-650 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory & Variants
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "customers" ? "bg-indigo-600 text-white" : "text-gray-650 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Analytics
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab("dynamic-pricing")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "dynamic-pricing" ? "bg-indigo-600 text-white" : "text-gray-650 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Dynamic AI Pricing
            </span>
            <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 py-0.2 rounded uppercase">AUTO</span>
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "campaigns" ? "bg-indigo-600 text-white" : "text-gray-650 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Campaign Manager
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <button
            onClick={() => setActiveTab("seo-content")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "seo-content" ? "bg-indigo-600 text-white" : "text-gray-650 hover:bg-gray-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              SEO & Content Blog
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <div className="h-px bg-gray-100 my-2"></div>

          <button
            onClick={() => setActiveTab("add-product")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
              activeTab === "add-product" ? "bg-emerald-600 text-white" : "text-gray-650 hover:bg-emerald-50/40"
            }`}
          >
            <span className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Publish Accessory
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </button>

          <div className="pt-4 border-t border-gray-100 mt-4 px-3">
            <button
              onClick={onRefreshData}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Sync Master State
            </button>
            <p className="text-[10px] text-gray-400 mt-2 italic leading-relaxed">
              Auto-refresh responsive to remote order submissions.
            </p>
          </div>
        </div>

        {/* Dynamic Admin View Display Area */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-xs p-6 min-h-[550px]" id="merchant-control-canvas">
          
          {/* FEATURE 1: Real-Time Sales Dashboard */}
          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">Real-Time Sales Operations</h3>
                  <p className="text-xs text-gray-400">Continuous telemetry on conversion channels, buyer volume, and flagship categories.</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-100 animate-pulse">
                  ● Live Feed Active
                </span>
              </div>

              {/* Sub-Metrics Cards inside Sales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Transactions</span>
                  <div className="text-2xl font-bold font-sans text-slate-800 mt-1">{orders.length}</div>
                  <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                    <span className="text-emerald-500 font-bold">↑ 100%</span> since deployment
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Estimated Site Visits</span>
                  <div className="text-2xl font-bold font-sans text-slate-800 mt-1">{estimatedVisitsCount}</div>
                  <div className="text-[10px] text-indigo-500 mt-2">Active session telemetry tracking</div>
                </div>

                <div className="bg-indigo-950 text-white rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute right-[-20px] bottom-[-20px] text-indigo-900 opacity-20">
                    <Percent className="h-28 w-28" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">Conversion Rate</span>
                  <div className="text-3xl font-extrabold font-mono mt-1 text-amber-300">{conversionRate}%</div>
                  <div className="text-[10px] text-indigo-200 mt-2 font-mono">Industry threshold: ~1.85%</div>
                </div>
              </div>

              {/* Graphical CSS-Based Trend Bar representation */}
              <div className="border border-gray-150 rounded-xl p-4">
                <h4 className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-indigo-650" /> Visual Revenue contribution by Category
                </h4>
                <div className="space-y-3.5">
                  {["chargers", "flash-drives", "memory-cards", "audio", "cases"].map(cat => {
                    // Compute absolute revenue for this category
                    const catRevenue = orders.reduce((sum, o) => {
                      const itemsRevenue = o.items.reduce((itemSum, it) => {
                        const originalP = products.find(p => p.name === it.productName);
                        if (originalP && originalP.category === cat) {
                          return itemSum + (it.price * it.quantity);
                        }
                        return itemSum;
                      }, 0);
                      return sum + itemsRevenue;
                    }, 0);

                    const percentage = totalRevenue > 0 ? (catRevenue / totalRevenue) * 100 : 20;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize">{cat} catalog</span>
                          <span className="text-gray-550 font-mono">${catRevenue.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.max(4, percentage)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic top-performing products tracker with live transaction lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-100 rounded-xl p-4">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest border-b pb-2 mb-3">🔥 Flagship High-Demand Goods</h4>
                  {sortedTopProducts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 italic">Initiate some checkout orders to generate high-demand logs.</div>
                  ) : (
                    <div className="space-y-3">
                      {sortedTopProducts.map(([pName, count], idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-900 h-5 w-5 flex items-center justify-center font-bold rounded-md font-mono">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-gray-800 truncate max-w-[180px]">{pName}</span>
                          </div>
                          <span className="bg-indigo-50 text-indigo-805 font-mono px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {count} units sold
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Orders table list snippet */}
                <div className="border border-gray-100 rounded-xl p-4">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest border-b pb-2 mb-3">Live Orders Log Feed</h4>
                  {orders.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 italic">Waiting for submissions...</div>
                  ) : (
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {orders.map(o => (
                        <div key={o.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg hover:bg-slate-100/60 transition-colors">
                          <div>
                            <span className="font-mono font-bold text-gray-800">{o.id.substring(0, 9)}</span>
                            <span className="text-gray-450 block text-[9px]">{o.customerName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-800 block">${o.finalAmount.toFixed(2)}</span>
                            <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-tight">{o.paymentMethod}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 2: Inventory & Variants */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">Advanced Inventory & Variant tracking</h3>
                  <p className="text-xs text-gray-400">Manage real-time catalog limits, implement variant level stocks, and bulk paste listings.</p>
                </div>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold px-3 py-1 rounded-full">
                  Total load: {totalStock} Units
                </span>
              </div>

              {/* Nested Sub-section 1: Variant Level Tracking */}
              <div className="bg-slate-50 rounded-xl border border-slate-150 p-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 block mb-1">Variant Tracking Matrix</span>
                <h4 className="text-sm font-extrabold text-gray-800">Capacities & Colorways stock allocation</h4>
                <p className="text-xs text-gray-500 mb-4">Assign individual storage subsets to prevent checkout bottlenecking.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Product list choice */}
                  <div className="space-y-1.5 md:col-span-1">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">Select Accessory</span>
                    <div className="space-y-1 max-h-[140px] overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-white">
                      {products.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProductForVariants(p.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs truncate transition-all cursor-pointer ${
                            selectedProductForVariants === p.id ? "bg-indigo-600 text-white font-bold" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Registered variants list */}
                  <div className="md:col-span-2 space-y-2 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-4">
                    {selectedProductForVariants ? (
                      <div>
                        {/* Title of active item */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-extrabold text-gray-800">
                            Active variants for: <span className="text-indigo-605">
                              {products.find(p => p.id === selectedProductForVariants)?.name}
                            </span>
                          </span>
                        </div>

                        {/* Existing list */}
                        <div className="space-y-1.5 max-h-[150px] overflow-y-auto mb-3">
                          {Object.entries(productVariantsStock[selectedProductForVariants] || {}).length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-2">No custom variations registered yet. Create color or storage sizes below.</p>
                          ) : (
                            Object.entries(productVariantsStock[selectedProductForVariants] || {}).map(([vName, vStock]) => (
                              <div key={vName} className="flex justify-between items-center bg-white p-2 border border-gray-150 rounded-lg text-xs">
                                <span className="font-semibold text-gray-700">{vName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded font-bold">{vStock} in stock</span>
                                  <button
                                    onClick={() => handleRemoveVariant(selectedProductForVariants, vName)}
                                    className="text-xs text-rose-500 hover:text-rose-700 font-bold px-1.5 cursor-pointer hover:bg-rose-50 rounded"
                                    title="Unlink variant"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add fresh variant controls */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. 256GB Platinum Case"
                            value={newVariantName}
                            onChange={(e) => setNewVariantName(e.target.value)}
                            className="bg-white border rounded px-2.5 py-1.5 text-xs flex-1 focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={newVariantStock}
                            onChange={(e) => setNewVariantStock(e.target.value)}
                            className="bg-white border rounded w-16 px-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleAddVariant(selectedProductForVariants)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Add Variant
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 italic py-10">
                        Click on any accessory to manage individual variant colorways or size stocks.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Nested Sub-section 2: Bulk Upload Tool */}
              <div className="border border-gray-150 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 block mb-1">Bulk Injection Engine</span>
                <h4 className="text-sm font-extrabold text-gray-800">Direct JSON / CSV Format Stock Loader</h4>
                <p className="text-xs text-gray-500 mb-3">Load multiple dynamic accessories with pre-filled features list in seconds.</p>

                {bulkStatus && (
                  <div className={`p-3 rounded-lg text-xs mb-3 font-semibold ${bulkStatus.success ? "bg-emerald-50 text-emerald-800 border-emerald-100 border" : "bg-rose-50 text-rose-800 border-rose-100 border"}`}>
                    {bulkStatus.text}
                  </div>
                )}

                <div className="space-y-3">
                  <textarea
                    rows={5}
                    placeholder='Paste accessory JSON list here... e.g., [{"name": "Custom Dual Cord", "category": "chargers", "price": 8.99, "stock": 46}]'
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-lg focus:ring-1 focus:ring-emerald-500 border border-slate-800"
                  ></textarea>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadBulkTemplate("cases")}
                        className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        ⚡ Template 1: Carbon & Clear Cases
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadBulkTemplate("chargers")}
                        className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        ⚡ Template 2: 3-in-1 Warp Cords
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleBulkUploadFromState}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Database className="h-4 w-4" />
                      Execute Bulk Insert
                    </button>
                  </div>
                </div>
              </div>

              {/* Master stock levels table list */}
              <div className="border border-gray-100 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-505 block mb-1">Live Stock levels matrix</span>
                <div className="space-y-3">
                  {products.map(p => {
                    const isLow = p.stock < 15;
                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-50 p-3 rounded-xl gap-2 font-sans border border-gray-100">
                        <div className="flex items-center gap-3">
                          <img src={p.image} className="h-10 w-10 object-cover rounded border" alt="" />
                          <div>
                            <span className="text-xs font-bold text-gray-800 block leading-tight">{p.name}</span>
                            <span className="text-[9px] text-gray-400 font-mono tracking-tight uppercase">Index: {p.id} • category: {p.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          {/* Low Stock Warning Indicator */}
                          {isLow && (
                            <span className="bg-red-50 text-red-655 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1 border border-red-100/50">
                              <AlertTriangle className="h-2.5 w-2.5" /> Deficient
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStockAdjust(p.id, p.stock, -5)}
                              className="bg-white border hover:bg-gray-100 text-gray-600 p-1.5 rounded-lg text-xs font-bold cursor-pointer"
                              title="Sub 5"
                            >
                              -5
                            </button>
                            <span className={`text-xs font-bold px-3 py-1 rounded-md text-nowrap font-mono ${isLow ? "text-amber-700 bg-amber-50 font-black border border-amber-200" : "text-emerald-700 bg-emerald-50 border border-emerald-200"}`}>
                              {p.stock} units
                            </span>
                            <button
                              onClick={() => handleStockAdjust(p.id, p.stock, 5)}
                              className="bg-white border hover:bg-gray-100 text-gray-600 p-1.5 rounded-lg text-xs font-bold cursor-pointer"
                              title="Add 5"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 3: Customer Analytics */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">Customer Lifetime Analytics</h3>
                  <p className="text-xs text-gray-400">Cohort retention models, projected lifetime value metrics, and active churn risk matrix details.</p>
                </div>
                <span className="bg-purple-50 text-purple-705 text-[10px] font-mono font-bold px-3 py-1 rounded-full">
                  Cohort Base Active
                </span>
              </div>

              {/* Sub-Feature A: Customer Cohort Retention Percentages */}
              <div className="border border-gray-150 rounded-2xl p-4 bg-white">
                <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest mb-1.5">Acquisition Cohort Retention Analysis</h4>
                <p className="text-xs text-gray-400 mb-4">Tracks the percentage of customer accounts returning to purchase premium phone cables and accessories over subsequent months.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50 text-gray-500 font-bold">
                        <th className="p-2">Cohort Month</th>
                        <th className="p-2">Accounts</th>
                        <th className="p-2 text-center">Month 0</th>
                        <th className="p-2 text-center">Month 1</th>
                        <th className="p-2 text-center">Month 2</th>
                        <th className="p-2 text-center">Month 3</th>
                        <th className="p-2 text-center">Month 4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { month: "Jan 2026 (Winter)", accounts: 110, m0: "100%", m1: "42%", m2: "35%", m3: "31%", m4: "28%" },
                        { month: "Feb 2026 (Spring)", accounts: 145, m0: "100%", m1: "48%", m2: "39%", m3: "34%", m4: "30%" },
                        { month: "Mar 2026 (Promo)",  accounts: 195, m0: "100%", m1: "55%", m2: "45%", m3: "41%", m4: "-" },
                        { month: "Apr 2026 (Warp Launch)", accounts: 240, m0: "100%", m1: "59%", m2: "51%", m3: "-", m4: "-" },
                        { month: "May 2026 (Extreme)", accounts: 310, m0: "100%", m1: "62%", m2: "-", m3: "-", m4: "-" }
                      ].map((cohort, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50/50">
                          <td className="p-2 font-bold text-gray-700">{cohort.month}</td>
                          <td className="p-2 font-mono">{cohort.accounts} signups</td>
                          <td className="p-2 text-center bg-violet-700/10 text-violet-900 font-semibold">{cohort.m0}</td>
                          <td className="p-2 text-center bg-violet-700/20 text-violet-905 font-semibold">{cohort.m1}</td>
                          <td className="p-2 text-center bg-violet-700/15 text-violet-905 font-medium">{cohort.m2}</td>
                          <td className="p-2 text-center bg-violet-700/10 text-gray-700">{cohort.m3}</td>
                          <td className="p-2 text-center bg-violet-700/5 text-gray-400">{cohort.m4}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-Feature B: Consumer LTV segments & Churn Risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LTV & Purchase Frequency */}
                <div className="border border-gray-100 rounded-xl p-4">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest border-b pb-2 mb-3">LTV Segment Tier Levels</h4>
                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-amber-600 block">Platinum Elite VIP Club</span>
                        <span className="font-sans font-bold text-gray-750">Avg LTV: $420.00</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: "95%" }}></div>
                      </div>
                      <span className="text-[9px] text-gray-400 italic block mt-1">Purchase Frequency: 6.2 times / monthly</span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-indigo-600 block">Gold Power Shoppers</span>
                        <span className="font-sans text-gray-750">Avg LTV: $210.00</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: "65%" }}></div>
                      </div>
                      <span className="text-[9px] text-gray-400 italic block mt-1">Purchase Frequency: 3.4 times / monthly</span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-medium text-slate-500 block">Silver Standard Accounts</span>
                        <span className="font-sans text-gray-755">Avg LTV: $64.00</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: "30%" }}></div>
                      </div>
                      <span className="text-[9px] text-gray-400 italic block mt-1">Purchase Frequency: 1.2 times / monthly</span>
                    </div>
                  </div>
                </div>

                {/* Churn Risk metrics */}
                <div className="border border-gray-100 rounded-xl p-4">
                  <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-widest border-b pb-2 mb-3">Accounts Churn Risk Alert Warnings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2.5 bg-rose-50 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-rose-800">Inactive &gt; 90 days</span>
                        <span className="text-[9px] text-rose-600 block font-mono">14 accounts flagged</span>
                      </div>
                      <span className="bg-rose-550 text-white font-mono text-[8.5px] font-black uppercase px-2 py-0.5 rounded animate-pulse">
                        HIGH RISK
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-amber-800">No purchase since coupon expiry</span>
                        <span className="text-[9px] text-amber-600 block font-mono">31 accounts flagged</span>
                      </div>
                      <span className="bg-amber-500 text-slate-950 font-mono text-[8.5px] font-black uppercase px-2 py-0.5 rounded">
                        MEDIUM CHURN
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-emerald-800">Submissions inside loyalty club active</span>
                        <span className="text-[9px] text-emerald-600 block font-mono">120 accounts cataloged</span>
                      </div>
                      <span className="bg-emerald-500 text-white font-mono text-[8.5px] font-black uppercase px-2 py-0.5 rounded">
                        LOW / SAFE
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* FEATURE 4: AI Dynamic Pricing Engine */}
          {activeTab === "dynamic-pricing" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">✨ AI-Powered Dynamic Pricing Engine</h3>
                  <p className="text-xs text-gray-400">Calculate optimal retail values dynamically based on market demand volumes, stock levels, and active competitor benchmarks.</p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[9.5px] font-mono font-black text-amber-800 uppercase">Automation: Active</span>
                </div>
              </div>

              {priceAdjustmentMsg && (
                <div className="bg-indigo-50 text-indigo-900 border border-indigo-200 p-3.5 rounded-xl text-xs font-semibold">
                  {priceAdjustmentMsg.text}
                </div>
              )}

              {/* Simulated Pricing Variables controls */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-5">
                <span className="text-[9px] font-mono tracking-widest font-black text-amber-400 uppercase">Dynamic pricing controls</span>
                <h4 className="text-sm font-bold text-white leading-none">Simulate live competitive market conditions</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Market Demand Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">Real-Time Traffic & Demand Level</label>
                    <select
                      value={demandLevel}
                      onChange={(e: any) => setDemandLevel(e.target.value)}
                      className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-2 font-semibold"
                    >
                      <option value="low">📉 Low Traffic (Initiate clearance markdowns)</option>
                      <option value="normal">⚖️ Standard Balance (Consistent conversions)</option>
                      <option value="extreme">🔥 Extreme Surge (High demand - maximize margins)</option>
                    </select>
                  </div>

                  {/* Competitor pricing */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-300 font-bold uppercase tracking-wider text-[10px]">Competitor pricing benchmark</label>
                    <select
                      value={competitorPricing}
                      onChange={(e: any) => setCompetitorPricing(e.target.value)}
                      className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-2 font-semibold"
                    >
                      <option value="undercutting">🚨 Severe Undercut (Competitors dumping stock)</option>
                      <option value="matching">🤝 Mutual Cohesion (Balanced matching rates)</option>
                      <option value="premium">💎 Premium Brand Position (Charge premium surcharge)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-750">
                  <input
                    type="checkbox"
                    id="smart-price-automation"
                    checked={smartPriceAutomation}
                    onChange={(e) => setSmartPriceAutomation(e.target.checked)}
                    className="h-4 w-4 bg-slate-900 border-slate-705 text-indigo-500 rounded focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="smart-price-automation" className="text-xs text-slate-200 select-none cursor-pointer">
                    Enable <span className="font-mono text-[9px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded mr-1">REAL-TIME DB REGULATION</span> which directly targets database values based on computed models.
                  </label>
                </div>

                {/* Apply globally CTA */}
                <div className="pt-2">
                  <button
                    onClick={handleApplySmartPricingGlobally}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black py-2.5 px-6 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <Sparkles className="h-4 w-4 animate-spin text-indigo-950" />
                    Synchronize & Adjust Store Pricing Database
                  </button>
                </div>
              </div>

              {/* Computed Retail prices matrix */}
              <div className="border border-gray-150 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 block mb-3">Model-Computed Target Retail Prices</span>
                
                <div className="space-y-3">
                  {products.map(p => {
                    const optimal = calculateAutoPricing(p);
                    const divergence = optimal - p.price;
                    const sign = divergence >= 0 ? "+" : "";

                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-3 bg-slate-50 border rounded-xl gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <img src={p.image} className="h-9 w-9 rounded object-cover" alt="" />
                          <div>
                            <span className="font-bold text-gray-800 block">{p.name}</span>
                            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Present Database MSRP Price: ${p.price.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3.5">
                          {divergence !== 0 && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${divergence >= 0 ? "bg-emerald-50 text-emerald-705 border border-emerald-150" : "bg-red-50 text-red-655 border border-red-150"}`}>
                              {sign}${divergence.toFixed(2)} adjustment
                            </span>
                          )}

                          <div className="text-right">
                            <span className="text-gray-400 block text-[9px] uppercase font-mono">Suggested AI retail</span>
                            <span className="font-extrabold text-sm text-indigo-650 font-mono">${optimal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 5: Live Campaign Manager */}
          {activeTab === "campaigns" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">Campaign Discount & Promo Manager</h3>
                  <p className="text-xs text-gray-400 font-sans">Schedule flash sales, category bundles, and seasonal coupon discounts with responsive countdown timers.</p>
                </div>
                <span className="bg-rose-50 text-rose-705 text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-rose-100">
                  Countdown Enabled
                </span>
              </div>

              {/* Sub-Feature A: Active campaign visual grids & timers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map(c => {
                  const rString = timeRemainingStr[c.id] || "Loading...";
                  return (
                    <div 
                      key={c.id} 
                      className={`rounded-2xl border p-4 shadow-xs relative overflow-hidden flex flex-col justify-between ${
                        c.active 
                          ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-900 text-white" 
                          : "bg-slate-50 border-gray-150 text-gray-800"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            c.active ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
                          }`}>
                            {c.type}
                          </span>
                          <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
                            c.active ? "text-amber-300" : "text-gray-450"
                          }`}>
                            <Clock className="h-3.5 w-3.5 animate-spin" /> {rString}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold leading-tight">{c.name}</h4>
                        <p className={`text-xs leading-relaxed ${c.active ? "text-slate-300" : "text-gray-500"}`}>
                          Applies a massive <span className="font-bold underline">{(c.discountRate * 100).toFixed(0)}% Price Slash</span> targetting products inside the <span className="italic block font-bold capitalize mt-1 text-[11px]">{c.targetCategory} catalog</span>.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between gap-3 text-xs">
                        {c.active ? (
                          <button
                            onClick={() => handleTriggerCampaignSlash(c)}
                            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
                          >
                            ⚡ Apply Discount Now
                          </button>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">Campaign Scheduled (Idle states)</div>
                        )}

                        <button
                          onClick={() => {
                            setCampaigns(campaigns.map(item => item.id === c.id ? { ...item, active: !item.active } : item));
                          }}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                            c.active ? "bg-red-500/10 hover:bg-red-500/20 text-red-300" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {c.active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sub-Feature B: Schedule/Create campaign form */}
              <div className="border border-gray-150 rounded-2xl p-4 bg-slate-50">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">Schedule Custom Flash Sale campaign</h4>
                
                <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-500 font-bold uppercase mb-1">Campaign Campaign Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 🌲 Festive Cord Carnival"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase mb-1">Category Target</label>
                    <select
                      value={newCampaignCategory}
                      onChange={(e) => setNewCampaignCategory(e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-505"
                    >
                      <option value="all">All Store Products</option>
                      <option value="chargers">Chargers</option>
                      <option value="flash-drives">Flash Drives</option>
                      <option value="memory-cards">Memory Cards</option>
                      <option value="cases">Phone Cases</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold uppercase mb-1">Slash Percent (%)</label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="90"
                      placeholder="e.g. 25"
                      value={newCampaignDiscount}
                      onChange={(e) => setNewCampaignDiscount(e.target.value)}
                      className="w-full bg-white border rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-505"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full py-2 px-4 rounded-lg cursor-pointer transition-colors"
                    >
                      Schedule Active Campaign
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* FEATURE 6: SEO & Organic Content tools */}
          {activeTab === "seo-content" && (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">SEO Meta Tags & Organic Blog Engine</h3>
                  <p className="text-xs text-gray-400">Manage schema.org specifications dynamically, generate og:meta visual tags, and compose indexing blog posts.</p>
                </div>
                <span className="bg-teal-50 text-teal-705 text-[10px] font-mono font-bold px-3 py-1 rounded-full border border-teal-100">
                  Webmaster Schema v3
                </span>
              </div>

              {/* Grid split: Meta viewer vs. Blog composer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Meta tags dynamic generators */}
                <div className="border border-gray-150 rounded-xl p-4 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 block mb-1">Meta tags generator</span>
                    <h4 className="text-xs font-extrabold text-gray-800">HTML Structured Specifications Sheet</h4>
                    <p className="text-[11px] text-gray-500 mb-3">Select any retail product to dynamically generate SEO tags and dynamic JSON-LD markup structures.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Interactive Target Accessory</label>
                    <select
                      value={selectedSeoProductId}
                      onChange={(e) => setSelectedSeoProductId(e.target.value)}
                      className="w-full text-xs bg-slate-50 border rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 text-gray-800 font-bold"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {activeSeoProduct && (
                    <div className="space-y-3.5 pt-2">
                      {/* Generated title */}
                      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1.5">
                        <span className="text-amber-400 block font-bold text-[9px] uppercase tracking-wider">HTML Title & Description tags</span>
                        <div>&lt;title&gt;Buy {activeSeoProduct.name} Online | Talomart Authorized Retail&lt;/title&gt;</div>
                        <div className="text-slate-400 break-words leading-normal mt-1">
                          &lt;meta name="description" content="Acquire {activeSeoProduct.name} at only ${activeSeoProduct.price.toFixed(2)}. Best retail prices, 100% genuine with safe pick-up points." /&gt;
                        </div>
                      </div>

                      {/* OG Image */}
                      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1.5">
                        <span className="text-indigo-400 block font-bold text-[9px] uppercase tracking-wider">OpenGraph Social Meta tags</span>
                        <div>&lt;meta property="og:title" content="Get {activeSeoProduct.name}" /&gt;</div>
                        <div className="break-all text-slate-400">&lt;meta property="og:image" content="{activeSeoProduct.image}" /&gt;</div>
                      </div>

                      {/* Schema.org json id */}
                      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-[10px] font-mono space-y-1.5">
                        <span className="text-emerald-400 block font-bold text-[9px] uppercase tracking-wider">Product Structured Google Schema (JSON-LD)</span>
                        <pre className="text-emerald-355 text-[8.5px] max-h-[140px] overflow-y-auto leading-tight">
{`{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "${activeSeoProduct.name}",
  "image": "${activeSeoProduct.image}",
  "description": "${activeSeoProduct.description}",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "price": "${activeSeoProduct.price.toFixed(2)}",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock"
  }
}`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* Local Blog engine organic growth compose panel */}
                <div className="border border-gray-150 rounded-xl p-4 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-teal-600 block mb-1">Content Engine Optimizer</span>
                    <h4 className="text-xs font-extrabold text-gray-800">Organic Growth Blog Manager</h4>
                    <p className="text-[11px] text-gray-500">Draft rich information hubs regarding adapter safety bounds to convert organic web visits.</p>
                  </div>

                  {blogMessage && (
                    <div className="bg-teal-50 text-teal-800 border border-teal-150 p-2.5 rounded-lg text-[11px] font-semibold">
                      {blogMessage}
                    </div>
                  )}

                  <form onSubmit={handlePublishBlogPost} className="space-y-2.5 text-xs">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Article Headline (e.g. 5 Warning signs your charger is failing...)"
                        value={draftedBlogTitle}
                        onChange={(e) => setDraftedBlogTitle(e.target.value)}
                        className="w-full bg-slate-50 border rounded-lg p-2 font-semibold text-gray-700 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={draftedBlogCategory}
                        onChange={(e) => setDraftedBlogCategory(e.target.value)}
                        className="w-full bg-slate-50 border rounded-lg p-2 text-gray-600"
                      >
                        <option value="Tech Guides">Tech Guides</option>
                        <option value="Mobile Accessories">Mobile Accessories</option>
                        <option value="Unboxing Reviews">Unboxing Reviews</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Meta Snippet description"
                        value={draftedBlogSnippet}
                        onChange={(e) => setDraftedBlogSnippet(e.target.value)}
                        className="w-full bg-slate-50 border rounded-lg p-2 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={4}
                        required
                        placeholder="Draft your long form organic article body here..."
                        value={draftedBlogContent}
                        onChange={(e) => setDraftedBlogContent(e.target.value)}
                        className="w-full bg-slate-50 border rounded-lg p-2 focus:ring-1 focus:ring-teal-500"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="bg-teal-605 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors w-full"
                    >
                      Publish Growth Article
                    </button>
                  </form>

                  {/* Visual listing of drafted posts */}
                  <div className="pt-2 border-t border-gray-100">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase mb-2">Active published organic articles</span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {blogPosts.map((post, pIdx) => (
                        <div key={pIdx} className="p-2 bg-slate-50 rounded-lg text-[11px]">
                          <div className="flex justify-between font-bold text-gray-700">
                            <span>{post.title}</span>
                            <span className="text-[9px] bg-gray-200 px-1 py-0.2 rounded font-normal">{post.category}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{post.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: Publish Accessory Form */}
          {activeTab === "add-product" && (
            <div>
              <div className="border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-base font-bold text-gray-800">Publish New Phone Accessory</h3>
                <p className="text-xs text-gray-400">Populate the store, upload/link Unsplash visual elements, set stock, description details.</p>
              </div>

              {formMsg && (
                <div className={`p-4 rounded-xl text-sm mb-4 ${formMsg.success ? "bg-emerald-50 text-emerald-800 border" : "bg-rose-50 text-rose-800 border"}`}>
                  {formMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">Accessory / Product Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                      placeholder="e.g., Talomart Super Fast 20W Charge Combo"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">Category Class</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                      value={newProdCategory}
                      onChange={(e) => setNewProdCategory(e.target.value as any)}
                      required
                    >
                      <option value="chargers">Chargers & Adapters</option>
                      <option value="flash-drives">Flash Drives / USB sticks</option>
                      <option value="memory-cards">Memory MicroSD Cards</option>
                      <option value="audio">Audio Accessories</option>
                      <option value="cases">Cases & Protectors</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">MSRP Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-505 text-sm"
                      placeholder="e.g., 24.99"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">Initial Stock Count</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-505 text-sm"
                      placeholder="e.g., 50"
                      value={newProdStock}
                      onChange={(e) => setNewProdStock(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">Accessory Image Link (URL)</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-505 text-sm"
                      placeholder="e.g., https://images.unsplash.com/... or blank"
                      value={newProdImage}
                      onChange={(e) => setNewProdImage(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">Display Features (Comma Separated)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-505 text-sm"
                    placeholder="e.g., Smart Power Delivery, High-Speed, Metallic build"
                    value={newProdFeatures}
                    onChange={(e) => setNewProdFeatures(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-gray-500 uppercase tracking-wider font-bold mb-1.5">Product Narrative / Long Description</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-505 text-sm h-24"
                    placeholder="Provide a comprehensive narrative on high speed specs and compatibility of interest to mobile buyers."
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Publish Accessory of Sale
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
