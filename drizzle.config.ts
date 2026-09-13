import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "netlify/database/migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
});
