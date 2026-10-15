import postgres from "postgres";

const apply = process.argv.includes("--apply");

async function main() {
  const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Database URL required.");
  const db = postgres(url, { prepare: false, connect_timeout: 10 });
  try {
    const rows = await db`
      select sku, specifications #>> '{}' as value
      from products
      where jsonb_typeof(specifications) = 'string'
      order by sku
    `;
    for (const row of rows) {
      const parsed = JSON.parse(row.value);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
          Object.values(parsed).some((value) => typeof value !== "string")) {
        throw new Error(`Unexpected specification format for ${row.sku}; no records changed.`);
      }
    }
    console.log(JSON.stringify({ convertible: rows.length, skus: rows.map((row) => row.sku) }));
    if (!apply || !rows.length) return;

    const updated = await db.begin(async (tx) => {
      const repaired = await tx`
        update products
        set specifications = (specifications #>> '{}')::jsonb,
            updated_at = now()
        where jsonb_typeof(specifications) = 'string'
        returning sku
      `;
      if (repaired.length !== rows.length) throw new Error("Specification count changed during repair; transaction rolled back.");
      await tx`
        insert into admin_audit_logs (actor_id, actor_role, action, resource_type, summary, after)
        values (null, 'admin', 'product.specifications_repair', 'product_batch',
          ${`Converted ${repaired.length} JSON-text product specifications to JSON objects`},
          ${db.json({ skus: repaired.map((row) => row.sku) })}::jsonb)
      `;
      return repaired.length;
    });
    console.log(`Repaired ${updated} products.`);
  } finally {
    await db.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
