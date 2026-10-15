/** Only route our own public storage images through the Next image optimizer. */
export function canOptimizeStoreImage(source: string): boolean {
  if (source.startsWith("/images/") || source.startsWith("/talomart-")) return true;

  const storageHost = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_HOST;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "product-images";
  if (!storageHost) return false;

  try {
    const url = new URL(source);
    return url.protocol === "https:"
      && url.hostname === storageHost
      && url.pathname.startsWith(`/storage/v1/object/public/${bucket}/`);
  } catch {
    return false;
  }
}
