import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export default defineConfig({
  out: "netlify/database/migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
