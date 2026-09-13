import 'dotenv/config';
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
    ssl: { rejectUnauthorized: false }, // allow self‑signed certs in dev
  });
} catch (e) {
  console.warn("Failed to create secure DB pool, falling back to insecure connection:", e);
  // fallback without SSL (may still work for local dev)
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

export const db = drizzle(pool, { schema });
