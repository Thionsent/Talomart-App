import { readFileSync } from "node:fs";

// Derive coverage from the source schema so a new table cannot be forgotten.
export const protectedTables = [...readFileSync(
  new URL("../../packages/db/src/schema/index.ts", import.meta.url), "utf8"
).matchAll(/pgTable\(\s*"([a-z_]+)"/g)].map((match) => match[1]);

export async function checkDataApiSecurity(sql) {
  const failures = [];
  const tables = await sql`
    SELECT c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity,
      pg_get_userbyid(c.relowner) AS owner
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  `;
  for (const name of protectedTables) {
    if (!tables.some((table) => table.relname === name)) failures.push(`missing table: ${name}`);
  }
  // Include unexpected live tables: schema drift must not hide an exposure.
  for (const table of tables) {
    if (!table.relrowsecurity) failures.push(`RLS disabled: ${table.relname}`);
    if (!protectedTables.includes(table.relname)) failures.push(`unreviewed public table: ${table.relname}`);
  }
  const roles = await sql`
    SELECT oid, rolname, rolbypassrls, rolsuper FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated')
  `;
  // Local vanilla PostgreSQL can lack these roles; that is not a successful
  // Supabase access check. Provision test roles in the test database first.
  for (const name of ['anon', 'authenticated']) {
    if (!roles.some((role) => role.rolname === name)) failures.push(`cannot verify missing API role: ${name}`);
  }
  const exposure = await sql`
    SELECT r.rolname, c.relname
    FROM pg_roles r CROSS JOIN pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE r.rolname IN ('anon', 'authenticated') AND n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (r.rolsuper OR r.rolbypassrls OR c.relowner = r.oid
        OR has_table_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'))
  `;
  for (const row of exposure) failures.push(`API privileges remain: ${row.rolname} on ${row.relname}`);
  const policies = await sql`
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ${sql(protectedTables)}
  `;
  for (const policy of policies) failures.push(`unexpected policy: ${policy.tablename}.${policy.policyname}`);
  const [runtime] = await sql`
    SELECT current_user AS name, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user
  `;
  if (!runtime.rolbypassrls && !runtime.rolsuper) {
    for (const table of tables) {
      if (table.owner !== runtime.name || table.relforcerowsecurity) {
        failures.push(`server role ${runtime.name} needs a reviewed policy for ${table.relname}`);
      }
    }
  }
  const serverDenied = await sql`
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ${sql(protectedTables)}
      AND NOT (has_table_privilege(current_user, c.oid, 'SELECT')
        AND has_table_privilege(current_user, c.oid, 'INSERT')
        AND has_table_privilege(current_user, c.oid, 'UPDATE')
        AND has_table_privilege(current_user, c.oid, 'DELETE'))
  `;
  for (const table of serverDenied) failures.push(`server privileges missing: ${table.relname}`);
  // Actually assume both API identities. LIMIT 0 checks authorization without
  // retrieving secrets or interpreting an empty table as evidence of safety.
  if (!failures.length) {
    for (const role of roles) {
      try {
        await sql.savepoint(async (probe) => {
          await probe.unsafe(`SET LOCAL ROLE "${role.rolname}"`);
          await probe.unsafe(`DO $$ DECLARE t text; BEGIN
            FOREACH t IN ARRAY ARRAY[${protectedTables.map((t) => `'${t}'`).join(',')}] LOOP
              BEGIN
                EXECUTE format('SELECT 1 FROM public.%I LIMIT 0', t);
                RAISE EXCEPTION 'API SELECT was allowed on %', t;
              EXCEPTION WHEN insufficient_privilege THEN NULL;
              END;
            END LOOP;
          END $$`);
          // Undo SET LOCAL ROLE without relying on caller role names.
          throw new Error('API_PROBE_ROLLBACK');
        });
      } catch (error) {
        if (error.message !== 'API_PROBE_ROLLBACK') {
          failures.push(`role probe failed for ${role.rolname}: ${error.code ?? error.name}`);
        }
      }
    }
  }
  return failures;
}
