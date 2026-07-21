"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => globalThis.print()}
      className="rounded-xl bg-[var(--color-green)] px-5 py-3 text-sm font-extrabold text-white"
    >
      {label}
    </button>
  );
}
