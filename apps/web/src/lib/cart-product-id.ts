const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEMO_PRODUCT_ID_PATTERN = /^demo-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isUuidCartProductId(productId: string) {
  return UUID_PATTERN.test(productId);
}

export function isDemoCartProductId(productId: string) {
  return (
    productId.length <= 128 && DEMO_PRODUCT_ID_PATTERN.test(productId)
  );
}

export function isSupportedCartProductId(productId: string) {
  return isUuidCartProductId(productId);
}
