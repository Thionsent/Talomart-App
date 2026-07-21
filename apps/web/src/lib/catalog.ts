export interface StoreProduct {
  id: string;
  slug: string;
  category: string;
  name: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
}

export interface StoreCategory {
  name: string;
  slug: string;
  count: number;
  art: string;
}

export const storefrontCategories: StoreCategory[] = [
  { name: "Phones", slug: "phones", count: 86, art: "📱" },
  { name: "Audio", slug: "audio", count: 124, art: "🎧" },
  { name: "Charging", slug: "charging", count: 98, art: "🔋" },
  { name: "Storage", slug: "storage", count: 56, art: "💾" },
  { name: "Cameras", slug: "cameras", count: 42, art: "📷" },
  { name: "Accessories", slug: "accessories", count: 173, art: "⌚" }
];

export const storefrontProducts: StoreProduct[] = [
  {
    id: "demo-samsung-galaxy-a15",
    slug: "samsung-galaxy-a15",
    category: "Phones",
    name: "Samsung Galaxy A15 128GB, 6GB RAM",
    price: 22999,
    oldPrice: 26999,
    discount: 15,
    rating: 4.8,
    reviews: 126,
    stock: 18,
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-airbeats-pro-earbuds",
    slug: "airbeats-pro-earbuds",
    category: "Audio",
    name: "AirBeats Pro Wireless Earbuds with ANC",
    price: 3499,
    oldPrice: 4999,
    discount: 30,
    rating: 4.7,
    reviews: 89,
    stock: 31,
    image:
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-oraimo-powerbank",
    slug: "oraimo-powerbank",
    category: "Charging",
    name: "Oraimo 20,000mAh Fast-Charge Powerbank",
    price: 2899,
    oldPrice: 3799,
    discount: 24,
    rating: 4.9,
    reviews: 214,
    stock: 8,
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-havit-h630bt-headphones",
    slug: "havit-h630bt-headphones",
    category: "Audio",
    name: "Havit H630BT Hybrid Wireless Headphones",
    price: 4199,
    oldPrice: 5499,
    discount: 24,
    rating: 4.6,
    reviews: 68,
    stock: 14,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-sandisk-ultra-128gb",
    slug: "sandisk-ultra-128gb",
    category: "Storage",
    name: "SanDisk Ultra 128GB Dual USB Flash Drive",
    price: 1799,
    oldPrice: 2299,
    discount: 22,
    rating: 4.8,
    reviews: 152,
    stock: 26,
    image:
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-compact-4k-action-camera",
    slug: "compact-4k-action-camera",
    category: "Cameras",
    name: "Compact 4K Action Camera + Accessory Kit",
    price: 8999,
    oldPrice: 10999,
    discount: 18,
    rating: 4.5,
    reviews: 41,
    stock: 4,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-type-c-6-in-1-hub",
    slug: "type-c-6-in-1-hub",
    category: "Accessories",
    name: "Type-C 6-in-1 Aluminium OTG Hub",
    price: 2399,
    oldPrice: 2999,
    discount: 20,
    rating: 4.7,
    reviews: 73,
    stock: 17,
    image:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=700&q=85"
  },
  {
    id: "demo-65w-gan-charger",
    slug: "65w-gan-charger",
    category: "Charging",
    name: "65W GaN Fast Charger with USB-C Cable",
    price: 3299,
    oldPrice: 3999,
    discount: 18,
    rating: 4.9,
    reviews: 98,
    stock: 23,
    image:
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=700&q=85"
  }
];
