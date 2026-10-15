"use client";

import { useEffect, useRef, useState } from "react";

import {
  matchSkuFromImageFilename,
  validateImageFile
} from "@/lib/product-image-upload";

type ProductChoice = {
  sku: string;
  name: string;
  imageUrl: string | null;
};

type UploadRow = {
  id: string;
  file: File;
  previewUrl: string;
  sku: string;
  replaceExisting: boolean;
  status: "ready" | "uploading" | "done" | "failed";
  error: string | null;
};

export function ProductImageBatch({ products }: { products: ProductChoice[] }) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [running, setRunning] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [uploadedSkus, setUploadedSkus] = useState<string[]>([]);
  const previewUrls = useRef<string[]>([]);
  const productBySku = new Map(products.map((product) => [product.sku, product]));

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    if (rows.filter((row) => row.status !== "done").length + files.length > 50) {
      setBatchError("Select up to 50 pending images per batch. Clear completed uploads before selecting more.");
      return;
    }
    setBatchError(null);
    const newRows = Array.from(files).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.push(previewUrl);
      return {
        id: crypto.randomUUID(),
        file,
        previewUrl,
        sku: matchSkuFromImageFilename(file.name, products.map((product) => product.sku)),
        replaceExisting: false,
        status: "ready" as const,
        error: validateImageFile(file)
      };
    });
    setRows((current) => [...current, ...newRows]);
  }

  function changeRow(id: string, changes: Partial<UploadRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  function removeRow(id: string) {
    setRows((current) => {
      const row = current.find((item) => item.id === id);
      if (row) {
        URL.revokeObjectURL(row.previewUrl);
        previewUrls.current = previewUrls.current.filter((url) => url !== row.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  const duplicateSkus = new Set(
    rows.filter((row) => row.status !== "done")
      .map((row) => row.sku)
      .filter((sku, index, skus) => sku && skus.indexOf(sku) !== index)
  );
  const pending = rows.filter((row) => row.status !== "done");
  const ready = pending.length > 0 && pending.every((row) => {
    const product = productBySku.get(row.sku);
    return product && !validateImageFile(row.file) && !duplicateSkus.has(row.sku) &&
      (!(product.imageUrl || uploadedSkus.includes(row.sku)) || row.replaceExisting);
  });

  async function upload() {
    if (!ready || running) return;
    setRunning(true);
    setBatchError(null);

    for (const row of pending) {
      changeRow(row.id, { status: "uploading", error: null });
      const form = new FormData();
      form.set("sku", row.sku);
      form.set("image", row.file);
      form.set("replaceExisting", String(row.replaceExisting));
      try {
        const response = await fetch("/api/admin/products/images", {
          method: "POST",
          body: form,
          credentials: "same-origin"
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) {
          if (response.status === 429) {
            changeRow(row.id, { status: "failed", error: result.error ?? "Rate limit reached." });
            setBatchError("Upload paused at the administrator rate limit. Wait one minute, then retry the remaining images.");
            break;
          }
          if (response.status === 409) {
            setUploadedSkus((current) => [...current, row.sku]);
          }
          throw new Error(result.error ?? "Upload failed.");
        }
        changeRow(row.id, { status: "done", error: null });
        setUploadedSkus((current) => [...current, row.sku]);
      } catch (error) {
        changeRow(row.id, {
          status: "failed",
          error: error instanceof Error ? error.message : "Upload failed."
        });
      }
    }
    setRunning(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-extrabold text-[var(--color-navy)]" htmlFor="product-image-files">
          Select product images
        </label>
        <p className="mt-1 text-sm text-slate-600">
          JPG, PNG, WebP or AVIF, under 5MB each. Name files with the product SKU
          (for example TLM-INV-0015.webp) to match automatically, or select a product below.
        </p>
        <input
          id="product-image-files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={running}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
          className="mt-4 block w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
        {batchError && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{batchError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-700">
              {rows.filter((row) => row.status === "done").length} of {rows.length} uploaded
            </p>
            <button
              type="button"
              onClick={upload}
              disabled={!ready || running}
              className="min-h-11 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? "Uploading one image at a time…" : "Upload reviewed images"}
            </button>
            {rows.some((row) => row.status === "done") && !running && (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((row) => row.status !== "done"))}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700"
              >
                Clear completed
              </button>
            )}
          </div>

          {rows.map((row) => {
            const product = productBySku.get(row.sku);
            const conflict = duplicateSkus.has(row.sku);
            return (
              <div key={row.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[96px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.previewUrl} alt="Selected product upload preview" className="h-24 w-24 rounded-xl border border-slate-100 object-contain" />
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="break-all text-sm font-bold text-[var(--color-navy)]">{row.file.name}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">{row.status}</span>
                      {row.status !== "done" && (
                        <button type="button" disabled={running} onClick={() => removeRow(row.id)} className="text-xs font-bold text-red-700 disabled:opacity-50">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <label className="block text-xs font-bold text-slate-600">
                    Match to product
                    <select
                      value={row.sku}
                      disabled={running || row.status === "done"}
                      onChange={(event) => changeRow(row.id, { sku: event.target.value, error: null })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[var(--color-navy)]"
                    >
                      <option value="">Select a SKU</option>
                      {products.map((item) => <option key={item.sku} value={item.sku}>{item.sku} — {item.name}</option>)}
                    </select>
                  </label>
                  {(product?.imageUrl || uploadedSkus.includes(row.sku)) && row.status !== "done" && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                      <input
                        type="checkbox"
                        checked={row.replaceExisting}
                        disabled={running}
                        onChange={(event) => changeRow(row.id, { replaceExisting: event.target.checked })}
                      />
                      Replace this product’s existing primary image
                    </label>
                  )}
                  {(row.error || conflict) && (
                    <p role="alert" className="text-xs font-bold text-red-700">
                      {row.error ?? "Two selected images point to the same SKU. Choose one per batch."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
