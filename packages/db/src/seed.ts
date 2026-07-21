import { and, eq, inArray, sql as drizzleSql } from "drizzle-orm";

import {
  categories,
  db,
  productImages,
  products,
  sql
} from "./index";

const categorySeed = [
  {
    name: "Phones",
    slug: "phones",
    description: "Smartphones and feature phones for every budget.",
    sortOrder: 10
  },
  {
    name: "Audio",
    slug: "audio",
    description: "Earbuds, earphones, headphones and portable audio.",
    sortOrder: 20
  },
  {
    name: "Charging",
    slug: "charging",
    description: "Chargers, power banks, cables and travel power.",
    sortOrder: 30
  },
  {
    name: "Storage",
    slug: "storage",
    description: "Memory cards, flash drives and portable storage.",
    sortOrder: 40
  },
  {
    name: "Cameras",
    slug: "cameras",
    description: "Digital cameras, action cameras and accessories.",
    sortOrder: 50
  },
  {
    name: "Accessories",
    slug: "accessories",
    description: "OTG hubs, adapters, smart accessories and essentials.",
    sortOrder: 60
  }
] as const;

const productSeed = [
  {
    sku: "TLM-PHN-A15-128",
    slug: "samsung-galaxy-a15",
    categorySlug: "phones",
    name: "Samsung Galaxy A15 128GB, 6GB RAM",
    shortDescription: "A dependable everyday smartphone with generous storage.",
    description:
      "Enjoy a bright display, reliable all-day performance and 128GB of storage in a polished everyday phone.",
    priceMinor: 2_299_900,
    compareAtPriceMinor: 2_699_900,
    stockQuantity: 18,
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Storage: "128GB",
      Memory: "6GB RAM",
      Warranty: "1 year"
    }
  },
  {
    sku: "TLM-AUD-ABP-ANC",
    slug: "airbeats-pro-earbuds",
    categorySlug: "audio",
    name: "AirBeats Pro Wireless Earbuds with ANC",
    shortDescription: "Wireless earbuds with active noise cancellation.",
    description:
      "Compact true-wireless earbuds with clear calls, rich sound and active noise cancellation for commuting and work.",
    priceMinor: 349_900,
    compareAtPriceMinor: 499_900,
    stockQuantity: 31,
    image:
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Connectivity: "Bluetooth",
      Feature: "Active noise cancellation",
      Charging: "USB-C"
    }
  },
  {
    sku: "TLM-CHG-OR20K",
    slug: "oraimo-powerbank",
    categorySlug: "charging",
    name: "Oraimo 20,000mAh Fast-Charge Powerbank",
    shortDescription: "High-capacity portable power with fast charging.",
    description:
      "A travel-ready 20,000mAh power bank designed to keep phones and accessories charged throughout the day.",
    priceMinor: 289_900,
    compareAtPriceMinor: 379_900,
    stockQuantity: 8,
    image:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Capacity: "20,000mAh",
      Charging: "Fast charge",
      Ports: "USB-A and USB-C"
    }
  },
  {
    sku: "TLM-AUD-H630BT",
    slug: "havit-h630bt-headphones",
    categorySlug: "audio",
    name: "Havit H630BT Hybrid Wireless Headphones",
    shortDescription: "Comfortable over-ear wireless headphones.",
    description:
      "Balanced wireless audio, comfortable ear cushions and a foldable design for listening at home or on the move.",
    priceMinor: 419_900,
    compareAtPriceMinor: 549_900,
    stockQuantity: 14,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Style: "Over-ear",
      Connectivity: "Bluetooth",
      Design: "Foldable"
    }
  },
  {
    sku: "TLM-STO-SD128DUAL",
    slug: "sandisk-ultra-128gb",
    categorySlug: "storage",
    name: "SanDisk Ultra 128GB Dual USB Flash Drive",
    shortDescription: "Dual-interface storage for phones and computers.",
    description:
      "Move photos and documents between compatible phones and computers with a compact dual-interface flash drive.",
    priceMinor: 179_900,
    compareAtPriceMinor: 229_900,
    stockQuantity: 26,
    image:
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Capacity: "128GB",
      Interface: "Dual USB",
      Use: "Phone and computer"
    }
  },
  {
    sku: "TLM-CAM-ACT4K-KIT",
    slug: "compact-4k-action-camera",
    categorySlug: "cameras",
    name: "Compact 4K Action Camera + Accessory Kit",
    shortDescription: "A compact 4K camera with a versatile mounting kit.",
    description:
      "Capture trips and outdoor moments in 4K with a compact action camera and an accessory kit for flexible mounting.",
    priceMinor: 899_900,
    compareAtPriceMinor: 1_099_900,
    stockQuantity: 4,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Resolution: "4K",
      Kit: "Accessory mounts included",
      Form: "Compact action camera"
    }
  },
  {
    sku: "TLM-ACC-USBC-6IN1",
    slug: "type-c-6-in-1-hub",
    categorySlug: "accessories",
    name: "Type-C 6-in-1 Aluminium OTG Hub",
    shortDescription: "Expand one USB-C port into six useful connections.",
    description:
      "A slim aluminium hub for connecting storage, displays and peripherals to compatible USB-C devices.",
    priceMinor: 239_900,
    compareAtPriceMinor: 299_900,
    stockQuantity: 17,
    image:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Connector: "USB-C",
      Ports: "6-in-1",
      Body: "Aluminium"
    }
  },
  {
    sku: "TLM-CHG-GAN65-C",
    slug: "65w-gan-charger",
    categorySlug: "charging",
    name: "65W GaN Fast Charger with USB-C Cable",
    shortDescription: "Compact 65W fast charger supplied with a USB-C cable.",
    description:
      "Fast-charge compatible phones, tablets and laptops from a compact GaN charger built for daily carry.",
    priceMinor: 329_900,
    compareAtPriceMinor: 399_900,
    stockQuantity: 23,
    image:
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=85",
    specifications: {
      Output: "65W",
      Technology: "GaN",
      Included: "USB-C cable"
    }
  }
] as const;

async function seed() {
  const now = new Date();

  const savedCategories = await db
    .insert(categories)
    .values(categorySeed.map((category) => ({ ...category, isActive: true })))
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: drizzleSql`excluded.name`,
        description: drizzleSql`excluded.description`,
        isActive: drizzleSql`excluded.is_active`,
        sortOrder: drizzleSql`excluded.sort_order`,
        updatedAt: now
      }
    })
    .returning({ id: categories.id, slug: categories.slug });

  const categoryIdBySlug = new Map(
    savedCategories.map((category) => [category.slug, category.id])
  );

  const savedProducts = await db
    .insert(products)
    .values(
      productSeed.map((product) => ({
        categoryId: categoryIdBySlug.get(product.categorySlug)!,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        priceMinor: product.priceMinor,
        compareAtPriceMinor: product.compareAtPriceMinor,
        stockQuantity: product.stockQuantity,
        lowStockThreshold: 5,
        isActive: true,
        isFeatured: true,
        specifications: product.specifications
      }))
    )
    .onConflictDoUpdate({
      target: products.sku,
      set: {
        categoryId: drizzleSql`excluded.category_id`,
        name: drizzleSql`excluded.name`,
        slug: drizzleSql`excluded.slug`,
        shortDescription: drizzleSql`excluded.short_description`,
        description: drizzleSql`excluded.description`,
        priceMinor: drizzleSql`excluded.price_minor`,
        compareAtPriceMinor: drizzleSql`excluded.compare_at_price_minor`,
        stockQuantity: drizzleSql`excluded.stock_quantity`,
        lowStockThreshold: drizzleSql`excluded.low_stock_threshold`,
        isActive: drizzleSql`excluded.is_active`,
        isFeatured: drizzleSql`excluded.is_featured`,
        specifications: drizzleSql`excluded.specifications`,
        updatedAt: now
      }
    })
    .returning({ id: products.id, sku: products.sku });

  const productIdBySku = new Map(
    savedProducts.map((product) => [product.sku, product.id])
  );
  const productIds = savedProducts.map((product) => product.id);

  await db
    .delete(productImages)
    .where(
      and(
        inArray(productImages.productId, productIds),
        eq(productImages.sortOrder, 0)
      )
    );

  await db.insert(productImages).values(
    productSeed.map((product) => ({
      productId: productIdBySku.get(product.sku)!,
      url: product.image,
      altText: product.name,
      sortOrder: 0
    }))
  );

  console.info(
    `Seeded ${savedCategories.length} categories and ${savedProducts.length} products.`
  );
}

try {
  await seed();
} catch (error) {
  console.error("Database seed failed.", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
