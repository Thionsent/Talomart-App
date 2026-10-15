ALTER TABLE "products" ADD COLUMN "archived_at" timestamp with time zone;
CREATE INDEX "product_archived_at_idx" ON "products" USING btree ("archived_at");

-- Preserve explicitly archived products while keeping unpublished imports as drafts.
UPDATE "products" AS p
SET "archived_at" = a."archived_at"
FROM (
  SELECT "resource_id", max("created_at") AS "archived_at"
  FROM "admin_audit_logs"
  WHERE "resource_type" = 'product' AND "action" = 'product.archive'
  GROUP BY "resource_id"
) AS a
WHERE p."id"::text = a."resource_id"
  AND p."is_active" = false
  AND p."archived_at" IS NULL;
