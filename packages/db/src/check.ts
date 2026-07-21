import { sql } from "./index";

async function checkDatabase() {
  const [database] = await sql<
    {
      databaseName: string;
      serverTime: Date;
      categories: number;
      products: number;
    }[]
  >`
    select
      current_database() as "databaseName",
      now() as "serverTime",
      (select count(*)::int from categories) as categories,
      (select count(*)::int from products) as products
  `;

  console.info("Database connection healthy.", database);
}

try {
  await checkDatabase();
} catch (error) {
  console.error("Database health check failed.", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
