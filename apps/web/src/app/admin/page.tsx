import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Eye,
  Package,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  Truck,
  XCircle,
  Users
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  adjustInventory,
  archiveCategory,
  archiveProduct,
  bulkImportProducts,
  cancelOrder,
  confirmCodPayment,
  createCategory,
  createFulfillment,
  createProduct,
  updateCategory,
  updateOrder,
  updateProduct
} from "@/app/admin/actions";
import { AdminSubmitButton } from "@/app/admin/form-controls";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import {
  getAdminPrincipal,
  permissionForAdminView
} from "@/lib/admin-authorization";
import { env } from "@/lib/env";
import {
  canTransitionOrderStatus,
  customerOrderStatusLabels,
  orderStatusForFulfillment
} from "@/lib/order-status";
import {
  hasConfiguredDatabase,
  logFallback,
  withTimeout
} from "@/lib/database-resilience";
import { sql } from "@talomart/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const orderStatuses = [
  "pending_payment",
  "payment_confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned"
] as const;

const paymentStatuses = [
  "pending",
  "processing",
  "paid",
  "failed",
  "refunded"
] as const;

const fulfillmentStatuses = [
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "returned"
] as const;

const adminViews = [
  "overview",
  "products",
  "low-stock",
  "inventory",
  "orders",
  "customers",
  "analytics",
  "categories"
] as const;

type AdminView = (typeof adminViews)[number];

type AdminStats = {
  products: number;
  activeProducts: number;
  categories: number;
  users: number;
  orders: number;
  lowStock: number;
  revenueMinor: number;
  unfulfilled: number;
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type AdminProduct = {
  id: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  specifications: Record<string, string>;
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: (typeof orderStatuses)[number];
  paymentStatus: (typeof paymentStatuses)[number];
  paymentMethod: "mpesa" | "cash_on_delivery";
  totalMinor: number;
  recipientName: string;
  phone: string;
  county: string;
  town: string;
  deliveryAddress: string;
  customerNote: string | null;
  itemCount: number;
  placedAt: string;
  items: { productName: string; sku: string; quantity: number }[];
  notificationEvents: {
    type: string;
    status: string;
    audience: string;
    createdAt: string;
  }[];
  fulfillments: {
    courierName: string;
    trackingNumber: string | null;
    status: string;
    createdAt: string;
  }[];
};

type InventoryMovement = {
  id: string;
  productName: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
};

type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  orders: number;
  lifetimeValueMinor: number;
  lastOrderAt: string | null;
  joinedAt: string;
};

type AdminAnalytics = {
  revenueTrend: { label: string; revenueMinor: number; orders: number }[];
  ordersByStatus: { status: string; count: number; revenueMinor: number }[];
  topProducts: {
    productName: string;
    sku: string;
    quantity: number;
    revenueMinor: number;
  }[];
  lowStockTrend: {
    productName: string;
    sku: string;
    availableQuantity: number;
    lowStockThreshold: number;
  }[];
  customerGrowth: { label: string; customers: number }[];
  revenuePipeline: { status: string; count: number; revenueMinor: number }[];
  averageOrderValueMinor: number;
  totalRevenueOrders: number;
  isFallback: boolean;
};

type AdminFilters = {
  view: AdminView;
  productQuery: string;
  productStatus: string;
  categoryId: string;
  stockFilter: string;
  productSort: string;
  orderQuery: string;
  orderStatus: string;
  paymentStatus: string;
  customerQuery: string;
  notice?: string | undefined;
  error?: string | undefined;
};

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const emptyAnalytics: AdminAnalytics = {
  revenueTrend: [],
  ordersByStatus: [],
  topProducts: [],
  lowStockTrend: [],
  customerGrowth: [],
  revenuePipeline: [],
  averageOrderValueMinor: 0,
  totalRevenueOrders: 0,
  isFallback: false
};

const fallbackAnalytics: AdminAnalytics = {
  ...emptyAnalytics,
  isFallback: true
};

const adminAnalyticsTimeoutMs = Number(
  process.env.TALOMART_ADMIN_ANALYTICS_TIMEOUT_MS ?? 4500
);

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return typeof item === "string" ? item : "";
}

function toAdminView(value: string): AdminView {
  return adminViews.includes(value as AdminView)
    ? (value as AdminView)
    : "overview";
}

async function getFilters(searchParams?: AdminPageProps["searchParams"]) {
  const params = (await searchParams) ?? {};

  return {
    view: toAdminView(value(params, "view")),
    productQuery: value(params, "pq"),
    productStatus: value(params, "ps") || "active",
    categoryId: value(params, "category"),
    stockFilter: value(params, "stock"),
    productSort: value(params, "sort") || "newest",
    orderQuery: value(params, "oq"),
    orderStatus: value(params, "os"),
    paymentStatus: value(params, "pay"),
    customerQuery: value(params, "cq"),
    notice: value(params, "notice") || undefined,
    error: value(params, "error") || undefined
  } satisfies AdminFilters;
}

async function getAdminData(filters: AdminFilters) {
  const [stats] = await sql<AdminStats[]>`
    select
      (select count(*)::int from products) as products,
      (select count(*)::int from products where is_active = true) as "activeProducts",
      (select count(*)::int from categories) as categories,
      (select count(*)::int from "user") as users,
      (select count(*)::int from orders) as orders,
      (
        select count(*)::int
        from products
        where is_active = true
          and stock_quantity - reserved_quantity <= low_stock_threshold
      ) as "lowStock",
      (
        select coalesce(sum(total_minor), 0)::int
        from orders
        where status in ('payment_confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered')
      ) as "revenueMinor",
      (
        select count(*)::int
        from orders
        where status in ('payment_confirmed', 'processing', 'packed')
      ) as unfulfilled
  `;

  const needsCategories = ["overview", "products", "categories"].includes(filters.view);
  const needsProducts = ["products", "inventory"].includes(filters.view);
  const needsLowStockProducts = ["overview", "low-stock"].includes(filters.view);
  const needsOrders = ["overview", "orders"].includes(filters.view);
  const needsMovements = filters.view === "inventory";
  const needsCustomers = ["overview", "customers"].includes(filters.view);

  const categories = needsCategories
    ? await sql<AdminCategory[]>`
    select
      c.id::text,
      c.name,
      c.slug,
      c.description,
      c.image_url as "imageUrl",
      c.sort_order as "sortOrder",
      c.is_active as "isActive",
      count(p.id)::int as "productCount"
    from categories c
    left join products p on p.category_id = c.id
    group by c.id
    order by c.sort_order asc, c.name asc
  `
    : [];

  const products = needsProducts
    ? await sql<AdminProduct[]>`
    select
      p.id::text,
      p.category_id::text as "categoryId",
      c.name as "categoryName",
      p.sku,
      p.name,
      p.slug,
      p.short_description as "shortDescription",
      p.description,
      (
        select pi.url
        from product_images pi
        where pi.product_id = p.id
        order by pi.sort_order asc, pi.created_at asc
        limit 1
      ) as "imageUrl",
      p.price_minor as "priceMinor",
      p.compare_at_price_minor as "compareAtPriceMinor",
      p.stock_quantity as "stockQuantity",
      p.reserved_quantity as "reservedQuantity",
      greatest(p.stock_quantity - p.reserved_quantity, 0)::int as "availableQuantity",
      p.low_stock_threshold as "lowStockThreshold",
      p.is_active as "isActive",
      p.is_featured as "isFeatured",
      p.specifications
    from products p
    inner join categories c on c.id = p.category_id
    where
      (${filters.productQuery}::text = ''
        or p.name ilike '%' || ${filters.productQuery} || '%'
        or p.sku ilike '%' || ${filters.productQuery} || '%'
        or c.name ilike '%' || ${filters.productQuery} || '%')
      and (${filters.categoryId}::text = '' or p.category_id::text = ${filters.categoryId})
      and (
        ${filters.productStatus} = 'all'
        or (${filters.productStatus} = 'active' and p.is_active = true)
        or (${filters.productStatus} = 'archived' and p.is_active = false)
        or (${filters.productStatus} = 'featured' and p.is_featured = true)
      )
      and (
        ${filters.stockFilter} = ''
        or (${filters.stockFilter} = 'low' and p.stock_quantity - p.reserved_quantity <= p.low_stock_threshold)
        or (${filters.stockFilter} = 'out' and p.stock_quantity - p.reserved_quantity <= 0)
      )
    order by
      case when ${filters.productSort} = 'price-low' then p.price_minor end asc,
      case when ${filters.productSort} = 'price-high' then p.price_minor end desc,
      case when ${filters.productSort} = 'stock-low' then p.stock_quantity - p.reserved_quantity end asc,
      p.is_active desc,
      p.created_at desc
    limit 80
  `
    : [];

  const lowStockProducts = needsLowStockProducts
    ? await sql<AdminProduct[]>`
    select
      p.id::text,
      p.category_id::text as "categoryId",
      c.name as "categoryName",
      p.sku,
      p.name,
      p.slug,
      p.short_description as "shortDescription",
      p.description,
      (
        select pi.url
        from product_images pi
        where pi.product_id = p.id
        order by pi.sort_order asc, pi.created_at asc
        limit 1
      ) as "imageUrl",
      p.price_minor as "priceMinor",
      p.compare_at_price_minor as "compareAtPriceMinor",
      p.stock_quantity as "stockQuantity",
      p.reserved_quantity as "reservedQuantity",
      greatest(p.stock_quantity - p.reserved_quantity, 0)::int as "availableQuantity",
      p.low_stock_threshold as "lowStockThreshold",
      p.is_active as "isActive",
      p.is_featured as "isFeatured",
      p.specifications
    from products p
    inner join categories c on c.id = p.category_id
    where p.is_active = true
      and p.stock_quantity - p.reserved_quantity <= p.low_stock_threshold
    order by p.stock_quantity - p.reserved_quantity asc, p.name asc
    limit 12
  `
    : [];

  const orders = needsOrders
    ? await sql<AdminOrder[]>`
    select
      o.id::text,
      o.order_number as "orderNumber",
      o.status,
      coalesce(p.status, 'pending') as "paymentStatus",
      o.payment_method as "paymentMethod",
      o.total_minor as "totalMinor",
      o.recipient_name as "recipientName",
      o.phone,
      o.county,
      o.town,
      o.delivery_address as "deliveryAddress",
      o.customer_note as "customerNote",
      (
        select coalesce(sum(oi.quantity), 0)::int
        from order_items oi
        where oi.order_id = o.id
      ) as "itemCount",
      o.placed_at::text as "placedAt",
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productName', oi.product_name,
              'sku', oi.sku,
              'quantity', oi.quantity
            )
            order by oi.created_at asc
          )
          from order_items oi
          where oi.order_id = o.id
        ),
        '[]'::jsonb
      ) as items,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'type', ne.type,
              'status', ne.status,
              'audience', ne.audience,
              'createdAt', ne.created_at::text
            )
            order by ne.created_at desc
          )
          from notification_events ne
          where ne.order_id = o.id
        ),
        '[]'::jsonb
      ) as "notificationEvents",
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'courierName', f.courier_name,
              'trackingNumber', f.tracking_number,
              'status', f.status,
              'createdAt', f.created_at::text
            )
            order by f.created_at desc
          )
          from fulfillments f
          where f.order_id = o.id
        ),
        '[]'::jsonb
      ) as fulfillments
    from orders o
    left join payments p on p.order_id = o.id
    where
      (${filters.orderQuery}::text = ''
        or o.order_number ilike '%' || ${filters.orderQuery} || '%'
        or o.recipient_name ilike '%' || ${filters.orderQuery} || '%'
        or o.phone ilike '%' || ${filters.orderQuery} || '%')
      and (${filters.orderStatus}::text = '' or o.status::text = ${filters.orderStatus})
      and (${filters.paymentStatus}::text = '' or coalesce(p.status, 'pending')::text = ${filters.paymentStatus})
    order by o.placed_at desc
    limit 50
  `
    : [];

  const movements = needsMovements
    ? await sql<InventoryMovement[]>`
    select
      im.id::text,
      p.name as "productName",
      im.type,
      im.quantity,
      im.balance_after as "balanceAfter",
      im.reason,
      im.created_at::text as "createdAt"
    from inventory_movements im
    inner join products p on p.id = im.product_id
    order by im.created_at desc
    limit 12
  `
    : [];

  const customers = needsCustomers
    ? await sql<AdminCustomer[]>`
    select
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      count(o.id)::int as orders,
      coalesce(sum(o.total_minor), 0)::int as "lifetimeValueMinor",
      max(o.placed_at)::text as "lastOrderAt",
      u.created_at::text as "joinedAt"
    from "user" u
    left join orders o on o.user_id = u.id
    where
      (${filters.customerQuery}::text = ''
        or u.name ilike '%' || ${filters.customerQuery} || '%'
        or u.email ilike '%' || ${filters.customerQuery} || '%'
        or coalesce(u.phone, '') ilike '%' || ${filters.customerQuery} || '%')
    group by u.id
    order by "lifetimeValueMinor" desc, "lastOrderAt" desc nulls last, u.created_at desc
    limit 40
  `
    : [];

  const analytics =
    filters.view === "analytics"
      ? await getAdminAnalytics()
      : emptyAnalytics;

  return {
    stats:
      stats ??
      {
        products: 0,
        activeProducts: 0,
        categories: 0,
        users: 0,
        orders: 0,
        lowStock: 0,
        revenueMinor: 0,
        unfulfilled: 0
      },
    categories,
    products,
    lowStockProducts,
    orders,
    movements,
    customers,
    analytics
  };
}

async function getAdminAnalytics(): Promise<AdminAnalytics> {
  if (!hasConfiguredDatabase()) {
    return fallbackAnalytics;
  }

  try {
    return await withTimeout(loadAdminAnalytics(), {
      label: "Admin analytics",
      milliseconds: adminAnalyticsTimeoutMs
    });
  } catch (error) {
    logFallback("Admin analytics could not be loaded", error);
    return fallbackAnalytics;
  }
}

async function loadAdminAnalytics(): Promise<AdminAnalytics> {
  return sql.begin(async (tx) => {
    const statementTimeout = `${Math.max(
      1000,
      adminAnalyticsTimeoutMs - 750
    )}ms`;

    await tx`select set_config('statement_timeout', ${statementTimeout}, true)`;

    const revenueTrend = await tx<AdminAnalytics["revenueTrend"]>`
      select
        to_char(days.day::date, 'Mon DD') as label,
        coalesce(sum(o.total_minor), 0)::int as "revenueMinor",
        count(o.id)::int as orders
      from generate_series(
        current_date - interval '13 days',
        current_date,
        interval '1 day'
      ) as days(day)
      left join orders o
        on o.placed_at >= days.day::date
        and o.placed_at < days.day::date + interval '1 day'
        and o.status in ('payment_confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered')
      group by days.day
      order by days.day asc
    `;

    const ordersByStatus = await tx<AdminAnalytics["ordersByStatus"]>`
      select
        status::text,
        count(*)::int as count,
        coalesce(sum(total_minor), 0)::int as "revenueMinor"
      from orders
      group by status
      order by count desc, status asc
    `;

    const topProducts = await tx<AdminAnalytics["topProducts"]>`
      select
        oi.product_name as "productName",
        oi.sku,
        coalesce(sum(oi.quantity), 0)::int as quantity,
        coalesce(sum(oi.line_total_minor), 0)::int as "revenueMinor"
      from order_items oi
      inner join orders o on o.id = oi.order_id
      where o.status in ('payment_confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered')
      group by oi.product_name, oi.sku
      order by quantity desc, "revenueMinor" desc
      limit 6
    `;

    const lowStockTrend = await tx<AdminAnalytics["lowStockTrend"]>`
      select
        p.name as "productName",
        p.sku,
        greatest(p.stock_quantity - p.reserved_quantity, 0)::int as "availableQuantity",
        p.low_stock_threshold as "lowStockThreshold"
      from products p
      where p.is_active = true
      order by greatest(p.stock_quantity - p.reserved_quantity, 0) asc, p.name asc
      limit 8
    `;

    const customerGrowth = await tx<AdminAnalytics["customerGrowth"]>`
      select
        to_char(weeks.week::date, 'Mon DD') as label,
        count(u.id)::int as customers
      from generate_series(
        date_trunc('week', current_date) - interval '7 weeks',
        date_trunc('week', current_date),
        interval '1 week'
      ) as weeks(week)
      left join "user" u
        on u.created_at >= weeks.week
        and u.created_at < weeks.week + interval '1 week'
      group by weeks.week
      order by weeks.week asc
    `;

    const revenuePipeline = await tx<AdminAnalytics["revenuePipeline"]>`
      select
        status::text,
        count(*)::int as count,
        coalesce(sum(total_minor), 0)::int as "revenueMinor"
      from orders
      where status in ('payment_confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered')
      group by status
      order by
        case status
          when 'payment_confirmed' then 1
          when 'processing' then 2
          when 'packed' then 3
          when 'out_for_delivery' then 4
          when 'delivered' then 5
          else 6
        end
    `;

    const averageRows = await tx<
      { averageOrderValueMinor: number; totalRevenueOrders: number }[]
    >`
      select
        coalesce(avg(total_minor), 0)::int as "averageOrderValueMinor",
        count(*)::int as "totalRevenueOrders"
      from orders
      where status in ('payment_confirmed', 'processing', 'packed', 'out_for_delivery', 'delivered')
    `;

    return {
      revenueTrend,
      ordersByStatus,
      topProducts,
      lowStockTrend,
      customerGrowth,
      revenuePipeline,
      averageOrderValueMinor: averageRows[0]?.averageOrderValueMinor ?? 0,
      totalRevenueOrders: averageRows[0]?.totalRevenueOrders ?? 0,
      isFallback: false
    };
  });
}

function money(minor: number | null | undefined) {
  if (!minor) return "";
  return String(Math.round(minor / 100));
}

function formatMoney(minor: number) {
  return `KSh ${new Intl.NumberFormat("en-KE").format(Math.round(minor / 100))}`;
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function specText(specifications: Record<string, string>) {
  return Object.entries(specifications ?? {})
    .map(([key, itemValue]) => `${key}: ${itemValue}`)
    .join("\n");
}

function dateLabel(value: string | null) {
  if (!value) return "No orders yet";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function stockLevel(product: AdminProduct) {
  if (product.availableQuantity <= 0) {
    return { label: "Out of stock", tone: "red" as const };
  }

  if (product.availableQuantity <= product.lowStockThreshold) {
    return { label: "Low stock", tone: "orange" as const };
  }

  return { label: "Healthy", tone: "green" as const };
}

function stockPercent(product: AdminProduct) {
  if (product.stockQuantity <= 0) return 0;
  return Math.min(
    100,
    Math.max(0, Math.round((product.availableQuantity / product.stockQuantity) * 100))
  );
}

function orderPriority(order: AdminOrder) {
  if (
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus === "pending" &&
    ["processing", "packed", "out_for_delivery"].includes(order.status)
  ) {
    return { label: "Collect COD", tone: "green" as const };
  }

  if (order.status === "pending_payment") {
    return { label: "Await payment", tone: "orange" as const };
  }

  if (["payment_confirmed", "processing", "packed"].includes(order.status)) {
    return { label: "Action needed", tone: "red" as const };
  }

  if (["out_for_delivery", "delivered"].includes(order.status)) {
    return { label: "In motion", tone: "green" as const };
  }

  return { label: "Closed", tone: "slate" as const };
}

function fulfilmentStep(order: AdminOrder) {
  if (order.status === "delivered") return 4;
  if (order.status === "out_for_delivery") return 3;
  if (order.status === "packed") return 2;
  if (["processing", "payment_confirmed"].includes(order.status)) return 1;
  return -1;
}

function paymentBadge(order: AdminOrder) {
  if (
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus === "pending"
  ) {
    return {
      label: "collect on delivery",
      tone: "green" as const
    };
  }

  if (order.paymentStatus === "paid") {
    return { label: "payment paid", tone: "green" as const };
  }

  if (order.paymentStatus === "failed") {
    return { label: "payment failed", tone: "red" as const };
  }

  return {
    label: `payment ${label(order.paymentStatus)}`,
    tone: "orange" as const
  };
}

function reorderSuggestion(product: AdminProduct) {
  return Math.max(
    product.lowStockThreshold,
    product.lowStockThreshold * 2 - product.availableQuantity
  );
}

function movementTone(quantity: number) {
  if (quantity > 0) return "green" as const;
  if (quantity < 0) return "red" as const;
  return "slate" as const;
}

function daysSince(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function customerInitials(customer: AdminCustomer) {
  return customer.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || customer.email.slice(0, 2).toUpperCase();
}

function customerSegment(customer: AdminCustomer) {
  const inactiveDays = daysSince(customer.lastOrderAt);

  if (!["customer", "user"].includes(customer.role)) {
    return {
      label: "Internal",
      tone: "orange" as const,
      note: "Staff or admin account"
    };
  }

  if (customer.lifetimeValueMinor >= 1_000_000) {
    return {
      label: "VIP",
      tone: "orange" as const,
      note: "High-value buyer"
    };
  }

  if (inactiveDays !== null && inactiveDays > 90) {
    return {
      label: "Re-engage",
      tone: "red" as const,
      note: `${inactiveDays} days since last order`
    };
  }

  if (customer.orders >= 3) {
    return {
      label: "Loyal",
      tone: "green" as const,
      note: "Repeat buyer"
    };
  }

  if (customer.orders === 0) {
    return {
      label: "Prospect",
      tone: "slate" as const,
      note: "Account created, no order yet"
    };
  }

  return {
    label: "Active",
    tone: "green" as const,
    note: "Recent buyer"
  };
}

function categoryStatus(category: AdminCategory) {
  if (!category.isActive) {
    return {
      label: "Archived",
      tone: "slate" as const,
      note: "Hidden from customer browsing"
    };
  }

  if (category.productCount === 0) {
    return {
      label: "Empty",
      tone: "orange" as const,
      note: "Active, but no products yet"
    };
  }

  return {
    label: "Live",
    tone: "green" as const,
    note: "Visible in storefront navigation"
  };
}

function categoryFallbackIcon(category: AdminCategory) {
  const slug = category.slug.toLowerCase();

  if (slug.includes("phone")) return "📱";
  if (slug.includes("audio") || slug.includes("ear") || slug.includes("head")) return "🎧";
  if (slug.includes("charg") || slug.includes("power")) return "🔋";
  if (slug.includes("stor") || slug.includes("memory") || slug.includes("flash")) return "💾";
  if (slug.includes("camera")) return "📷";

  return "⌚";
}

function TextInput({
  name,
  label: fieldLabel,
  defaultValue,
  placeholder,
  type = "text",
  required = false
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  required?: boolean | undefined;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
      {fieldLabel}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[var(--color-navy)] outline-none focus:border-[var(--color-green)]"
      />
    </label>
  );
}

function TextArea({
  name,
  label: fieldLabel,
  defaultValue,
  rows = 3,
  placeholder
}: {
  name: string;
  label: string;
  defaultValue?: string | null | undefined;
  rows?: number | undefined;
  placeholder?: string | undefined;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
      {fieldLabel}
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[var(--color-navy)] outline-none focus:border-[var(--color-green)]"
      />
    </label>
  );
}

function ImageUploadField({
  currentImageUrl,
  compact = false
}: {
  currentImageUrl?: string | null | undefined;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 ${
        compact ? "" : "md:grid-cols-[140px_minmax(0,1fr)]"
      }`}
    >
      <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
        {currentImageUrl ? (
          <div
            role="img"
            aria-label="Current catalogue asset"
            className="h-32 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${currentImageUrl})` }}
          />
        ) : (
          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 text-3xl">
            🖼️
          </div>
        )}
      </div>

      <div className="grid min-w-0 gap-3">
        <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
          Upload image
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="w-full min-w-0 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-[var(--color-navy)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-green)] file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-white focus:border-[var(--color-green)] focus:outline-none"
          />
        </label>

        <TextInput
          name="imageUrl"
          label="Or paste image URL"
          type="url"
          defaultValue={currentImageUrl}
          placeholder="https://..."
        />

        <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-500">
          Uploads support JPG, PNG, WebP and AVIF up to 5MB. If you upload a
          file, it replaces the pasted URL.
        </p>
      </div>
    </div>
  );
}

function Checkbox({
  name,
  label: fieldLabel,
  defaultChecked = false
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-600">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[var(--color-green)]"
      />
      {fieldLabel}
    </label>
  );
}

function ProductForm({
  action,
  categories,
  product,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  categories: AdminCategory[];
  product?: AdminProduct;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4">
      {product && <input type="hidden" name="productId" value={product.id} />}
      <div className="grid gap-3 md:grid-cols-3">
        <TextInput
          name="name"
          label="Product name"
          required
          defaultValue={product?.name}
          placeholder="Oraimo Powerbank 20000mAh"
        />
        <TextInput
          name="sku"
          label="SKU"
          required
          defaultValue={product?.sku}
          placeholder="TLM-PWR-001"
        />
        <TextInput
          name="slug"
          label="Slug"
          required
          defaultValue={product?.slug}
          placeholder="oraimo-powerbank-20000mah"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-extrabold text-slate-600">
          Category
          <select
            name="categoryId"
            required
            defaultValue={product?.categoryId ?? categories[0]?.id ?? ""}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[var(--color-navy)] outline-none focus:border-[var(--color-green)]"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <TextInput
          name="price"
          label="Price (KSh)"
          type="number"
          required
          defaultValue={money(product?.priceMinor)}
        />
        <TextInput
          name="compareAtPrice"
          label="Compare at (KSh)"
          type="number"
          defaultValue={money(product?.compareAtPriceMinor)}
        />
      </div>

      <ImageUploadField currentImageUrl={product?.imageUrl} />

      <div className="grid gap-3 xl:grid-cols-3">
        <TextInput
          name="stockQuantity"
          label="Stock quantity"
          type="number"
          required
          defaultValue={product?.stockQuantity ?? 0}
        />
        <TextInput
          name="lowStockThreshold"
          label="Low stock threshold"
          type="number"
          required
          defaultValue={product?.lowStockThreshold ?? 5}
        />
        <div className="flex flex-wrap items-end gap-2">
          <Checkbox
            name="isActive"
            label="Active"
            defaultChecked={product?.isActive ?? true}
          />
          <Checkbox
            name="isFeatured"
            label="Featured"
            defaultChecked={product?.isFeatured ?? false}
          />
        </div>
      </div>

      <TextInput
        name="shortDescription"
        label="Short description"
        defaultValue={product?.shortDescription}
        placeholder="Fast-charging accessory for everyday use"
      />
      <TextArea
        name="description"
        label="Full description"
        rows={4}
        defaultValue={product?.description}
      />
      <TextArea
        name="specifications"
        label="Specifications"
        rows={4}
        defaultValue={product ? specText(product.specifications) : ""}
        placeholder={"Capacity: 20000mAh\nWarranty: 12 months"}
      />

      <AdminSubmitButton
        pendingLabel="Saving product..."
        className="inline-flex min-h-11 w-max items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white"
      >
        <Save className="h-4 w-4" />
        {submitLabel}
      </AdminSubmitButton>
    </form>
  );
}

function CategoryForm({
  action,
  category,
  submitLabel,
  compact = false
}: {
  action: (formData: FormData) => Promise<void>;
  category?: AdminCategory;
  submitLabel: string;
  compact?: boolean;
}) {
  return (
    <form action={action} className="grid gap-3">
      {category && <input type="hidden" name="categoryId" value={category.id} />}
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
        <TextInput
          name="name"
          label="Category name"
          required
          defaultValue={category?.name}
          placeholder="Powerbanks"
        />
        <TextInput
          name="slug"
          label="Slug"
          required
          defaultValue={category?.slug}
          placeholder="powerbanks"
        />
        <TextInput
          name="sortOrder"
          label="Sort order"
          type="number"
          required
          defaultValue={category?.sortOrder ?? 0}
        />
      </div>
      <ImageUploadField currentImageUrl={category?.imageUrl} compact={compact} />
      <TextArea
        name="description"
        label="Description"
        defaultValue={category?.description}
      />
      <div className="flex items-center gap-3">
        <Checkbox
          name="isActive"
          label="Active"
          defaultChecked={category?.isActive ?? true}
        />
        <AdminSubmitButton
          pendingLabel="Saving category..."
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </AdminSubmitButton>
      </div>
    </form>
  );
}

function SelectField({
  name,
  label: fieldLabel,
  defaultValue,
  options,
  disabled = false
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
      {fieldLabel}
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[var(--color-navy)] outline-none focus:border-[var(--color-green)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const principal = await getAdminPrincipal();

  if (!principal) {
    return (
      <section className="bg-[var(--color-cream)] py-16">
        <div className="page-shell max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
          <h1 className="font-brand text-3xl font-extrabold">
            Staff sign-in required
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Use your approved staff or admin account before accessing Talomart
            operations.
          </p>
          <Link
            href="/admin/sign-in"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-green)] px-6 text-sm font-extrabold text-white"
          >
            Staff sign in
          </Link>
        </div>
      </section>
    );
  }

  if (env.ADMIN_MFA_REQUIRED && !principal.twoFactorEnabled) {
    redirect("/admin/security/setup");
  }

  let filters = await getFilters(searchParams);
  const staffDefaultView = adminViews.find(
    (view) => view !== "overview" && principal.can(permissionForAdminView(view))
  );
  if (principal.role === "staff" && filters.view === "overview") {
    if (!staffDefaultView) {
      redirect("/admin/no-access");
    }
    redirect(`/admin?view=${staffDefaultView}`);
  }
  if (!principal.can(permissionForAdminView(filters.view))) {
    if (!staffDefaultView) redirect("/admin/no-access");
    filters = { ...filters, view: staffDefaultView };
  }
  const {
    stats,
    categories,
    products,
    lowStockProducts,
    orders,
    movements,
    customers,
    analytics
  } = await getAdminData(filters);

  const cards = [
    { label: "Products", value: stats.products, detail: `${stats.activeProducts} active`, icon: Package },
    { label: "Orders", value: stats.orders, detail: `${stats.unfulfilled} need fulfilment`, icon: ShoppingCart },
    { label: "Customers", value: stats.users, detail: "Registered accounts", icon: Users },
    { label: "Revenue", value: formatMoney(stats.revenueMinor), detail: "Confirmed pipeline", icon: BarChart3 },
    { label: "Low stock", value: stats.lowStock, detail: "Needs attention", icon: AlertTriangle }
  ];
  const ordersNeedingAction = orders.filter((order) =>
    ["payment_confirmed", "processing", "packed"].includes(order.status)
  );
  const recentOrders = orders.slice(0, 4);
  const productsNeedingRestock = lowStockProducts.slice(0, 4);
  const emptyCategories = categories.filter(
    (category) => category.productCount === 0
  );
  const recentCustomers = customers.filter((customer) => {
    const joinedDaysAgo = daysSince(customer.joinedAt);
    return joinedDaysAgo !== null && joinedDaysAgo <= 30;
  }).length;
  const quickActions = [
    {
      label: "Add product",
      detail: "Create a new catalogue item",
      href: "/admin?view=products#products",
      icon: Plus
    },
    {
      label: "Adjust inventory",
      detail: "Record restock, damage or recount",
      href: "/admin?view=inventory#inventory",
      icon: SlidersHorizontal
    },
    {
      label: "View orders",
      detail: "Open the fulfilment desk",
      href: "/admin?view=orders#orders",
      icon: ShoppingCart
    },
    {
      label: "Manage categories",
      detail: "Update departments and images",
      href: "/admin?view=categories#categories",
      icon: ClipboardList
    }
  ];
  const healthIndicators = [
    {
      label: "Catalogue health",
      value: `${stats.activeProducts}/${Math.max(stats.products, 1)}`,
      detail: `${stats.activeProducts} active products`,
      tone:
        stats.products === 0
          ? ("orange" as const)
          : stats.activeProducts / stats.products >= 0.8
            ? ("green" as const)
            : ("orange" as const)
    },
    {
      label: "Inventory health",
      value: stats.lowStock === 0 ? "Stable" : `${stats.lowStock} alerts`,
      detail:
        stats.lowStock === 0
          ? "No low-stock products"
          : "Restock queue needs attention",
      tone: stats.lowStock === 0 ? ("green" as const) : ("orange" as const)
    },
    {
      label: "Fulfilment health",
      value:
        stats.unfulfilled === 0 ? "Clear" : `${stats.unfulfilled} pending`,
      detail:
        stats.unfulfilled === 0
          ? "No orders waiting"
          : "Orders need processing",
      tone:
        stats.unfulfilled === 0
          ? ("green" as const)
          : stats.unfulfilled <= 5
            ? ("orange" as const)
            : ("red" as const)
    },
    {
      label: "Customer growth",
      value: recentCustomers,
      detail: "Accounts joined in last 30 days",
      tone: recentCustomers > 0 ? ("green" as const) : ("slate" as const)
    }
  ];

  return (
    <AdminDashboardShell
      principal={principal}
      active={filters.view}
      focus={{
        primary: `${stats.unfulfilled} orders need fulfilment`,
        secondary: `${stats.lowStock} low-stock products need attention.`
      }}
    >
        {filters.notice && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-extrabold text-[var(--color-green)] shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>{filters.notice}</p>
              <p className="mt-1 text-xs font-semibold text-green-700">
                The dashboard has refreshed with the latest data.
              </p>
            </div>
          </div>
        )}

        {filters.error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-extrabold text-red-600 shadow-sm">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p>{filters.error}</p>
              <p className="mt-1 text-xs font-semibold text-red-500">
                Review the form values and try again.
              </p>
            </div>
          </div>
        )}

        {filters.view === "overview" && (
          <>
        <div id="overview" className="mb-7 rounded-3xl bg-[var(--color-navy)] p-6 text-white shadow-sm sm:p-8">
          <span className="text-xs font-extrabold tracking-[0.25em] text-[var(--color-orange)]">
            TALOMART ADMIN V1.5
          </span>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-brand text-4xl font-extrabold">
                Operations Console
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100">
                Run catalogue, stock, fulfilment, customer operations and print
                workflows from one Supabase-backed dashboard.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-blue-100">
              <strong className="block text-white">Operations mode</strong>
              Manage today&apos;s catalogue, fulfilment and customer work.
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <article key={card.label} className="rounded-3xl bg-white p-5 shadow-sm">
              <card.icon className="h-7 w-7 text-[var(--color-green)]" />
              <p className="mt-4 text-sm font-bold text-slate-500">
                {card.label}
              </p>
              <strong className="font-brand text-3xl font-black">
                {card.value}
              </strong>
              <span className="mt-1 block text-xs font-bold text-slate-400">
                {card.detail}
              </span>
            </article>
          ))}
        </div>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
                  TODAY SNAPSHOT
                </span>
                <h2 className="font-brand mt-2 text-2xl font-extrabold">
                  Operational heartbeat
                </h2>
              </div>
              <Badge tone={stats.unfulfilled ? "orange" : "green"}>
                {stats.unfulfilled ? "action needed" : "all clear"}
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <OverviewSnapshotCard
                label="Pending fulfilment"
                value={stats.unfulfilled}
                detail="Orders waiting for warehouse action"
                href="/admin?view=orders#orders"
                icon={ShoppingCart}
                tone={stats.unfulfilled ? "orange" : "green"}
              />
              <OverviewSnapshotCard
                label="Low-stock alerts"
                value={stats.lowStock}
                detail="Products below threshold"
                href="/admin?view=low-stock#low-stock"
                icon={AlertTriangle}
                tone={stats.lowStock ? "orange" : "green"}
              />
              <OverviewSnapshotCard
                label="Recent orders"
                value={recentOrders.length}
                detail="Latest orders visible in the queue"
                href="/admin?view=orders#orders"
                icon={ClipboardList}
                tone="slate"
              />
              <OverviewSnapshotCard
                label="Revenue pipeline"
                value={formatMoney(stats.revenueMinor)}
                detail="Confirmed and active order value"
                href="/admin?view=orders#orders"
                icon={BarChart3}
                tone="green"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-orange)]">
              QUICK ACTIONS
            </span>
            <h2 className="font-brand mt-2 text-2xl font-extrabold">
              Move fast from here
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-green)] hover:bg-white hover:shadow-sm"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-[var(--color-green)]">
                    <action.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm font-extrabold text-[var(--color-navy)] group-hover:text-[var(--color-green)]">
                      {action.label}
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {action.detail}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-red-500">
                  PRIORITY QUEUE
                </span>
                <h2 className="font-brand mt-2 text-2xl font-extrabold">
                  What needs attention first
                </h2>
              </div>
              <Badge tone={ordersNeedingAction.length || productsNeedingRestock.length || emptyCategories.length ? "red" : "green"}>
                {ordersNeedingAction.length + productsNeedingRestock.length + emptyCategories.length} open
              </Badge>
            </div>

            <div className="mt-5 grid gap-4">
              <PriorityQueueBlock
                title="Orders needing action"
                empty="No orders need fulfilment action right now."
                href="/admin?view=orders#orders"
                items={ordersNeedingAction.slice(0, 3).map((order) => ({
                  title: order.orderNumber,
                  meta: `${order.recipientName} • ${formatMoney(order.totalMinor)}`,
                  badge: label(order.status)
                }))}
              />
              <PriorityQueueBlock
                title="Products needing restock"
                empty="No products are below their restock threshold."
                href="/admin?view=low-stock#low-stock"
                items={productsNeedingRestock.map((product) => ({
                  title: product.name,
                  meta: `${product.availableQuantity} available • threshold ${product.lowStockThreshold}`,
                  badge: product.sku
                }))}
              />
              <PriorityQueueBlock
                title="Empty categories"
                empty="Every category currently has products."
                href="/admin?view=categories#categories"
                items={emptyCategories.slice(0, 3).map((category) => ({
                  title: category.name,
                  meta: `/${category.slug}`,
                  badge: `${category.sortOrder}`
                }))}
              />
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
              HEALTH INDICATORS
            </span>
            <h2 className="font-brand mt-2 text-2xl font-extrabold">
              Store operations health
            </h2>
            <div className="mt-5 grid gap-3">
              {healthIndicators.map((indicator) => (
                <div
                  key={indicator.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-[var(--color-navy)]">
                        {indicator.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {indicator.detail}
                      </p>
                    </div>
                    <Badge tone={indicator.tone}>{indicator.value}</Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${
                        indicator.tone === "green"
                          ? "bg-[var(--color-green)]"
                          : indicator.tone === "red"
                            ? "bg-red-500"
                            : indicator.tone === "orange"
                              ? "bg-[var(--color-orange)]"
                              : "bg-slate-300"
                      }`}
                      style={{
                        width:
                          indicator.tone === "green"
                            ? "100%"
                            : indicator.tone === "orange"
                              ? "62%"
                              : indicator.tone === "red"
                                ? "38%"
                                : "48%"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
          </>
        )}

        {filters.view === "analytics" && (
        <section id="analytics" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-navy)] via-[#12366d] to-[var(--color-green)] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-orange)]">
                  ANALYTICS
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Business performance charts
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Track revenue, order movement, top products, customer growth
                  and inventory pressure before the store gets busy.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {formatMoney(stats.revenueMinor)}
                  </strong>
                  revenue
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {formatMoney(analytics.averageOrderValueMinor)}
                  </strong>
                  AOV
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {analytics.totalRevenueOrders}
                  </strong>
                  orders
                </div>
              </div>
            </div>
          </div>

          {analytics.isFallback && (
            <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-start">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600">
                <AlertTriangle size={20} />
              </span>
              <div>
                <strong className="font-brand block text-base text-[var(--color-navy)]">
                  Analytics is using a safe fallback right now.
                </strong>
                <p className="mt-1 leading-6">
                  The live analytics query took too long, so Talomart kept the
                  admin portal usable instead of trapping you on the loading
                  screen. Try opening this section again in a moment.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
            <AnalyticsChartCard
              title="Sales / revenue trend"
              eyebrow="Last 14 days"
              empty="No revenue orders yet. Sales trend will appear after confirmed orders."
            >
              <LineTrendChart
                data={analytics.revenueTrend.map((point) => ({
                  label: point.label,
                  value: point.revenueMinor,
                  helper: `${point.orders} orders`
                }))}
                formatValue={formatMoney}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Average order value"
              eyebrow="Revenue quality"
              empty=""
            >
              <div className="grid h-full content-center gap-4">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Average order value
                  </p>
                  <strong className="font-brand mt-2 block text-4xl font-black text-[var(--color-navy)]">
                    {formatMoney(analytics.averageOrderValueMinor)}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Based on {analytics.totalRevenueOrders} active revenue orders.
                  </p>
                </div>
                <Link
                  href="/admin/products/export"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 text-xs font-extrabold text-white"
                >
                  <ClipboardList className="h-4 w-4" />
                  Export catalogue for analysis
                </Link>
              </div>
            </AnalyticsChartCard>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <AnalyticsChartCard
              title="Orders by status"
              eyebrow="Pipeline mix"
              empty="No orders yet."
            >
              <HorizontalBarChart
                data={analytics.ordersByStatus.map((item) => ({
                  label: label(item.status),
                  value: item.count,
                  helper: formatMoney(item.revenueMinor)
                }))}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Revenue pipeline"
              eyebrow="Active order value"
              empty="No active revenue pipeline yet."
            >
              <HorizontalBarChart
                data={analytics.revenuePipeline.map((item) => ({
                  label: label(item.status),
                  value: item.revenueMinor,
                  helper: `${item.count} orders`
                }))}
                formatValue={formatMoney}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Top-selling products"
              eyebrow="By quantity sold"
              empty="Top products will appear after orders are placed."
            >
              <HorizontalBarChart
                data={analytics.topProducts.map((item) => ({
                  label: item.productName,
                  value: item.quantity,
                  helper: `${item.sku} • ${formatMoney(item.revenueMinor)}`
                }))}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Low-stock trend"
              eyebrow="Inventory pressure"
              empty="No active products found for inventory analysis."
            >
              <HorizontalBarChart
                data={analytics.lowStockTrend.map((item) => ({
                  label: item.productName,
                  value: Math.max(item.lowStockThreshold - item.availableQuantity, 0),
                  helper: `${item.availableQuantity} available • threshold ${item.lowStockThreshold}`
                }))}
              />
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title="Customer growth"
              eyebrow="Last 8 weeks"
              empty="Customer growth appears as accounts are created."
              className="xl:col-span-2"
            >
              <LineTrendChart
                data={analytics.customerGrowth.map((point) => ({
                  label: point.label,
                  value: point.customers,
                  helper: `${point.customers} customers`
                }))}
              />
            </AnalyticsChartCard>
          </div>
        </section>
        )}

        {filters.view === "products" && (
        <section id="products" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-navy)] to-[#12366d] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-orange)]">
                  CATALOGUE OPS
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Products command center
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Search, filter, sort and maintain your live catalogue with
                  stock health visible at a glance.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {products.length}
                  </strong>
                  showing
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {products.filter((product) => product.isFeatured).length}
                  </strong>
                  featured
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {products.filter((product) => product.availableQuantity <= product.lowStockThreshold).length}
                  </strong>
                  low stock
                </div>
              </div>
            </div>
          </div>

          <form action="/admin#products" className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="view" value="products" />
            <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[var(--color-navy)]">
              <Search className="h-4 w-4 text-[var(--color-green)]" />
              Find the right product fast
            </div>
            <div className="grid gap-3 lg:grid-cols-5">
              <TextInput
                name="pq"
                label="Search products"
                defaultValue={filters.productQuery}
                placeholder="Name, SKU, category..."
              />
              <SelectField
                name="ps"
                label="Status"
                defaultValue={filters.productStatus}
                options={[
                  { value: "active", label: "Active" },
                  { value: "all", label: "All" },
                  { value: "featured", label: "Featured" },
                  { value: "archived", label: "Archived" }
                ]}
              />
              <SelectField
                name="category"
                label="Category"
                defaultValue={filters.categoryId}
                options={[
                  { value: "", label: "All categories" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name
                  }))
                ]}
              />
              <SelectField
                name="stock"
                label="Stock"
                defaultValue={filters.stockFilter}
                options={[
                  { value: "", label: "Any stock" },
                  { value: "low", label: "Low stock" },
                  { value: "out", label: "Out of stock" }
                ]}
              />
              <div className="grid gap-1">
                <SelectField
                  name="sort"
                  label="Sort"
                  defaultValue={filters.productSort}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "price-low", label: "Price low" },
                    { value: "price-high", label: "Price high" },
                    { value: "stock-low", label: "Stock low" }
                  ]}
                />
                <button
                  type="submit"
                  className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 text-xs font-extrabold text-white"
                >
                  <Search className="h-4 w-4" />
                  Apply
                </button>
              </div>
            </div>
          </form>

          <details className="mb-5 rounded-3xl border border-green-100 bg-green-50/40 p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold">
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4 text-[var(--color-green)]" />
                Add new product
              </span>
              <span className="text-xs text-slate-500">Open form</span>
            </summary>
            <div className="mt-4">
              <ProductForm
                action={createProduct}
                categories={categories}
                submitLabel="Create product"
              />
            </div>
          </details>

          <details className="mb-5 rounded-3xl border border-blue-100 bg-blue-50/50 p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold">
              <span className="inline-flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600" />
                Bulk import, export and update
              </span>
              <span className="text-xs text-slate-500">CSV tools</span>
            </summary>

            <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-2xl bg-white p-4">
                <h3 className="font-brand text-lg font-extrabold text-[var(--color-navy)]">
                  Export and template
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Download the current catalogue, edit it in Excel or Google
                  Sheets, then import it back using SKU as the matching key.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <Link
                    href="/admin/products/export"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 text-xs font-extrabold text-white"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Export products CSV
                  </Link>
                  <Link
                    href="/admin/products/template"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-[var(--color-navy)]"
                  >
                    <Plus className="h-4 w-4" />
                    Download template
                  </Link>
                </div>
                <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                  Required columns: <strong>sku, name, slug, categorySlug, price,
                  stockQuantity</strong>. Optional fields include compareAtPrice,
                  imageUrl, active/featured flags and specifications.
                </div>
              </div>

              <form action={bulkImportProducts} className="grid gap-3 rounded-2xl bg-white p-4">
                <div>
                  <h3 className="font-brand text-lg font-extrabold text-[var(--color-navy)]">
                    Import or update products
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Products are matched by SKU. Choose whether to create,
                    update, or do both in one upload.
                  </p>
                </div>

                <SelectField
                  name="mode"
                  label="Import mode"
                  defaultValue="upsert"
                  options={[
                    { value: "upsert", label: "Create new and update existing" },
                    { value: "update", label: "Update existing SKUs only" },
                    { value: "create", label: "Create new SKUs only" }
                  ]}
                />

                <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
                  Upload CSV file
                  <input
                    name="csvFile"
                    type="file"
                    accept=".csv,text/csv"
                    className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[var(--color-navy)] file:mr-3 file:rounded-lg file:border-0 file:bg-green-50 file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-[var(--color-green)] outline-none focus:border-[var(--color-green)]"
                  />
                </label>

                <TextArea
                  name="csvText"
                  label="Or paste CSV rows"
                  rows={5}
                  placeholder={"sku,name,slug,categorySlug,price,stockQuantity\nTLM-CHG-001,Fast Charger,fast-charger,charging,1500,25"}
                />

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-slate-600">
                  <strong className="text-[var(--color-navy)]">Safety:</strong>{" "}
                  changing stock through CSV records an inventory movement.
                  Blank imageUrl removes the existing product image.
                </div>

                <AdminSubmitButton
                  confirmMessage="Import this CSV now? Existing products with matching SKUs may be updated."
                  pendingLabel="Importing products..."
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white"
                >
                  <Save className="h-4 w-4" />
                  Run bulk import
                </AdminSubmitButton>
              </form>
            </div>
          </details>

          <div className="grid gap-4">
            {products.length ? (
              products.map((product) => {
                const health = stockLevel(product);
                const percent = stockPercent(product);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid gap-4 p-4 xl:grid-cols-[1fr_280px]">
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="h-28 w-full overflow-hidden rounded-2xl bg-slate-100 sm:w-28">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="m-10 h-8 w-8 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-brand text-xl font-extrabold">
                              {product.name}
                            </h3>
                            {!product.isActive && <Badge>archived</Badge>}
                            {product.isFeatured && <Badge tone="orange">featured</Badge>}
                            <Badge tone={health.tone}>{health.label}</Badge>
                          </div>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {product.sku} · {product.categoryName} · {formatMoney(product.priceMinor)}
                          </p>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                            {product.shortDescription || product.description || "No product description yet."}
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <Metric label="Available" value={product.availableQuantity} />
                            <Metric label="Reserved" value={product.reservedQuantity} />
                            <Metric label="Threshold" value={product.lowStockThreshold} />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                          <span>Stock health</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              health.tone === "red"
                                ? "bg-red-500"
                                : health.tone === "orange"
                                  ? "bg-[var(--color-orange)]"
                                  : "bg-[var(--color-green)]"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          Total stock {product.stockQuantity}; available after reservations {product.availableQuantity}.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/products/${product.slug}`}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-[var(--color-navy)]"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Link>
                          <form action={archiveProduct}>
                            <input type="hidden" name="productId" value={product.id} />
                            <AdminSubmitButton
                              confirmKind="archive"
                              pendingLabel="Archiving..."
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-100 bg-white px-4 text-xs font-extrabold text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Archive
                            </AdminSubmitButton>
                          </form>
                        </div>
                      </div>
                    </div>

                    <details className="border-t border-slate-100 bg-slate-50/70 p-4">
                      <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold">
                        <Pencil className="h-4 w-4 text-[var(--color-green)]" />
                        Edit product details
                      </summary>
                      <div className="mt-4 rounded-2xl bg-white p-4">
                        <ProductForm
                          action={updateProduct}
                          categories={categories}
                          product={product}
                          submitLabel="Save product"
                        />
                      </div>
                    </details>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <Package className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="font-brand mt-4 text-2xl font-extrabold">
                  No products match this view
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Adjust your filters or create a new product. A clean catalogue
                  is the quiet engine of a premium store.
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {filters.view === "low-stock" && (
        <section id="low-stock" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[#4b2508] via-[var(--color-orange)] to-[#ff9c4d] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-orange-100">
                  STOCK WARNINGS
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Low-stock command center
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-50">
                  Prioritize fast-moving accessories before they disappear from
                  shelves. Restock from here and keep every movement auditable.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/15 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {lowStockProducts.length}
                  </strong>
                  alerts
                </div>
                <div className="rounded-2xl bg-white/15 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {lowStockProducts.filter((product) => product.availableQuantity <= 0).length}
                  </strong>
                  stockouts
                </div>
                <div className="rounded-2xl bg-white/15 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {lowStockProducts.reduce((total, product) => total + reorderSuggestion(product), 0)}
                  </strong>
                  suggested
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {lowStockProducts.length ? (
              lowStockProducts.map((product) => {
                const health = stockLevel(product);
                const percent = stockPercent(product);
                const suggested = reorderSuggestion(product);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-3xl border border-orange-100 bg-orange-50/50 shadow-sm"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-brand text-lg font-extrabold text-[var(--color-navy)]">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {product.sku} - {product.categoryName}
                          </p>
                        </div>
                        <Badge tone={health.tone}>{health.label}</Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Metric label="Available" value={product.availableQuantity} />
                        <Metric label="Threshold" value={product.lowStockThreshold} />
                        <Metric label="Reorder" value={suggested} />
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                          <span>Stock health</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
                          <div
                            className={`h-full rounded-full ${
                              health.tone === "red"
                                ? "bg-red-500"
                                : "bg-[var(--color-orange)]"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <p className="mt-4 rounded-2xl bg-white p-3 text-xs leading-5 text-slate-600">
                        Suggested action: add at least{" "}
                        <strong>{suggested}</strong> units, then confirm physical
                        shelf count before dispatching open orders.
                      </p>
                    </div>

                    <form action={adjustInventory} className="grid gap-2 border-t border-orange-100 bg-white p-4">
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="returnSection" value="low-stock" />
                      <TextInput
                        name="quantityChange"
                        label="Restock quantity"
                        type="number"
                        required
                        defaultValue={suggested}
                      />
                      <input type="hidden" name="reason" value="Low-stock restock" />
                      <AdminSubmitButton
                        pendingLabel="Restocking..."
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-4 text-xs font-extrabold text-white transition hover:bg-[#0f8d3d]"
                      >
                        <Save className="h-4 w-4" />
                        Restock item
                      </AdminSubmitButton>
                    </form>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center lg:col-span-3">
                <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="font-brand mt-4 text-2xl font-extrabold">
                  Stock is healthy right now
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  No low-stock products require action. The shelves are behaving.
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {filters.view === "inventory" && (
        <section id="inventory" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-navy)] to-[#12366d] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
                  STOCK CONTROL
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Inventory control room
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Adjust stock safely, capture the reason, and keep a visible
                  audit trail for every warehouse movement.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {products.length}
                  </strong>
                  SKUs
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {products.reduce((total, product) => total + product.availableQuantity, 0)}
                  </strong>
                  available
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {movements.length}
                  </strong>
                  movements
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-50 text-[var(--color-green)]">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-brand text-lg font-extrabold">
                      Stock adjustment station
                    </h3>
                    <p className="text-xs leading-5 text-slate-500">
                      Add stock for supplier delivery, subtract damaged items,
                      or correct a physical recount.
                    </p>
                  </div>
                </div>
              </div>

              <form action={adjustInventory} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,.8fr)]">
                  <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
                    Product
                    <select
                      name="productId"
                      required
                      className="min-h-11 min-w-0 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[var(--color-navy)] outline-none focus:border-[var(--color-green)]"
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - available {product.availableQuantity}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextInput
                    name="quantityChange"
                    label="Quantity change"
                    type="number"
                    required
                    placeholder="Use -5 to reduce stock"
                  />
                </div>
                <div className="mt-3">
                  <TextInput
                    name="reason"
                    label="Reason"
                    placeholder="Supplier restock, damaged stock, recount..."
                  />
                </div>
                <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-slate-600">
                  <strong className="text-[var(--color-navy)]">Warehouse rule:</strong>{" "}
                  positive numbers increase stock; negative numbers reduce stock.
                  Always add a reason so finance and fulfilment can audit later.
                </div>
                <AdminSubmitButton
                  confirmKind="inventory"
                  pendingLabel="Recording..."
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white transition hover:bg-[#0f8d3d]"
                >
                  <Save className="h-4 w-4" />
                  Record movement
                </AdminSubmitButton>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-brand text-lg font-extrabold">
                      Movement audit trail
                    </h3>
                    <p className="text-xs leading-5 text-slate-500">
                      Latest stock changes with balance snapshots.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {movements.length ? (
                  movements.map((movement) => (
                    <div key={movement.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="text-[var(--color-navy)]">
                            {movement.productName}
                          </strong>
                          <p className="mt-1 text-xs text-slate-500">
                            {dateLabel(movement.createdAt)}
                          </p>
                        </div>
                        <Badge tone={movementTone(movement.quantity)}>
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </Badge>
                      </div>
                      <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
                        Balance after movement:{" "}
                        <strong className="text-[var(--color-navy)]">
                          {movement.balanceAfter}
                        </strong>{" "}
                        units
                      </p>
                      {movement.reason && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          {movement.reason}
                        </p>
                      )}
                      <div className="mt-2">
                        <Badge>{movement.type}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                      No inventory movements recorded yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        )}

        {filters.view === "orders" && (
        <section id="orders" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-navy)] to-[#12366d] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-orange)]">
                  FULFILMENT DESK
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Order pipeline
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Move orders from payment confirmation to packing, dispatch,
                  delivery and print-ready documentation.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {orders.length}
                  </strong>
                  showing
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {orders.filter((order) => ["payment_confirmed", "processing", "packed"].includes(order.status)).length}
                  </strong>
                  action
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {orders.filter((order) => order.fulfillments.length > 0).length}
                  </strong>
                  tracked
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "New / paid", value: orders.filter((order) => ["payment_confirmed", "processing"].includes(order.status)).length, tone: "green" },
              { label: "Packed", value: orders.filter((order) => order.status === "packed").length, tone: "orange" },
              { label: "Out delivery", value: orders.filter((order) => order.status === "out_for_delivery").length, tone: "green" },
              { label: "Pending pay", value: orders.filter((order) => order.status === "pending_payment").length, tone: "orange" }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <strong className="font-brand block text-2xl font-black">
                  {item.value}
                </strong>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <form action="/admin#orders" className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="view" value="orders" />
            <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[var(--color-navy)]">
              <Search className="h-4 w-4 text-[var(--color-green)]" />
              Locate an order or narrow the queue
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              <TextInput
                name="oq"
                label="Search orders"
                defaultValue={filters.orderQuery}
                placeholder="Order no, customer, phone..."
              />
              <SelectField
                name="os"
                label="Order status"
                defaultValue={filters.orderStatus}
                options={[
                  { value: "", label: "All statuses" },
                  ...orderStatuses.map((status) => ({ value: status, label: label(status) }))
                ]}
              />
              <SelectField
                name="pay"
                label="Payment"
                defaultValue={filters.paymentStatus}
                options={[
                  { value: "", label: "Any payment" },
                  ...paymentStatuses.map((status) => ({ value: status, label: label(status) }))
                ]}
              />
              <div className="grid content-end">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 text-xs font-extrabold text-white"
                >
                  <Search className="h-4 w-4" />
                  Apply filters
                </button>
              </div>
            </div>
          </form>

          <div className="grid gap-4">
            {orders.length ? (
              orders.map((order) => <OrderCard key={order.id} order={order} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <BarChart3 className="mx-auto h-9 w-9 text-slate-300" />
                <h3 className="font-brand mt-3 text-xl font-extrabold">
                  No orders match those filters
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Clear filters or wait for checkout activity.
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {filters.view === "customers" && (
        <section id="customers" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-navy)] via-[#12366d] to-[var(--color-green)] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-orange)]">
                  CUSTOMER CRM
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Buyer relationship console
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Understand who is buying, who is loyal, who needs a follow-up,
                  and where Talomart can create a better customer experience.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {customers.length}
                  </strong>
                  showing
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {customers.filter((customer) => customer.lifetimeValueMinor >= 1_000_000).length}
                  </strong>
                  VIPs
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {customers.filter((customer) => customer.orders >= 3).length}
                  </strong>
                  repeat
                </div>
              </div>
            </div>
          </div>

          <form action="/admin#customers" className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <input type="hidden" name="view" value="customers" />
            <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-[var(--color-navy)]">
              <Search className="h-4 w-4 text-[var(--color-green)]" />
              Locate a buyer or support account
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <TextInput
                name="cq"
                label="Search customers"
                defaultValue={filters.customerQuery}
                placeholder="Name, email or phone"
              />
              <button
                type="submit"
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-5 text-xs font-extrabold text-white transition hover:bg-[#12366d] md:mt-6"
              >
                <Search className="h-4 w-4" />
                Search CRM
              </button>
            </div>
          </form>

          <div className="grid gap-4 xl:grid-cols-2">
            {customers.length ? (
              customers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center xl:col-span-2">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="font-brand mt-4 text-2xl font-extrabold">
                  No customers match this search
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Try a different name, email or phone number. Customer trust is
                  built one clear record at a time.
                </p>
              </div>
            )}
          </div>
        </section>
        )}

        {filters.view === "categories" && (
        <section id="categories" className="mt-6 rounded-3xl bg-white p-4 shadow-sm sm:p-6 lg:mt-8">
          <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-navy)] via-[#12366d] to-[var(--color-orange)] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-xs font-extrabold tracking-[0.22em] text-[var(--color-green)]">
                  MERCHANDISING
                </span>
                <h2 className="font-brand mt-2 text-3xl font-extrabold">
                  Category merchandising
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  Organize phones, chargers, audio, storage, cameras and new
                  product lines with clean storefront visibility.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {categories.length}
                  </strong>
                  total
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {categories.filter((category) => category.isActive).length}
                  </strong>
                  live
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <strong className="font-brand block text-xl text-white">
                    {categories.filter((category) => category.productCount === 0).length}
                  </strong>
                  empty
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-brand text-lg font-extrabold text-[var(--color-navy)]">
                  Merchandising notes
                </h3>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  Sort order controls storefront priority today. Drag-and-drop
                  ordering can be added later on top of the same sort field.
                </p>
              </div>
              <Badge tone="orange">drag ordering later</Badge>
            </div>
          </div>

          <details className="mb-5 rounded-3xl border border-green-100 bg-green-50/40 p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-extrabold">
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4 text-[var(--color-green)]" />
                Add new category
              </span>
              <span className="text-xs text-slate-500">Open form</span>
            </summary>
            <div className="mt-4 rounded-2xl bg-white p-4">
              <CategoryForm action={createCategory} submitLabel="Create category" />
            </div>
          </details>

          <div className="grid gap-4 xl:grid-cols-2">
            {categories.length ? (
              categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center xl:col-span-2">
                <Package className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="font-brand mt-4 text-2xl font-extrabold">
                  No categories yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Create your first department so products can be merchandised
                  cleanly across the storefront.
                </p>
              </div>
            )}
          </div>
        </section>
        )}
    </AdminDashboardShell>
  );
}

function AnalyticsChartCard({
  title,
  eyebrow,
  empty,
  className = "",
  children
}: {
  title: string;
  eyebrow: string;
  empty: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--color-green)]">
            {eyebrow}
          </span>
          <h3 className="font-brand mt-2 text-xl font-extrabold text-[var(--color-navy)]">
            {title}
          </h3>
        </div>
        {empty && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            live data
          </span>
        )}
      </div>
      {children}
    </article>
  );
}

function HorizontalBarChart({
  data,
  formatValue = (value: number) => String(value)
}: {
  data: { label: string; value: number; helper?: string }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);

  if (!data.length || max <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
        No measurable chart data yet. Once activity starts, this area will show
        performance movement automatically.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {data.map((item) => {
        const width = Math.max(8, Math.round((item.value / max) * 100));

        return (
          <div key={`${item.label}-${item.helper ?? ""}`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-extrabold text-[var(--color-navy)]">
                {item.label}
              </span>
              <span className="shrink-0 font-black text-slate-500">
                {formatValue(item.value)}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--color-green)]"
                style={{ width: `${width}%` }}
              />
            </div>
            {item.helper && (
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                {item.helper}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LineTrendChart({
  data,
  formatValue = (value: number) => String(value)
}: {
  data: { label: string; value: number; helper?: string }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.value), 0);

  if (!data.length || max <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
        No trend data yet. This chart will fill in as orders and customer
        activity accumulate.
      </div>
    );
  }

  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - (item.value / max) * 84 - 8;
    return { ...item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-56 w-full overflow-visible rounded-2xl bg-slate-50 p-2"
        role="img"
        aria-label="Trend chart"
      >
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--color-green)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <circle
            key={`${point.label}-${point.value}`}
            cx={point.x}
            cy={point.y}
            r="1.8"
            fill="var(--color-orange)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {points
          .filter((_, index) => index === 0 || index === points.length - 1 || index % 4 === 0)
          .map((point) => (
            <div key={`${point.label}-legend`} className="rounded-xl bg-slate-50 p-2">
              <p className="font-black text-[var(--color-navy)]">
                {formatValue(point.value)}
              </p>
              <p className="mt-1 text-slate-400">
                {point.label}
                {point.helper ? ` • ${point.helper}` : ""}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

function OverviewSnapshotCard({
  label: cardLabel,
  value,
  detail,
  href,
  icon: Icon,
  tone
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "slate" | "green" | "orange" | "red";
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-[var(--color-green)] hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[var(--color-green)] shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <Badge tone={tone}>{tone === "green" ? "healthy" : tone}</Badge>
      </div>
      <strong className="font-brand mt-4 block text-2xl font-black text-[var(--color-navy)]">
        {value}
      </strong>
      <p className="mt-1 text-sm font-extrabold text-slate-600">
        {cardLabel}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </Link>
  );
}

function PriorityQueueBlock({
  title,
  empty,
  href,
  items
}: {
  title: string;
  empty: string;
  href: string;
  items: { title: string; meta: string; badge: string }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-brand text-lg font-extrabold text-[var(--color-navy)]">
          {title}
        </h3>
        <Link
          href={href}
          className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 transition hover:text-[var(--color-green)]"
        >
          Open
        </Link>
      </div>
      <div className="mt-3 grid gap-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item.title}-${item.badge}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[var(--color-navy)]">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {item.meta}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                {item.badge}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-white px-3 py-3 text-xs leading-5 text-slate-500">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: AdminCategory }) {
  const status = categoryStatus(category);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-4 p-4 md:grid-cols-[150px_1fr]">
        <div className="h-36 overflow-hidden rounded-2xl bg-slate-100">
          {category.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-green-50 to-blue-50 text-5xl">
              {categoryFallbackIcon(category)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-brand text-xl font-extrabold text-[var(--color-navy)]">
                  {category.name}
                </h3>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500">
                /{category.slug}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-2 text-right">
              <strong className="font-brand block text-xl font-black text-[var(--color-navy)]">
                {category.productCount}
              </strong>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                products
              </span>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {category.description ||
              "No description yet. Add a short customer-friendly line for this department."}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <strong className="font-brand block text-lg font-black text-[var(--color-navy)]">
                {category.sortOrder}
              </strong>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Sort order
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <strong className="font-brand block text-lg font-black text-[var(--color-navy)]">
                {category.imageUrl ? "Set" : "Missing"}
              </strong>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Image
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
              <strong className="font-brand block text-base font-black leading-6 text-[var(--color-navy)]">
                {status.note}
              </strong>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Status note
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 lg:grid-cols-[1fr_auto]">
        <details className="rounded-2xl bg-white p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-[var(--color-navy)]">
            <Pencil className="h-4 w-4 text-[var(--color-green)]" />
            Edit category details
          </summary>
          <div className="mt-4">
            <CategoryForm
              action={updateCategory}
              category={category}
              submitLabel="Save category"
              compact
            />
          </div>
        </details>

        <form action={archiveCategory} className="grid content-start">
          <input type="hidden" name="categoryId" value={category.id} />
          <AdminSubmitButton
            confirmKind="archive"
            pendingLabel="Archiving..."
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 text-xs font-extrabold text-red-600 transition hover:border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Archive
          </AdminSubmitButton>
        </form>
      </div>
    </article>
  );
}

function CustomerCard({ customer }: { customer: AdminCustomer }) {
  const segment = customerSegment(customer);
  const inactiveDays = daysSince(customer.lastOrderAt);
  const averageOrderMinor =
    customer.orders > 0
      ? Math.round(customer.lifetimeValueMinor / customer.orders)
      : 0;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4 border-b border-slate-100 bg-slate-50 p-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-navy)] font-brand text-lg font-black text-white">
          {customerInitials(customer)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-brand truncate text-xl font-extrabold text-[var(--color-navy)]">
              {customer.name}
            </h3>
            <Badge tone={segment.tone}>{segment.label}</Badge>
            <Badge>{customer.role}</Badge>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">
            Joined {dateLabel(customer.joinedAt)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {segment.note}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Orders" value={customer.orders} />
          <Metric label="Lifetime value" value={formatMoney(customer.lifetimeValueMinor)} />
          <Metric label="Avg order" value={formatMoney(averageOrderMinor)} />
        </div>

        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-[var(--color-navy)]">
              Contact details
            </span>
            <span className="text-xs font-bold text-slate-400">
              Last order: {dateLabel(customer.lastOrderAt)}
            </span>
          </div>
          <div className="grid gap-2">
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:text-[var(--color-green)]"
            >
              <span className="truncate">{customer.email}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                Email
              </span>
            </a>
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="inline-flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:text-[var(--color-green)]"
              >
                <span>{customer.phone}</span>
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                  Call
                </span>
              </a>
            ) : (
              <p className="rounded-xl bg-white px-3 py-2 text-xs text-slate-400">
                No phone number saved yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--color-navy)] p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
            CRM suggestion
          </p>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            {customer.orders === 0
              ? "Send a welcome offer or helpful product recommendation to convert this account into a first purchase."
              : inactiveDays !== null && inactiveDays > 90
                ? "Add this buyer to a reactivation campaign with a strong accessory bundle offer."
                : customer.lifetimeValueMinor >= 1_000_000
                  ? "Protect this VIP relationship with priority support, early offers, and personal follow-up."
                  : "Keep this customer warm with relevant product recommendations and reliable fulfilment updates."}
          </p>
        </div>
      </div>
    </article>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const priority = orderPriority(order);
  const payment = paymentBadge(order);
  const step = fulfilmentStep(order);
  const latestFulfillment = order.fulfillments[0];
  const fulfilmentStages =
    order.paymentMethod === "cash_on_delivery"
      ? ["COD", "Process", "Pack", "Dispatch", "Deliver"]
      : ["Paid", "Process", "Pack", "Dispatch", "Deliver"];
  const canConfirmCodPayment =
    order.paymentMethod === "cash_on_delivery" &&
    order.status === "delivered" &&
    order.paymentStatus !== "paid";
  const canCancelOrder =
    !["delivered", "returned", "cancelled"].includes(order.status) &&
    order.paymentStatus !== "paid";
  const availableOrderStatuses = orderStatuses.filter(
    (status) =>
      status !== "cancelled" && canTransitionOrderStatus(order.status, status)
  );
  const availableFulfillmentStatuses = fulfillmentStatuses.filter(
    (status) =>
      canTransitionOrderStatus(order.status, orderStatusForFulfillment(status)) &&
      !(
        order.paymentMethod === "mpesa" &&
        order.paymentStatus !== "paid" &&
        orderStatusForFulfillment(status) !== order.status
      )
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-brand text-xl font-extrabold text-[var(--color-navy)]">
              {order.orderNumber}
            </h3>
            <Badge tone={priority.tone}>{priority.label}</Badge>
            <Badge tone="green">{label(order.status)}</Badge>
            <Badge tone={payment.tone}>{payment.label}</Badge>
          </div>
          <div className="rounded-2xl bg-white px-4 py-2 text-sm font-extrabold text-[var(--color-navy)] shadow-sm">
            {formatMoney(order.totalMinor)}
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {fulfilmentStages.map((stage, index) => (
            <div key={stage} className="flex items-center gap-2">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-black ${
                  index <= step
                    ? "bg-[var(--color-green)] text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {index + 1}
              </span>
              <span className="text-xs font-extrabold text-slate-600">
                {stage}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1fr_460px]">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Customer
              </p>
              <p className="font-brand mt-2 text-lg font-extrabold text-[var(--color-navy)]">
                {order.recipientName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {order.phone}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ordered {dateLabel(order.placedAt)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Delivery
              </p>
              <p className="mt-2 text-sm font-bold text-[var(--color-navy)]">
                {order.town}, {order.county}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {order.deliveryAddress}
              </p>
            </div>
          </div>

          {order.customerNote && (
            <p className="rounded-2xl bg-orange-50 p-3 text-xs italic text-slate-600">
              &ldquo;{order.customerNote}&rdquo;
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Items to fulfil
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-500">
                {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {order.items.map((item) => (
                <div
                  key={`${order.id}-${item.sku}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-bold text-[var(--color-navy)]">
                      {item.productName}
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      SKU {item.sku}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                    {item.quantity}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/orders/${order.id}/invoice`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-[var(--color-navy)] transition hover:border-[var(--color-green)] hover:text-[var(--color-green)]"
            >
              <Printer className="h-4 w-4" />
              Invoice
            </Link>
            <Link
              href={`/admin/orders/${order.id}/packing-slip`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-[var(--color-navy)] transition hover:border-[var(--color-green)] hover:text-[var(--color-green)]"
            >
              <ClipboardList className="h-4 w-4" />
              Packing slip
            </Link>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-500">
              Fulfilment history
            </p>
            <div className="mt-3 grid gap-2">
              {order.fulfillments.length ? (
                order.fulfillments.map((fulfillment) => (
                  <div
                    key={`${order.id}-${fulfillment.createdAt}`}
                    className="rounded-xl bg-white p-3 text-xs text-blue-950"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{fulfillment.courierName}</strong>
                      <Badge tone="green">{label(fulfillment.status)}</Badge>
                    </div>
                    <p className="mt-1 text-blue-700">
                      {fulfillment.trackingNumber
                        ? `Tracking ${fulfillment.trackingNumber}`
                        : "Tracking number pending"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-blue-700">
                  No courier or tracking record yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">
              Notification foundation
            </p>
            <div className="mt-3 grid gap-2">
              {order.notificationEvents.length ? (
                order.notificationEvents.slice(0, 4).map((event) => (
                  <div
                    key={`${order.id}-${event.type}-${event.createdAt}`}
                    className="rounded-xl bg-white p-3 text-xs text-emerald-950"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{label(event.type)}</strong>
                      <Badge tone={event.status === "failed" ? "red" : "green"}>
                        {label(event.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-emerald-700">
                      {label(event.audience)} · {dateLabel(event.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-emerald-700">
                  Events will appear here when order updates are queued for
                  customer/admin notification.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid min-w-full content-start gap-3">
          <div className="rounded-2xl bg-[var(--color-navy)] p-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-orange)]">
              Next best action
            </p>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              {latestFulfillment
                ? `Latest courier: ${latestFulfillment.courierName}. Keep status and tracking updated.`
                : "Add courier details once the order is packed or ready for dispatch."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
              <span className="rounded-full bg-white/10 px-3 py-1">
                {label(order.paymentMethod)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                {order.county}
              </span>
            </div>
          </div>

          <form action={updateOrder} className="grid gap-3 rounded-2xl bg-slate-50 p-4">
            <input type="hidden" name="orderId" value={order.id} />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                name="status"
                label="Order status"
                defaultValue={order.status}
                options={availableOrderStatuses.map((status) => ({
                  value: status,
                  label: customerOrderStatusLabels[status]
                }))}
              />
              {order.paymentMethod === "mpesa" ? (
                <div className="grid gap-1 text-xs font-extrabold text-slate-600">
                  Payment status
                  <input type="hidden" name="paymentStatus" value={order.paymentStatus} />
                  <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500">
                    {label(order.paymentStatus)} · managed by Daraja
                  </div>
                </div>
              ) : (
                <SelectField
                  name="paymentStatus"
                  label="Payment status"
                  defaultValue={order.paymentStatus}
                  options={paymentStatuses.map((status) => ({
                    value: status,
                    label: label(status)
                  }))}
                />
              )}
            </div>
            <TextInput
              name="changeReason"
              label="Reason (required for returns or refunds)"
              placeholder="Customer return accepted, refund approved..."
            />
            <AdminSubmitButton
              confirmKind="order"
              pendingLabel="Updating order..."
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white transition hover:bg-[#0f8d3d]"
            >
              <Save className="h-4 w-4" />
              Update order
            </AdminSubmitButton>
          </form>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              COD payment & cancellation
            </p>

            {canConfirmCodPayment ? (
              <form action={confirmCodPayment}>
                <input type="hidden" name="orderId" value={order.id} />
                <AdminSubmitButton
                  confirmMessage="Confirm Cash on Delivery payment was collected for this delivered order?"
                  pendingLabel="Confirming COD payment..."
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white transition hover:bg-[#0f8d3d]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark COD as paid
                </AdminSubmitButton>
              </form>
            ) : (
              <p className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                COD payment confirmation becomes available after the order is
                marked delivered.
              </p>
            )}

            {canCancelOrder && (
              <form action={cancelOrder} className="grid gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <TextInput
                  name="cancelReason"
                  label="Cancellation reason"
                  placeholder="Customer cancelled, unreachable, duplicate order..."
                />
                <AdminSubmitButton
                  confirmMessage="Cancel this unpaid order and release reserved stock? This cannot be undone from this shortcut."
                  pendingLabel="Cancelling order..."
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-extrabold text-red-600 transition hover:bg-red-100"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel & release stock
                </AdminSubmitButton>
              </form>
            )}
          </div>

          {availableFulfillmentStatuses.length > 0 ? (
          <details className="rounded-2xl border border-slate-200 p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-[var(--color-navy)]">
              <Truck className="h-4 w-4 text-[var(--color-green)]" />
              Add fulfilment / tracking
            </summary>
            <form action={createFulfillment} className="mt-4 grid gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput
                  name="courierName"
                  label="Courier"
                  required
                  placeholder="Fargo Courier"
                />
                <TextInput
                  name="trackingNumber"
                  label="Tracking number"
                  placeholder="Optional"
                />
              </div>
              <SelectField
                name="fulfillmentStatus"
                label="Fulfilment status"
                defaultValue={availableFulfillmentStatuses[0]!}
                options={availableFulfillmentStatuses.map((status) => ({
                  value: status,
                  label: label(status)
                }))}
              />
              <TextArea
                name="notes"
                label="Notes"
                rows={2}
                placeholder="Packed by Jane, fragile item, rider called..."
              />
              <AdminSubmitButton
                pendingLabel="Saving fulfilment..."
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-navy)] px-4 text-xs font-extrabold text-white transition hover:bg-[#12366d]"
              >
                <Truck className="h-4 w-4" />
                Save fulfilment
              </AdminSubmitButton>
            </form>
          </details>
          ) : (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-500">
              This order has reached a terminal state. No further fulfilment
              transition is available.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function Badge({
  children,
  tone = "slate"
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "orange" | "red";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-500",
    green: "bg-green-50 text-[var(--color-green)]",
    orange: "bg-orange-50 text-[var(--color-orange)]",
    red: "bg-red-50 text-red-600"
  };

  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${colors[tone]}`}>
      {children}
    </span>
  );
}

function Metric({
  label: metricLabel,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <strong className="font-brand block text-lg font-black text-[var(--color-navy)]">
        {value}
      </strong>
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {metricLabel}
      </span>
    </div>
  );
}
