import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
};

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "staff",
  "admin"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "payment_confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "mpesa",
  "cash_on_delivery"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded"
]);

export const checkoutStatusEnum = pgEnum("checkout_status", [
  "draft",
  "ready",
  "converted",
  "expired",
  "abandoned"
]);

export const inventoryMovementTypeEnum = pgEnum(
  "inventory_movement_type",
  ["purchase", "sale", "adjustment", "return", "reservation", "release"]
);

// Better Auth core tables.
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    phone: text("phone"),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    termsVersion: text("terms_version"),
    role: userRoleEnum("role").notNull().default("customer"),
    ...timestamps
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)]
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_idx").on(table.userId)
  ]
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("account_provider_unique").on(
      table.providerId,
      table.accountId
    ),
    index("account_user_idx").on(table.userId)
  ]
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps
  },
  (table) => [uniqueIndex("category_slug_unique").on(table.slug)]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    priceMinor: integer("price_minor").notNull(),
    compareAtPriceMinor: integer("compare_at_price_minor"),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    specifications: jsonb("specifications")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    ...timestamps
  },
  (table) => [
    uniqueIndex("product_sku_unique").on(table.sku),
    uniqueIndex("product_slug_unique").on(table.slug),
    index("product_category_idx").on(table.categoryId),
    index("product_active_featured_idx").on(
      table.isActive,
      table.isFeatured
    )
  ]
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps
  },
  (table) => [index("product_image_product_idx").on(table.productId)]
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Delivery address"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    county: text("county").notNull(),
    town: text("town").notNull(),
    addressLine: text("address_line").notNull(),
    landmark: text("landmark"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps
  },
  (table) => [index("address_user_idx").on(table.userId)]
);

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade"
    }),
    guestToken: text("guest_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index("cart_user_idx").on(table.userId),
    uniqueIndex("cart_guest_token_unique").on(table.guestToken)
  ]
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("cart_product_unique").on(table.cartId, table.productId),
    index("cart_item_cart_idx").on(table.cartId)
  ]
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps
  },
  (table) => [uniqueIndex("wishlist_user_unique").on(table.userId)]
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("wishlist_product_unique").on(
      table.wishlistId,
      table.productId
    )
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "restrict"
    }),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    subtotalMinor: integer("subtotal_minor").notNull(),
    deliveryMinor: integer("delivery_minor").notNull().default(0),
    discountMinor: integer("discount_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    currency: text("currency").notNull().default("KES"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    county: text("county").notNull(),
    town: text("town").notNull(),
    deliveryAddress: text("delivery_address").notNull(),
    customerNote: text("customer_note"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps
  },
  (table) => [
    uniqueIndex("order_number_unique").on(table.orderNumber),
    index("order_user_idx").on(table.userId),
    index("order_status_created_idx").on(table.status, table.createdAt)
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null"
    }),
    sku: text("sku").notNull(),
    productName: text("product_name").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalMinor: integer("line_total_minor").notNull(),
    ...timestamps
  },
  (table) => [index("order_item_order_idx").on(table.orderId)]
);

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "cascade"
    }),
    guestToken: text("guest_token"),
    status: checkoutStatusEnum("status").notNull().default("draft"),
    paymentMethod: paymentMethodEnum("payment_method"),
    subtotalMinor: integer("subtotal_minor").notNull().default(0),
    deliveryMinor: integer("delivery_minor").notNull().default(0),
    discountMinor: integer("discount_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull().default(0),
    currency: text("currency").notNull().default("KES"),
    recipientName: text("recipient_name"),
    phone: text("phone"),
    county: text("county"),
    town: text("town"),
    deliveryAddress: text("delivery_address"),
    customerNote: text("customer_note"),
    convertedOrderId: uuid("converted_order_id").references(
      () => orders.id,
      { onDelete: "set null" }
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index("checkout_cart_idx").on(table.cartId),
    index("checkout_user_status_idx").on(table.userId, table.status),
    index("checkout_guest_token_idx").on(table.guestToken),
    uniqueIndex("checkout_converted_order_unique").on(table.convertedOrderId)
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("KES"),
    idempotencyKey: text("idempotency_key").notNull(),
    providerReference: text("provider_reference"),
    merchantRequestId: text("merchant_request_id"),
    checkoutRequestId: text("checkout_request_id"),
    phone: text("phone"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    providerPayload: jsonb("provider_payload"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("payment_idempotency_unique").on(table.idempotencyKey),
    uniqueIndex("payment_checkout_request_unique").on(
      table.checkoutRequestId
    ),
    index("payment_order_idx").on(table.orderId),
    index("payment_status_idx").on(table.status)
  ]
);

export const fulfillments = pgTable(
  "fulfillments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courierName: text("courier_name").notNull(),
    trackingNumber: text("tracking_number"),
    status: text("status").notNull().default("processing"),
    notes: text("notes"),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null"
    }),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index("fulfillment_order_idx").on(table.orderId),
    index("fulfillment_tracking_idx").on(table.trackingNumber),
    index("fulfillment_status_idx").on(table.status)
  ]
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null"
    }),
    type: inventoryMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason"),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null"
    }),
    ...timestamps
  },
  (table) => [
    index("inventory_product_created_idx").on(
      table.productId,
      table.createdAt
    ),
    index("inventory_order_idx").on(table.orderId)
  ]
);

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "cascade"
    }),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null"
    }),
    type: text("type").notNull(),
    audience: text("audience").notNull().default("customer"),
    channel: text("channel").notNull().default("internal"),
    status: text("status").notNull().default("pending"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    index("notification_event_order_idx").on(table.orderId),
    index("notification_event_status_idx").on(table.status, table.createdAt),
    index("notification_event_type_idx").on(table.type)
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    isApproved: boolean("is_approved").notNull().default(false),
    ...timestamps
  },
  (table) => [
    uniqueIndex("review_order_product_user_unique").on(
      table.orderId,
      table.productId,
      table.userId
    ),
    index("review_product_approved_idx").on(
      table.productId,
      table.isApproved
    )
  ]
);
