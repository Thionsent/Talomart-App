import { drizzle } from "drizzle-orm/postgres-js";
import dotenv from "dotenv";
import postgres from "postgres";

import * as schema from "./schema";

dotenv.config({ path: ".env", quiet: true });
dotenv.config({ path: "../../.env", quiet: true });

const globalForDatabase = globalThis as unknown as {
  talomartSql?: ReturnType<typeof postgres>;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://talomart:talomart@localhost:5432/talomart";
const configuredMaxConnections = Number(
  process.env.TALOMART_DB_MAX_CONNECTIONS ?? 0
);
const maxConnections = Number.isInteger(configuredMaxConnections) && configuredMaxConnections > 0
  ? configuredMaxConnections
  : process.env.NODE_ENV === "production"
    ? 10
    : 5;

const sql =
  globalForDatabase.talomartSql ??
  postgres(connectionString, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.talomartSql = sql;
}

export const db = drizzle(sql, { schema });
export { sql };
