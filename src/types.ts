export interface Product {
  id: string;
  name: string;
  category: "chargers" | "flash-drives" | "memory-cards" | "audio" | "cases";
  price: number;
  stock: number;
  image: string;
  description: string;
  rating: number;
  reviewsCount: number;
  features: string[];
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface WishlistItem {
  productId: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  discountApplied: number;
  deliveryFee: number;
  finalAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: string;
  paymentMethod: "card" | "mobile-money" | "cash-on-delivery";
  cardLast4?: string;
  mobileMoneyNumber?: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  date: string;
}

export interface LoyaltyProfile {
  points: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  userEmail: string;
  history: {
    pointsAdded: number;
    reason: string;
    date: string;
  }[];
}

export interface RecommendationResponse {
  recommendedIds: string[];
  explanation: string;
}
