export type ProductImageFit = "contain" | "cover";

export function productImageFrameRect({
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  fit,
  zoom,
  horizontal,
  vertical
}: {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  fit: ProductImageFit;
  zoom: number;
  horizontal: number;
  vertical: number;
}) {
  if ([imageWidth, imageHeight, frameWidth, frameHeight].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("The image dimensions are invalid.");
  }

  const baseScale = fit === "contain"
    ? Math.min(frameWidth / imageWidth, frameHeight / imageHeight)
    : Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
  const scale = baseScale * Math.max(1, Math.min(3, zoom));
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const horizontalPosition = Math.max(0, Math.min(100, horizontal));
  const verticalPosition = Math.max(0, Math.min(100, vertical));

  return {
    x: horizontalPosition === 0 ? 0 : (frameWidth - width) * horizontalPosition / 100,
    y: verticalPosition === 0 ? 0 : (frameHeight - height) * verticalPosition / 100,
    width,
    height
  };
}
