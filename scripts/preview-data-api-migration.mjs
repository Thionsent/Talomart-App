import { readFileSync } from "node:fs";
import postgres from "postgres";
import { checkDataApiSecurity } from "./lib/check-data-api-security.mjs";

const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_DIRECT_URL or DATABASE_URL is required");
const sql = postgres(url, { max: 1, connect_timeout: 10, prepare: false, onnotice: () => {} });
const rollback = new Error("PREVIEW_ROLLBACK");
try {
  await sql.begin(async (transaction) => {
    await transaction`SET LOCAL lock_timeout = '3s'`;
    await transaction`SET LOCAL statement_timeout = '30s'`;
    await transaction.unsafe(readFileSync(new URL(
      "../packages/db/drizzle/0016_private_data_api.sql", import.meta.url
    ), "utf8"));
    const failures = await checkDataApiSecurity(transaction);
    if (failures.length) throw new Error(failures.join("; "));
    // Negative controls: catch column-only grants and RLS drift, including on
    // empty tables. These temporary changes are rolled back with the preview.
    await transaction`GRANT SELECT (password) ON public.account TO anon`;
    await transaction`ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY`;
    const regressions = await checkDataApiSecurity(transaction);
    if (!regressions.includes('API privileges remain: anon on account') ||
        !regressions.includes('RLS disabled: categories')) {
      throw new Error('Security checker failed its negative controls');
    }
    // Reapplication must also succeed without introducing grants or policies.
    await transaction.unsafe(readFileSync(new URL(
      "../packages/db/drizzle/0016_private_data_api.sql", import.meta.url
    ), "utf8"));
    const repaired = await checkDataApiSecurity(transaction);
    if (repaired.length) throw new Error(repaired.join('; '));
    throw rollback;
  });
} catch (error) {
  if (error === rollback) {
    console.log("Migration preview passed: RLS, effective privileges, both API role probes and server role checked; negative controls and reapplication passed. All migration changes rolled back; live database is NOT remediated.");
  } else {
    console.error(`Migration preview failed and rolled back: ${error.code ?? error.message}`);
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
