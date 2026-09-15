import { sql } from "./index";

const sandboxSku = "TLM-SBX-MPESA-5";
const sandboxSlug = "mpesa-sandbox-checkout-test-5";
const mode = process.argv[2] ?? "ensure";

async function ensureSandboxProduct() {
  const [product] = await sql<
    { id: string; name: string; priceKes: number; stockQuantity: number }[]
  >`
    insert into products (
      category_id,
      sku,
      name,
      slug,
      short_description,
      description,
      price_minor,
      compare_at_price_minor,
      stock_quantity,
      low_stock_threshold,
      is_active,
      is_featured,
      specifications
    )
    select
      c.id,
      ${sandboxSku},
      'M-Pesa Sandbox Checkout Test (KSh 5)',
      ${sandboxSlug},
      'A KSh 5 test item for verifying Daraja sandbox payment callbacks.',
      'Sandbox testing only. This product must be disabled before production launch.',
      500,
      null,
      100,
      5,
      true,
      true,
      ${JSON.stringify({
        Purpose: "Daraja sandbox callback testing",
        Payment: "M-Pesa sandbox only",
        Fulfilment: "No physical fulfilment"
      })}::jsonb
    from categories c
    where c.slug = 'accessories'
      and c.is_active = true
    on conflict (sku)
    do update set
      name = excluded.name,
      slug = excluded.slug,
      short_description = excluded.short_description,
      description = excluded.description,
      price_minor = excluded.price_minor,
      compare_at_price_minor = excluded.compare_at_price_minor,
      stock_quantity = greatest(products.stock_quantity, excluded.stock_quantity),
      low_stock_threshold = excluded.low_stock_threshold,
      is_active = true,
      is_featured = true,
      specifications = excluded.specifications,
      updated_at = now()
    returning
      id::text,
      name,
      (price_minor / 100)::int as "priceKes",
      stock_quantity as "stockQuantity"
  `;

  if (!product) {
    throw new Error("The active accessories category is required.");
  }

  console.info("M-Pesa sandbox test product ready.", product);
}

async function disableSandboxProduct() {
  const rows = await sql<{ id: string; name: string }[]>`
    update products
    set is_active = false, is_featured = false, updated_at = now()
    where sku = ${sandboxSku}
    returning id::text, name
  `;

  console.info(`Disabled ${rows.length} M-Pesa sandbox test product(s).`);
}

try {
  if (process.env.MPESA_ENVIRONMENT !== "sandbox") {
    throw new Error(
      "M-Pesa sandbox test products can only be managed when MPESA_ENVIRONMENT=sandbox."
    );
  }

  if (mode === "ensure") await ensureSandboxProduct();
  else if (mode === "disable") await disableSandboxProduct();
  else throw new Error('Use mode "ensure" or "disable".');
} catch (error) {
  console.error("M-Pesa sandbox product management failed.", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
