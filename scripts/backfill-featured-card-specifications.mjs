import postgres from "postgres";

// Only facts visible on the supplied product photos or already recorded in
// the reviewed draft-import manifest. Never claim a manufacturer's warranty.
const updates = [
  {
    sku: "TLM-DRAFT-P001",
    expected: "legacy-characters",
    specifications: { Brand: "Aldeepo", Model: "AD-TW07", Type: "True-wireless earbuds", Colour: "White" }
  },
  {
    sku: "TLM-INV-0336",
    expected: "empty",
    specifications: { Output: "25W PD", Port: "USB-C" }
  },
  {
    sku: "TLM-INV-0308",
    expected: "empty",
    specifications: { Type: "Universal battery charger", "Contact style": "Adjustable pins" }
  }
];

async function main() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Database URL required.");
  const db = postgres(url, { prepare: false, connect_timeout: 10 });
  try {
    const rows = await db`select sku, specifications from products where sku = any(${updates.map((item) => item.sku)}::text[])`;
    if (rows.length !== updates.length) throw new Error("One or more featured products are missing; no changes made.");
    const sameSpecifications = (left, right) =>
      Object.keys(left).length === Object.keys(right).length &&
      Object.entries(right).every(([key, value]) => left[key] === value);
    const pending = updates.filter((item) => {
      const current = rows.find((row) => row.sku === item.sku)?.specifications;
      if (sameSpecifications(current, item.specifications)) return false;
      if (item.expected === "empty" && Object.keys(current).length === 0) return true;
      if (item.expected === "legacy-characters" && Object.prototype.hasOwnProperty.call(current, "0")) return true;
      throw new Error(`Specifications for ${item.sku} have changed; no records overwritten.`);
    });
    console.log(JSON.stringify({ toUpdate: pending.map((item) => item.sku) }));
    if (!process.argv.includes("--apply") || !pending.length) return;
    await db.begin(async (tx) => {
      for (const item of pending) {
        const current = rows.find((row) => row.sku === item.sku).specifications;
        const changed = await tx`update products set specifications = ${db.json(item.specifications)}::jsonb, updated_at = now() where sku = ${item.sku} and specifications = ${db.json(current)}::jsonb returning sku`;
        if (changed.length !== 1) throw new Error(`${item.sku} changed during backfill; transaction rolled back.`);
      }
      await tx`insert into admin_audit_logs (actor_id, actor_role, action, resource_type, summary, after) values (null, 'admin', 'product.specifications_backfill', 'product_batch', ${`Corrected/added verified specifications for ${pending.length} featured products`}, ${db.json({ skus: pending.map((item) => item.sku) })}::jsonb)`;
    });
    console.log(`Updated ${pending.length} featured products.`);
  } finally {
    await db.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
