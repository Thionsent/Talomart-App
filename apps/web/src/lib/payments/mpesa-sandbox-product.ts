export const MPESA_SANDBOX_TEST_PRODUCT_SKU = "TLM-SBX-MPESA-5";
export const MPESA_SANDBOX_TEST_PRODUCT_SLUG = "mpesa-sandbox-checkout-test-5";

export function isMpesaSandboxTestSku(sku: string) {
  return sku === MPESA_SANDBOX_TEST_PRODUCT_SKU;
}

export function isMpesaSandboxTestCart(
  products: ReadonlyArray<{ slug: string }>
) {
  return (
    products.length > 0 &&
    products.every(
      (product) => product.slug === MPESA_SANDBOX_TEST_PRODUCT_SLUG
    )
  );
}

