export const productImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif"
] as const;

export const productImageMaxBytes = 5 * 1024 * 1024;

export function matchSkuFromImageFilename(
  filename: string,
  skus: readonly string[]
) {
  const basename = filename.replace(/\.[^.]+$/, "").toLowerCase();
  return (
    skus.find((sku) => {
      const lowerSku = sku.toLowerCase();
      return (
        basename === lowerSku ||
        (basename.startsWith(lowerSku) &&
          /^[._\s-]/.test(basename.slice(lowerSku.length)))
      );
    }) ?? ""
  );
}

export function validateImageFile(file: Pick<File, "size" | "type">) {
  if (!productImageTypes.includes(file.type as (typeof productImageTypes)[number])) {
    return "Use a JPG, PNG, WebP or AVIF image.";
  }
  if (file.size < 1 || file.size > productImageMaxBytes) {
    return "Each image must be larger than zero and under 5MB.";
  }
  return null;
}

export async function hasMatchingImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));

  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 && ascii(1, 4) === "PNG" &&
      bytes[4] === 0x0d && bytes[5] === 0x0a
    );
  }
  if (file.type === "image/webp") {
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  }
  if (file.type === "image/avif") {
    return ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
  }
  return false;
}
