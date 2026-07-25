import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Next dev reloads modules on every edit; without a global singleton each
 * reload would open a fresh pool and exhaust Postgres connections.
 */
const globalForDb = globalThis as unknown as { __veloce_pool?: Pool };

const pool =
  globalForDb.__veloce_pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__veloce_pool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
