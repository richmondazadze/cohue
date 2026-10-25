import { defineConfig } from "drizzle-kit";

// Migrations use the direct connection when supplied; runtime uses the pooled DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL || "",
  },
});
