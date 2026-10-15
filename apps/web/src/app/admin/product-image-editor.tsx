"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { productImageFrameRect, type ProductImageFit } from "@/lib/product-image-framing";

type PrepareProductImage = () => Promise<File | null>;
export const ProductImagePreparationContext = createContext<
  ((prepare: PrepareProductImage | null) => void) | null
>(null);

const outputWidth = 1200;
const outputHeight = 900;

export function ProductImageEditor({ currentImageUrl }: { currentImageUrl?: string | null }) {
  const registerPreparation = useContext(ProductImagePreparationContext);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState(currentImageUrl ?? "");
  const [loadedVersion, setLoadedVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fit, setFit] = useState<ProductImageFit>("contain");
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const [framingChanged, setFramingChanged] = useState(false);

  const draw = useCallback((canvas: HTMLCanvasElement, image: HTMLImageElement) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the image preview.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const rect = productImageFrameRect({
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
      frameWidth: canvas.width,
      frameHeight: canvas.height,
      fit,
      zoom,
      horizontal,
      vertical
    });
    context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  }, [fit, zoom, horizontal, vertical]);

  useEffect(() => {
    loadedImageRef.current = null;
    if (!sourceUrl) return;

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      loadedImageRef.current = image;
      setLoadError(null);
      setLoadedVersion((version) => version + 1);
    };
    image.onerror = () => {
      if (cancelled) return;
      loadedImageRef.current = null;
      setLoadError("This image cannot be previewed for cropping. Upload the original file or save its URL without changing the frame.");
    };
    image.src = sourceUrl;

    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  useEffect(() => {
    if (loadedImageRef.current && previewRef.current) {
      draw(previewRef.current, loadedImageRef.current);
    }
  }, [draw, loadedVersion]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const prepareImage = useCallback(async () => {
    if (!framingChanged) return null;
    const image = loadedImageRef.current;
    if (!image) throw new Error("Wait for the image preview to load before saving its framing.");

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    draw(canvas, image);

    const blob = await new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("The image could not be exported. Upload the original file and try again.")),
          "image/webp",
          0.88
        );
      } catch {
        reject(new Error("This image host does not allow cropping in the browser. Upload the original file instead."));
      }
    });
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error("The framed image is over 5MB. Try a smaller source image.");
    }
    return new File([blob], "talomart-product-framed.webp", { type: "image/webp" });
  }, [draw, framingChanged]);

  useEffect(() => {
    registerPreparation?.(prepareImage);
    return () => registerPreparation?.(null);
  }, [prepareImage, registerPreparation]);

  function changeSource(file: File | undefined) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = file ? URL.createObjectURL(file) : null;
    setSourceUrl(objectUrlRef.current ?? currentImageUrl ?? "");
  }

  function changeFraming(update: () => void) {
    update();
    setFramingChanged(true);
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div>
        <p className="text-xs font-extrabold text-slate-600">Customer-facing product frame · 4:3</p>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {sourceUrl ? (
            <canvas
              ref={previewRef}
              width={800}
              height={600}
              role="img"
              aria-label="Preview of the product image framing"
              className="aspect-[4/3] h-auto w-full"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-sm text-slate-400">Choose an image to preview</div>
          )}
        </div>
        {loadError && <p role="alert" className="mt-2 text-xs font-bold text-red-700">{loadError}</p>}
        <p className="mt-2 text-xs leading-5 text-slate-500">
          The store shows the full photo by default. Framing changes are rendered into a new WebP image when you save; the original source is not overwritten.
        </p>
      </div>

      <div className="grid content-start gap-4">
        <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
          Upload image
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => changeSource(event.currentTarget.files?.[0])}
            className="w-full min-w-0 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-[var(--color-navy)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-green)] file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-white"
          />
        </label>
        <label className="grid min-w-0 gap-1 text-xs font-extrabold text-slate-600">
          Or paste image URL
          <input
            name="imageUrl"
            type="url"
            defaultValue={currentImageUrl ?? ""}
            placeholder="https://..."
            onBlur={(event) => {
              if (!objectUrlRef.current) setSourceUrl(event.currentTarget.value.trim());
            }}
            className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-[var(--color-navy)]"
          />
        </label>

        <fieldset className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <legend className="px-1 text-xs font-extrabold text-slate-600">Resize or crop for product cards</legend>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <label className="flex items-center gap-2"><input type="radio" name="productImageFit" checked={fit === "contain"} onChange={() => changeFraming(() => setFit("contain"))} /> Fit full image</label>
            <label className="flex items-center gap-2"><input type="radio" name="productImageFit" checked={fit === "cover"} onChange={() => changeFraming(() => setFit("cover"))} /> Crop to fill</label>
          </div>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Zoom · {Math.round(zoom * 100)}%
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => changeFraming(() => setZoom(Number(event.currentTarget.value)))} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Move left / right
            <input type="range" min="0" max="100" value={horizontal} onChange={(event) => changeFraming(() => setHorizontal(Number(event.currentTarget.value)))} />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Move up / down
            <input type="range" min="0" max="100" value={vertical} onChange={(event) => changeFraming(() => setVertical(Number(event.currentTarget.value)))} />
          </label>
          {framingChanged && <p className="text-xs font-bold text-green-700">This framing will be applied when you save the product.</p>}
        </fieldset>
      </div>
    </div>
  );
}
