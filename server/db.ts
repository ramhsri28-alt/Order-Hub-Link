import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

let pool: pg.Pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} catch (e) {
  console.warn("Failed to create DB pool:", e);
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

export const db = drizzle(pool, { schema });
