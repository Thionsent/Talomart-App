import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from "url";
import { Product, Review, Order, LoyaltyProfile } from "./src/types.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// IN-MEMORY DATABASE STATE
let products: Product[] = [
  {
    id: "talo-warp-65",
    name: "Talomart WarpCharger Pro (65W)",
    category: "chargers",
    price: 29.99,
    stock: 45,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=600&auto=format&fit=crop",
    description: "Ultra-fast charging adapter equipped with intelligent safety IC chip, GaN technology, and includes a heavy duty nylon USB-C to USB-C cable.",
    rating: 4.8,
    reviewsCount: 3,
    features: ["65W Dual Output", "Gallium Nitride (GaN)", "Overheat Protection", "Includes 1.5m braided cable"]
  },
  {
    id: "apex-car-40",
    name: "Apex Dual-Port Car Charger (40W)",
    category: "chargers",
    price: 14.99,
    stock: 60,
    image: "https://images.unsplash.com/photo-1622445262465-2481c4574875?q=80&w=600&auto=format&fit=crop",
    description: "Sleek all-metal car adapter featuring dual 20W PD USB-C ports. Fast tracks phones/tablets concurrently on road trips.",
    rating: 4.5,
    reviewsCount: 2,
    features: ["Dual USB-C Power Delivery", "Full Aluminum Frame", "Soft Ice-Blue LED Light", "12V-24V compatibility"]
  },
  {
    id: "talo-magsafe-15",
    name: "Talomart MagSafe Wireless Pad (15W)",
    category: "chargers",
    price: 24.99,
    stock: 32,
    image: "https://images.unsplash.com/photo-1608156639585-b3a032ef9689?q=80&w=600&auto=format&fit=crop",
    description: "Magnetic wireless charger prioritizing alignment for MagSafe iPhones and Qi-compatible gadgets. Thin profiles with premium matte finish.",
    rating: 4.2,
    reviewsCount: 1,
    features: ["Strong N52 Magnets", "USB-C Direct Input", "Anti-slip silicone backing", "FOD (Foreign Object Detection)"]
  },
  {
    id: "braided-cable-2m",
    name: "Heavy-Duty Braided USB-C Cable (2m)",
    category: "chargers",
    price: 11.99,
    stock: 120,
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?q=80&w=600&auto=format&fit=crop",
    description: "Double-braided armored nylon jacket USB-C cable designed for everyday strain. Supports 100W Power Delivery and high-speed data sync.",
    rating: 4.9,
    reviewsCount: 4,
    features: ["100W Power Delivery Ready", "15,000+ Bend Lifespan", "Alloy Connectors", "2 Meters Length"]
  },
  {
    id: "sandisk-dual-128",
    name: "SanDisk Ultra Dual Drive USB-C (128GB)",
    category: "flash-drives",
    price: 19.99,
    stock: 85,
    image: "https://images.unsplash.com/photo-1618424181497-157f25b6ddd5?q=80&w=600&auto=format&fit=crop",
    description: "Dual-connector flash drive with USB Type-C and Type-A connectors. Effortlessly transfers files with high-speed read rates between smartphones and computers.",
    rating: 4.6,
    reviewsCount: 3,
    features: ["Dual USB Type-C and Type-A", "High-speed USB 3.1 Gen 1", "Up to 150MB/s Read speeds", "SanDisk Memory Zone App compatible"]
  },
  {
    id: "talo-metal-256",
    name: "Talomart Rugged Metal USB 3.2 (256GB)",
    category: "flash-drives",
    price: 34.99,
    stock: 40,
    image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?q=80&w=600&auto=format&fit=crop",
    description: "Waterproof, dustproof, and shockproof monolithic metallic body design flash drive. Blistering speeds of up to 400MB/s.",
    rating: 4.7,
    reviewsCount: 2,
    features: ["Rugged Alloy Casing", "USB 3.2 Gen 2 Interface", "Up to 400MB/s Write Speed", "Keyring hole for mobility"]
  },
  {
    id: "kingston-max-512",
    name: "Kingston DataTraveler Max (512GB)",
    category: "flash-drives",
    price: 59.99,
    stock: 12,
    image: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?q=80&w=600&auto=format&fit=crop",
    description: "Performance USB drive featuring USB Type-C connector. Record breaking read/write speeds that rival portable solid-state drives.",
    rating: 4.8,
    reviewsCount: 1,
    features: ["Up to 1,000MB/s Read Speed", "Unique Ridged Casing", "Slide Cap Status Protector", "Massive 512GB Capacity"]
  },
  {
    id: "samsung-evo-128",
    name: "Samsung EVO Plus MicroSD (128GB)",
    category: "memory-cards",
    price: 15.99,
    stock: 110,
    image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?q=80&w=600&auto=format&fit=crop",
    description: "Optimized microSD card for smartphone storage extension, high-fidelity photo capturing, and recording crisp Full HD media.",
    rating: 4.7,
    reviewsCount: 2,
    features: ["UHS-I U3 Class 10 Rating", "Water, X-ray, Temperature Proof", "Includes Full SD Adapter", "Reliable Samsung Controller Core"]
  },
  {
    id: "sandisk-extreme-256",
    name: "SanDisk Extreme MicroSD (256GB)",
    category: "memory-cards",
    price: 28.99,
    stock: 75,
    image: "https://images.unsplash.com/photo-1601524909162-be87252be298?q=80&w=600&auto=format&fit=crop",
    description: "Intended for action cameras, drones, and high-end smartphones. Perfect for streaming smooth 4K UHD video recording and fast heavy-app loading.",
    rating: 4.8,
    reviewsCount: 3,
    features: ["V30 & A2 Application Ratings", "Up to 190MB/s Extreme Transfer", "RescuePRO Deluxe recovery software access", "Shock & Temperature Resistant"]
  },
  {
    id: "talo-pro-512",
    name: "Talomart Pro Ultra MicroSD (512GB)",
    category: "memory-cards",
    price: 54.99,
    stock: 25,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=600&auto=format&fit=crop",
    description: "Unparalleled capacity extension for power-users, portable gaming systems (Steam Deck, Switch), and high-resolution security camera arrays.",
    rating: 4.9,
    reviewsCount: 2,
    features: ["A2 Class Performance", "Write Speed up to 130MB/s", "Exceptional write wear rating", "Full structural backing guarantee"]
  },
  {
    id: "basspods-pro",
    name: "Talomart BassPods Pro TWS",
    category: "audio",
    price: 39.99,
    stock: 50,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=600&auto=format&fit=crop",
    description: "Premium sound quality featuring Active Noise Cancellation (ANC), punchy custom 13mm bass drivers, and long battery lifecycle.",
    rating: 4.7,
    reviewsCount: 2,
    features: ["Hybrid ANC & Ambient Modes", "Up to 32 Hours with Case", "IPX5 Sweat & Water Resistance", "Bluetooth 5.3 Low Latency"]
  },
  {
    id: "wired-typec",
    name: "Hi-Res Audio Type-C Earphones",
    category: "audio",
    price: 12.99,
    stock: 90,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    description: "Plug-and-play high resolution audio earphones featuring built-in Digital-to-Analog converter (DAC) chip and tangle free design.",
    rating: 4.6,
    reviewsCount: 2,
    features: ["High Performance DAC Chip", "In-line Controls & Mic", "Comfy ergonomic rubber tips", "USB Type-C Connector"]
  },
  {
    id: "clear-shield",
    name: "Talomart ShockShield TPU Case",
    category: "cases",
    price: 9.99,
    stock: 147,
    image: "https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?q=80&w=600&auto=format&fit=crop",
    description: "Ultra-thin military-grade shockproof clear bumper case. Resists yellowing and provides precise tactical click feedback.",
    rating: 4.4,
    reviewsCount: 1,
    features: ["10ft Drop Protection Certified", "Anti-Yellowing TPU Material", "Raised Camera Lip Edge", "MagSafe Attachment Friendly"]
  },
  {
    id: "tempered-glass",
    name: "9H Tempered Glass Screen Protector",
    category: "cases",
    price: 7.99,
    stock: 200,
    image: "https://images.unsplash.com/photo-1581090464762-c2975422896a?q=80&w=600&auto=format&fit=crop",
    description: "Perfect fit scratch-resistant 9H hardness tempered glass protector. Maintains natural color fidelity and high-sensitivity touchscreen input.",
    rating: 4.5,
    reviewsCount: 3,
    features: ["9H Anti-Scratch Durability", "Oleophobic finger-smudge coating", "Includes alignments tools", "0.33mm ultra-thin construction"]
  }
];

let reviews: Review[] = [
  {
    id: "rev-1",
    productId: "talo-warp-65",
    userName: "Nairobi Tech Guy",
    rating: 5,
    comment: "This is a real lifesaver! Charges my Samsung phone faster than the original model. Absolutely stellar GaN build.",
    date: "2026-05-18T10:30:00Z"
  },
  {
    id: "rev-2",
    productId: "talo-warp-65",
    userName: "Jane Ndwiga",
    rating: 4,
    comment: "Excellent charger, stays cool under full 65W strain. The included braided cable is long and tough.",
    date: "2026-05-22T14:15:00Z"
  },
  {
    id: "rev-3",
    productId: "talo-warp-65",
    userName: "Felix K.",
    rating: 5,
    comment: "Highly recommended for fast recharging. Charges my laptop too!",
    date: "2026-06-01T09:20:00Z"
  },
  {
    id: "rev-4",
    productId: "sandisk-dual-128",
    userName: "Memory_Maker",
    rating: 5,
    comment: "Incredibly fast transfer. Plug in my Android, backup photos, put in my MacBook immediately. Highly reliable.",
    date: "2026-05-15T12:00:00Z"
  },
  {
    id: "rev-5",
    productId: "sandisk-dual-128",
    userName: "Hellen N.",
    rating: 4,
    comment: "Saves a lot of cloud fees. The swivel is metal but the core frame feels plastic. Good value anyway.",
    date: "2026-05-29T16:45:00Z"
  },
  {
    id: "rev-6",
    productId: "sandisk-dual-128",
    userName: "David M.",
    rating: 5,
    comment: "Worked exactly as described on all of my devices.",
    date: "2026-06-04T11:10:00Z"
  },
  {
    id: "rev-7",
    productId: "talo-metal-256",
    userName: "Kev_Accessories",
    rating: 5,
    comment: "Rock solid key-ring attachment. Blazing fast write speeds, water protection works after a quick coffee spill!",
    date: "2026-05-10T11:40:00Z"
  },
  {
    id: "rev-8",
    productId: "talo-metal-256",
    userName: "Grace W.",
    rating: 4,
    comment: "Really strong alloy body. Transferred a 10GB game file in under 30 seconds smoothly.",
    date: "2026-05-20T17:30:00Z"
  },
  {
    id: "rev-9",
    productId: "kingston-max-512",
    userName: "Vlog_Master",
    rating: 5,
    comment: "This USB speed is insane. Direct live editing off this drive works cleanly, doesn't thermal throttle. A bit wide though.",
    date: "2026-05-24T08:00:00Z"
  },
  {
    id: "rev-10",
    productId: "samsung-evo-128",
    userName: "Cam_Lover",
    rating: 5,
    comment: "Used in my phone's micro SD slot. Smooth storage upgrade. Never had write drops.",
    date: "2026-05-11T13:40:00Z"
  },
  {
    id: "rev-11",
    productId: "samsung-evo-128",
    userName: "Peter Mwangi",
    rating: 4,
    comment: "Decent speed and genuine card. The adapter included is also high quality.",
    date: "2026-06-03T14:15:00Z"
  },
  {
    id: "rev-12",
    productId: "sandisk-extreme-256",
    userName: "Drone_Rider",
    rating: 5,
    comment: "Flawless for 4K video recording on my DJI Drone. Sustained write speed is exceptional.",
    date: "2026-05-02T16:00:00Z"
  },
  {
    id: "rev-13",
    productId: "sandisk-extreme-256",
    userName: "Cynthia A.",
    rating: 5,
    comment: "Super fast load times on my gaming console console. SanDisk holds up perfectly.",
    date: "2026-05-25T11:22:00Z"
  },
  {
    id: "rev-14",
    productId: "sandisk-extreme-256",
    userName: "Kamau_J",
    rating: 4,
    comment: "Tested with H2testw - genuine and full speed. Fast shipping by Talomart.",
    date: "2026-06-07T09:05:00Z"
  },
  {
    id: "rev-15",
    productId: "tempered-glass",
    userName: "Careless_Ben",
    rating: 5,
    comment: "I dropped my phone on concrete face down and was terrified. This glass cracked but my screen stayed completely pristine! Ordered a three pack immediately.",
    date: "2026-05-01T15:20:00Z"
  },
  {
    id: "rev-16",
    productId: "tempered-glass",
    userName: "Stacey K.",
    rating: 4,
    comment: "Very easy installation. Alignment tool helped to avoid bubbles. High clarity.",
    date: "2026-05-19T21:10:00Z"
  },
  {
    id: "rev-17",
    productId: "tempered-glass",
    userName: "Otieno O.",
    rating: 4,
    comment: "Nice standard oleophobic finish. Fingerprints wipe clean instantly.",
    date: "2026-06-05T13:45:00Z"
  }
];

let orders: Order[] = [
  {
    id: "TALO-ORD-1001",
    items: [
      { productId: "talo-warp-65", productName: "Talomart WarpCharger Pro (65W)", price: 29.99, quantity: 1 },
      { productId: "tempered-glass", productName: "9H Tempered Glass Screen Protector", price: 7.99, quantity: 2 }
    ],
    totalAmount: 45.97,
    discountApplied: 0,
    deliveryFee: 2.00,
    finalAmount: 47.97,
    customerName: "Edward Nganga",
    customerPhone: "+254712345678",
    customerEmail: "ngangaedward261@gmail.com",
    shippingAddress: "Talomart Stores Pickup Point, CBD, Nairobi, Kenya",
    paymentMethod: "mobile-money",
    mobileMoneyNumber: "+254712345678",
    status: "processing",
    date: "2026-06-09T14:45:00Z"
  },
  {
    id: "TALO-ORD-1002",
    items: [
      { productId: "sandisk-extreme-256", productName: "SanDisk Extreme MicroSD (256GB)", price: 28.99, quantity: 1 }
    ],
    totalAmount: 28.99,
    discountApplied: 5.00,
    deliveryFee: 1.50,
    finalAmount: 25.49,
    customerName: "Wanjiku N.",
    customerPhone: "+254722555666",
    customerEmail: "wanjikun@gmail.com",
    shippingAddress: "Thika Road, Roysambu Plaza Apt B12, Nairobi",
    paymentMethod: "card",
    cardLast4: "4321",
    status: "delivered",
    date: "2026-06-08T10:15:00Z"
  }
];

let loyaltyProfiles: { [email: string]: LoyaltyProfile } = {
  "ngangaedward261@gmail.com": {
    points: 180,
    tier: "Silver",
    userEmail: "ngangaedward261@gmail.com",
    history: [
      { pointsAdded: 100, reason: "Welcome Reward Points", date: "2026-06-09T14:30:00Z" },
      { pointsAdded: 80, reason: "Order TALO-ORD-1001 loyalty payout", date: "2026-06-09T14:45:00Z" }
    ]
  }
};

// HELPERS
const refreshLoyaltyTier = (points: number): "Bronze" | "Silver" | "Gold" | "Platinum" => {
  if (points >= 1000) return "Platinum";
  if (points >= 500) return "Gold";
  if (points >= 150) return "Silver";
  return "Bronze";
};

// ==========================================
// API REST ENDPOINTS
// ==========================================

// GET Products
app.get("/api/products", (req: Request, res: Response) => {
  res.json(products);
});

// GET Product Reviews
app.get("/api/reviews/:productId", (req: Request, res: Response) => {
  const pId = req.params.productId;
  const prodReviews = reviews.filter((r) => r.productId === pId);
  res.json(prodReviews);
});

// POST Add Review
app.post("/api/reviews", (req: Request, res: Response) => {
  const { productId, userName, rating, comment } = req.body;
  if (!productId || !userName || !rating) {
    return res.status(400).json({ error: "Missing required fields for review Submission" });
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    productId,
    userName,
    rating: Number(rating),
    comment: comment || "",
    date: new Date().toISOString()
  };

  reviews.push(newReview);

  // Recalculate average rating
  const prodReviews = reviews.filter((r) => r.productId === productId);
  const avg = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
  const roundedAvg = Math.round(avg * 10) / 10;

  const targetIndex = products.findIndex((p) => p.id === productId);
  if (targetIndex !== -1) {
    products[targetIndex].rating = roundedAvg;
    products[targetIndex].reviewsCount = prodReviews.length;
  }

  res.status(201).json({ review: newReview, updatedRating: roundedAvg, updatedReviewsCount: prodReviews.length });
});

// GET Orders
app.get("/api/orders", (req: Request, res: Response) => {
  res.json(orders);
});

// POST Submitting Order (Real-time stock reservation + loyalty system reward!)
app.post("/api/orders", (req: Request, res: Response) => {
  const {
    items,
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    paymentMethod,
    cardDetails,
    mobileMoneyNumber,
    discountApplied,
    deliveryFee
  } = req.body;

  if (!items || items.length === 0 || !customerName || !customerPhone || !customerEmail) {
    return res.status(400).json({ error: "Missing mandatory order checkout parameters" });
  }

  // 1. Verify Stocks in real-time
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `Product not found: ${item.productName}` });
    }
    if (prod.stock < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${prod.name}. Only ${prod.stock} items left in stock!` });
    }
  }

  // 2. Decrement Stocks in real-time
  const orderItems = items.map((item: any) => {
    const prodIndex = products.findIndex((p) => p.id === item.productId);
    products[prodIndex].stock -= item.quantity;
    return {
      productId: item.productId,
      productName: item.productName,
      price: Number(item.price),
      quantity: Number(item.quantity)
    };
  });

  // Calculate prices
  const totalAmount = orderItems.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
  const finalDiscount = Number(discountApplied || 0);
  const finalFee = Number(deliveryFee || 0);
  const finalAmount = Math.max(0, totalAmount + finalFee - finalDiscount);

  const referrerEmail = req.body.referrerEmail;

  // Card secure last 4
  let cardLast4: string | undefined;
  if (paymentMethod === "card" && cardDetails?.cardNumber) {
    const cleanNum = cardDetails.cardNumber.replace(/\s+/g, "");
    cardLast4 = cleanNum.slice(-4) || "4321";
  }

  // Handle Order Model
  const newOrder: Order = {
    id: `TALO-ORD-${1000 + orders.length + 1}`,
    items: orderItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    discountApplied: Math.round(finalDiscount * 100) / 100,
    deliveryFee: Math.round(finalFee * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    paymentMethod,
    cardLast4,
    mobileMoneyNumber,
    status: "processing",
    date: new Date().toISOString()
  };

  orders.unshift(newOrder); // Add to head

  // 3. Loyalty system processing: 1 loyalty point per $1 spent!
  const pointsAwarded = Math.floor(finalAmount);
  const emailLower = customerEmail.toLowerCase().trim();

  if (!loyaltyProfiles[emailLower]) {
    loyaltyProfiles[emailLower] = {
      points: 50, // Welcome bonus point
      tier: "Bronze",
      userEmail: emailLower,
      history: [{ pointsAdded: 50, reason: "Welcome Reward Bonus", date: new Date().toISOString() }]
    };
  }

  if (pointsAwarded > 0) {
    loyaltyProfiles[emailLower].points += pointsAwarded;
    loyaltyProfiles[emailLower].history.unshift({
      pointsAdded: pointsAwarded,
      reason: `Order ${newOrder.id} reward payout`,
      date: new Date().toISOString()
    });
  }

  // referral credit processing
  if (referrerEmail && typeof referrerEmail === "string") {
    const refLower = referrerEmail.toLowerCase().trim();
    if (refLower !== emailLower) {
      if (!loyaltyProfiles[refLower]) {
        loyaltyProfiles[refLower] = {
          points: 100, // Referrer welcome
          tier: "Bronze",
          userEmail: refLower,
          history: [{ pointsAdded: 100, reason: "Welcome Reward Signup Bonus", date: new Date().toISOString() }]
        };
      }
      loyaltyProfiles[refLower].points += 150;
      loyaltyProfiles[refLower].history.unshift({
        pointsAdded: 150,
        reason: `Referral milestone payout: Invited ${customerEmail}`,
        date: new Date().toISOString()
      });
      loyaltyProfiles[refLower].tier = refreshLoyaltyTier(loyaltyProfiles[refLower].points);
    }
  }

  // refresh tier
  loyaltyProfiles[emailLower].tier = refreshLoyaltyTier(loyaltyProfiles[emailLower].points);

  res.status(201).json({
    order: newOrder,
    loyaltyReward: {
      pointsAdded: pointsAwarded,
      newTotalPoints: loyaltyProfiles[emailLower].points,
      newTier: loyaltyProfiles[emailLower].tier
    }
  });
});

// GET or Create Loyalty
app.get("/api/loyalty/:email", (req: Request, res: Response) => {
  const emailLower = req.params.email.toLowerCase().trim();
  if (!loyaltyProfiles[emailLower]) {
    loyaltyProfiles[emailLower] = {
      points: 100, // 100 points startup bonus
      tier: "Bronze",
      userEmail: emailLower,
      history: [
        { pointsAdded: 100, reason: "Welcome Reward Signup Bonus", date: new Date().toISOString() }
      ]
    };
  }
  loyaltyProfiles[emailLower].tier = refreshLoyaltyTier(loyaltyProfiles[emailLower].points);
  res.json(loyaltyProfiles[emailLower]);
});

// POST Redeem Loyalty point to register discount coupon
app.post("/api/loyalty/:email/claim-coupon", (req: Request, res: Response) => {
  const emailLower = req.params.email.toLowerCase().trim();
  const { couponCost, discountValue, couponCode } = req.body;

  if (!loyaltyProfiles[emailLower]) {
    return res.status(404).json({ error: "Loyalty profile not found." });
  }

  const profile = loyaltyProfiles[emailLower];
  if (profile.points < couponCost) {
    return res.status(400).json({ error: "Insufficient loyalty points to claim this coupon code." });
  }

  // Deduct points
  profile.points -= couponCost;
  profile.history.unshift({
    pointsAdded: -couponCost,
    reason: `Claimed Coupon Code: ${couponCode} ($${discountValue} Worth)`,
    date: new Date().toISOString()
  });

  profile.tier = refreshLoyaltyTier(profile.points);

  res.json({
    success: true,
    claimedCoupon: {
      code: couponCode,
      discount: discountValue,
    },
    updatedProfile: profile
  });
});

// POST Add or change products (Dashboard merchant controller)
app.post("/api/products", (req: Request, res: Response) => {
  const { name, category, price, stock, image, description, features } = req.body;
  if (!name || !category || !price || stock === undefined || !image || !description) {
    return res.status(400).json({ error: "Missing required properties to publish new product accessory." });
  }

  const cleanFeatures = Array.isArray(features) ? features : (features ? String(features).split(",").map(f => f.trim()) : []);

  const newProduct: Product = {
    id: `talo-custom-${Date.now()}`,
    name,
    category,
    price: Number(price),
    stock: Number(stock),
    image,
    description,
    rating: 0,
    reviewsCount: 0,
    features: cleanFeatures
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// POST Adjust Stock directly in inventory control panels (Dashboard)
app.post("/api/products/:id/adjust-stock", (req: Request, res: Response) => {
  const pId = req.params.id;
  const { adjustAmount, absoluteStock } = req.body;

  const targetIndex = products.findIndex((p) => p.id === pId);
  if (targetIndex === -1) {
    return res.status(404).json({ error: "Product accessory not found" });
  }

  if (absoluteStock !== undefined) {
    products[targetIndex].stock = Math.max(0, Number(absoluteStock));
  } else if (adjustAmount !== undefined) {
    products[targetIndex].stock = Math.max(0, products[targetIndex].stock + Number(adjustAmount));
  } else {
    return res.status(400).json({ error: "Missing adjustment properties (adjustAmount or absoluteStock)" });
  }

  res.json({ success: true, updatedProduct: products[targetIndex] });
});

// POST Adjust Price directly (Dynamic Pricing & Campaigns)
app.post("/api/products/:id/adjust-price", (req: Request, res: Response) => {
  const pId = req.params.id;
  const { absolutePrice } = req.body;

  const targetIndex = products.findIndex((p) => p.id === pId);
  if (targetIndex === -1) {
    return res.status(404).json({ error: "Product accessory not found" });
  }

  if (absolutePrice !== undefined && !isNaN(Number(absolutePrice))) {
    products[targetIndex].price = Math.max(0.01, Number(absolutePrice));
    res.json({ success: true, updatedProduct: products[targetIndex] });
  } else {
    res.status(400).json({ error: "Missing or invalid absolutePrice in body" });
  }
});

// POST Bulk upload product accessories
app.post("/api/products/bulk-upload", (req: Request, res: Response) => {
  const { productsList } = req.body;
  if (!Array.isArray(productsList)) {
    return res.status(400).json({ error: "productsList must be an array" });
  }

  const added: Product[] = [];
  productsList.forEach((p: any) => {
    if (p.name && p.category && p.price !== undefined && p.stock !== undefined) {
      const cleanFeatures = Array.isArray(p.features) ? p.features : (p.features ? String(p.features).split(",").map((f: any) => String(f).trim()) : []);
      const newP: Product = {
        id: p.id || `talo-custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: String(p.name),
        category: p.category,
        price: Number(p.price),
        stock: Number(p.stock),
        image: p.image || "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop",
        description: p.description || "In-bulk imported mobile charger and phone accessories catalog.",
        rating: p.rating || 4.2,
        reviewsCount: p.reviewsCount || Math.floor(Math.random() * 40 + 5),
        features: cleanFeatures
      };
      products.push(newP);
      added.push(newP);
    }
  });

  res.status(201).json({ success: true, count: added.length, added });
});

// POST Personalized Recommendations using `@google/genai`
app.post("/api/recommendations", async (req: Request, res: Response) => {
  const { historyProductIds } = req.body;
  try {
    const historyNames = historyProductIds
      ? products
          .filter((p) => historyProductIds.includes(p.id))
          .map((p) => `${p.name} (${p.category})`)
      : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Graceful fallback for demo without key
      const selection = products.slice(0, 3).map((p) => p.id);
      return res.json({
        recommendedIds: selection,
        explanation: "Welcome! Based on Talomart Store's top trending criteria, we recommend grabbing our ultra rugged GaN chargers and ultra high-speed MicroSD storage. Join our program to earn loyalty points on every checkout!"
      });
    }

    const referer = req.headers.referer || "https://ais-dev-i2jks424mhum3jmq2p7bcz-412477263195.europe-west3.run.app/";
    const origin = req.headers.origin || "https://ais-dev-i2jks424mhum3jmq2p7bcz-412477263195.europe-west3.run.app";

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
          'Referer': referer,
          'origin': origin,
        }
      }
    });

    const productListText = products
      .map((p) => `ID: ${p.id}, Name: ${p.name}, Category: ${p.category}, Price: $${p.price}, Description: ${p.description}`)
      .join("\n");
    const historyText = historyNames.length > 0 ? historyNames.join(", ") : "None (New Visitor)";

    const promptMessage = `The user is shopping at Talomart Stores for advanced phone accessories (chargers, micro sd memory cards, high-speed flash drives, audio type-c adapters).

Browsing Session History of the user: [${historyText}].

Here is our catalog of products available:
${productListText}

Tasks:
1. Select exactly 3 accessory IDs that match or complement their browsing history in the smartest logical fashion. If the history is empty, select our top bestsellers (e.g., Warp charger, high performance microSD, and metal USB stick).
2. Generate a highly personalized recommendation statement in 2-3 sentences max. Address the shopper directly. Explain genuinely but briefly how these 3 selected accessories perfectly empower their phone devices or backup habits.

You MUST respond strictly in JSON complying with the following schema:
{
  "recommendedIds": ["id1", "id2", "id3"],
  "explanation": "friendly custom tailored explanation text"
}
Verify the selected recommendedIds exist inside our list of IDs!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 3 valid product IDs"
            },
            explanation: {
              type: Type.STRING,
              description: "Explain personalized product matches beautifully"
            }
          },
          required: ["recommendedIds", "explanation"]
        }
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error("Gemini API recommendations error:", err);
    // Secure fallback recommendation
    const selection = [products[0].id, products[4].id, products[7].id];
    res.json({
      recommendedIds: selection,
      explanation: "Talomart Smart Assist curated choices: We recommend equipping your gear with our double strength high speed chargers and massive capacity Flash Drives for quick on-the-go backups."
    });
  }
});

// ==========================================
// CUSTOM DEV & PRODUCTION CLIENT MIDDLEWARES
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operational on http://localhost:${PORT}`);
  });
}

startServer();
