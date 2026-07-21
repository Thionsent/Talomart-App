import Link from "next/link";

import { PrintButton } from "../print-button";
import {
  dateLabel,
  label,
  requirePrintableOrder
} from "../print-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Packing slip" };

type PackingSlipPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PackingSlipPage({ params }: PackingSlipPageProps) {
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
          <PrintButton label="Print packing slip" />
        </div>

        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-black tracking-[0.25em] text-[var(--color-green)]">
            TALOMART STORES
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-brand text-4xl font-black">Packing slip</h1>
              <p className="mt-2 text-sm text-slate-500">
                Pick, pack and dispatch checklist.
              </p>
            </div>
            <div className="text-sm md:text-right">
              <p className="font-black">{order.orderNumber}</p>
              <p className="mt-1 text-slate-500">{dateLabel(order.placedAt)}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-3">
          <div>
            <h2 className="font-brand text-lg font-extrabold">Recipient</h2>
            <p className="mt-3 font-bold">{order.recipientName}</p>
            <p className="text-sm text-slate-500">{order.phone}</p>
          </div>
          <div>
            <h2 className="font-brand text-lg font-extrabold">Delivery</h2>
            <p className="mt-3 text-sm text-slate-500">
              {order.deliveryAddress}
            </p>
            <p className="text-sm text-slate-500">
              {order.town}, {order.county}
            </p>
          </div>
          <div>
            <h2 className="font-brand text-lg font-extrabold">Courier</h2>
            <p className="mt-3 text-sm text-slate-500">
              {latestFulfillment?.courierName ?? "Not assigned"}
            </p>
            <p className="text-sm text-slate-500">
              Tracking: {latestFulfillment?.trackingNumber ?? "Pending"}
            </p>
            <p className="text-sm text-slate-500">
              Status: {label(latestFulfillment?.status ?? order.status)}
            </p>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="font-brand text-xl font-extrabold">Pick list</h2>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-3">Picked</th>
                <th className="py-3">Item</th>
                <th className="py-3">SKU</th>
                <th className="py-3 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.sku} className="border-b border-slate-100">
                  <td className="py-4">
                    <span className="inline-block h-5 w-5 rounded border border-slate-400" />
                  </td>
                  <td className="py-4 font-bold">{item.productName}</td>
                  <td className="py-4 text-slate-500">{item.sku}</td>
                  <td className="py-4 text-right text-lg font-black">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {["Picked by", "Packed by", "Dispatched by"].map((labelText) => (
            <div key={labelText} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase text-slate-400">
                {labelText}
              </p>
              <div className="mt-10 border-b border-slate-300" />
              <p className="mt-2 text-xs text-slate-400">Name / signature</p>
            </div>
          ))}
        </section>

        {order.customerNote && (
          <section className="mt-6 rounded-2xl bg-orange-50 p-4 text-sm">
            <strong>Customer note:</strong> {order.customerNote}
          </section>
        )}
      </div>
    </main>
  );
}
