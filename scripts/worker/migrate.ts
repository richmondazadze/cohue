import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// Applies drizzle/*.sql in order inside one transaction each; records applied files.
try {
  process.loadEnvFile(".env.local");
} catch {}
const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Missing server configuration: DATABASE_URL");
const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const client = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });
await client.connect();
try {
  await client.query(
    "CREATE TABLE IF NOT EXISTS cohue_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const done = new Set((await client.query("SELECT name FROM cohue_migrations")).rows.map((r) => r.name));
  const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const statements = readFileSync(join("drizzle", file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    await client.query("BEGIN");
    try {
      for (const statement of statements) await client.query(statement);
      await client.query("INSERT INTO cohue_migrations(name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file} (${statements.length} statements)`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  console.log(`migrations current: ${files.length} file(s)`);
} finally {
  await client.end();
}
