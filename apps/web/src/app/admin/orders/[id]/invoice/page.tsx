import Link from "next/link";

import {
  dateLabel,
  formatMoney,
  label,
  requirePrintableOrder
} from "../print-data";
import { PrintButton } from "../print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

type InvoicePageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const order = await requirePrintableOrder(id);
  const latestFulfillment = order.fulfillments[0];

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-[var(--color-navy)] print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm print:rounded-none print:shadow-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link href="/admin#orders" className="text-sm font-extrabold text-[var(--color-green)]">
            ← Back to admin
          </Link>
          <PrintButton label="Print invoice" />
        </div>

        <header className="flex flex-col gap-6 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-[var(--color-green)]">
              TALOMART STORES
            </p>
            <h1 className="font-brand mt-3 text-4xl font-black">Invoice</h1>
            <p className="mt-2 text-sm text-slate-500">
              Electrical accessories and mobile gear.
            </p>
          </div>
          <div className="text-sm md:text-right">
            <p className="font-black">{order.orderNumber}</p>
            <p className="mt-1 text-slate-500">{dateLabel(order.placedAt)}</p>
            <p className="mt-1 text-slate-500">
              Payment: {label(order.paymentStatus)}
            </p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
          <div>
            <h2 className="font-brand text-lg font-extrabold">Bill to</h2>
            <p className="mt-3 font-bold">{order.recipientName}</p>
            <p className="text-sm text-slate-500">{order.phone}</p>
            <p className="text-sm text-slate-500">
              {order.deliveryAddress}, {order.town}, {order.county}
            </p>
          </div>
          <div>
            <h2 className="font-brand text-lg font-extrabold">Fulfilment</h2>
            <p className="mt-3 text-sm text-slate-500">
              Status: <strong>{label(order.status)}</strong>
            </p>
            <p className="text-sm text-slate-500">
              Courier: {latestFulfillment?.courierName ?? "Not assigned"}
            </p>
            <p className="text-sm text-slate-500">
              Tracking: {latestFulfillment?.trackingNumber ?? "Pending"}
            </p>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-3">Item</th>
              <th className="py-3">SKU</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Unit</th>
              <th className="py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.sku} className="border-b border-slate-100">
                <td className="py-3 font-bold">{item.productName}</td>
                <td className="py-3 text-slate-500">{item.sku}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">{formatMoney(item.unitPriceMinor)}</td>
                <td className="py-3 text-right font-bold">{formatMoney(item.lineTotalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <strong>{formatMoney(order.subtotalMinor)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <strong>{formatMoney(order.deliveryMinor)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <strong>{formatMoney(order.discountMinor)}</strong>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg">
            <span>Total</span>
            <strong>{formatMoney(order.totalMinor)}</strong>
          </div>
        </section>

        <footer className="mt-10 rounded-2xl bg-slate-50 p-4 text-center text-xs text-slate-500">
          Thank you for shopping with Talomart Stores. Powering your connections.
        </footer>
      </div>
    </main>
  );
}
