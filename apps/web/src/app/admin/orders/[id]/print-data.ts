import { adminAuth } from "@/lib/auth";
import { sql } from "@talomart/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export type PrintOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotalMinor: number;
  deliveryMinor: number;
  discountMinor: number;
  totalMinor: number;
  recipientName: string;
  phone: string;
  county: string;
  town: string;
  deliveryAddress: string;
  customerNote: string | null;
  placedAt: string;
  items: {
    productName: string;
    sku: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }[];
  fulfillments: {
    courierName: string;
    trackingNumber: string | null;
    status: string;
    createdAt: string;
  }[];
};

export async function requirePrintableOrder(orderId: string) {
  const session = await adminAuth.api.getSession({
    headers: await headers()
  });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session) redirect("/admin/sign-in");
  if (role !== "admin" && role !== "staff") redirect("/admin");

  const [order] = await sql<PrintOrder[]>`
    select
      o.id::text,
      o.order_number as "orderNumber",
      o.status,
      coalesce(p.status, 'pending') as "paymentStatus",
      o.payment_method as "paymentMethod",
      o.subtotal_minor as "subtotalMinor",
      o.delivery_minor as "deliveryMinor",
      o.discount_minor as "discountMinor",
      o.total_minor as "totalMinor",
      o.recipient_name as "recipientName",
      o.phone,
      o.county,
      o.town,
      o.delivery_address as "deliveryAddress",
      o.customer_note as "customerNote",
      o.placed_at::text as "placedAt",
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'productName', oi.product_name,
              'sku', oi.sku,
              'quantity', oi.quantity,
              'unitPriceMinor', oi.unit_price_minor,
              'lineTotalMinor', oi.line_total_minor
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
    where o.id = ${orderId}::uuid
    limit 1
  `;

  if (!order) notFound();

  return order;
}

export function formatMoney(minor: number) {
  return `KSh ${new Intl.NumberFormat("en-KE").format(Math.round(minor / 100))}`;
}

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function label(value: string) {
  return value.replace(/_/g, " ");
}
