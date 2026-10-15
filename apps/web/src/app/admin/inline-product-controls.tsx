"use client";

import { Save } from "lucide-react";
import { useCallback, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { setProductFeaturedInline, updateProductInline } from "@/app/admin/actions";
import { ProductImagePreparationContext } from "@/app/admin/product-image-editor";

type Feedback = { ok: boolean; message: string } | null;

export function InlineProductEditorForm({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const prepareImageRef = useRef<(() => Promise<File | null>) | null>(null);
  const registerImagePreparation = useCallback((prepare: (() => Promise<File | null>) | null) => {
    prepareImageRef.current = prepare;
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFeedback(null);

    startTransition(async () => {
      try {
        const framedImage = await prepareImageRef.current?.();
        const selectedImage = formData.get("imageFile");
        const imageToUpload = framedImage ?? (
          selectedImage instanceof File && selectedImage.size > 0 ? selectedImage : null
        );
        // Keep binary files out of the Server Action request. The image upload
        // endpoint accepts multipart data; the product action only needs its URL.
        formData.delete("imageFile");
        if (imageToUpload) {
          const imageData = new FormData();
          imageData.set("productId", String(formData.get("productId") ?? ""));
          imageData.set("image", imageToUpload);
          const response = await fetch("/api/admin/products/editor-image", {
            method: "POST",
            body: imageData
          });
          const result: unknown = await response.json().catch(() => null);
          if (!response.ok || !result || typeof result !== "object" || !("imageUrl" in result) || typeof result.imageUrl !== "string") {
            const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
              ? result.error
              : "The image could not be uploaded. Please try again.";
            throw new Error(message);
          }
          formData.set("imageUrl", result.imageUrl);
        }
        setFeedback(await updateProductInline(formData));
      } catch (error) {
        setFeedback({
          ok: false,
          message: error instanceof Error ? error.message : "The product could not be saved. Please try again."
        });
      }
    });
  }

  return (
    <ProductImagePreparationContext.Provider value={registerImagePreparation}>
      <form onSubmit={submit} className="grid gap-4" aria-busy={pending}>
        {children}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 w-max items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {pending ? "Saving product..." : "Save product"}
          </button>
          {feedback && (
            <p role="status" className={`text-sm font-bold ${feedback.ok ? "text-green-700" : "text-red-700"}`}>
              {feedback.message}
            </p>
          )}
        </div>
      </form>
    </ProductImagePreparationContext.Provider>
  );
}

export function InlineFeaturedToggle({
  productId,
  initialFeatured,
  canFeature
}: {
  productId: string;
  initialFeatured: boolean;
  canFeature: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<({ ok: boolean; message: string; featured?: boolean | null } | null)>(null);
  const featured = feedback?.ok && typeof feedback.featured === "boolean"
    ? feedback.featured
    : initialFeatured;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("featured", featured ? "false" : "true");

    startTransition(async () => {
      try {
        setFeedback(await setProductFeaturedInline(formData));
      } catch {
        setFeedback({ ok: false, message: "Featured status could not be saved. Please try again." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1" aria-busy={pending}>
      <button
        type="submit"
        disabled={pending || (!featured && !canFeature)}
        className="inline-flex min-h-10 items-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-xs font-extrabold text-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : featured ? "Remove featured" : "Feature on homepage"}
      </button>
      {feedback && (
        <span role="status" className={`max-w-48 text-xs font-bold ${feedback.ok ? "text-green-700" : "text-red-700"}`}>
          {feedback.message}
        </span>
      )}
    </form>
  );
}
