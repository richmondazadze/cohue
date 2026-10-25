import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { required } from "../config/env";

// Bounded pool; TLS is required for remote hosts and skipped only for local development sockets.
let pool: Pool | undefined;
export function db(): Pool {
  if (!pool) {
    const url = required("DATABASE_URL");
    const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: local ? undefined : { rejectUnauthorized: true },
    });
  }
  return pool;
}
export type Tx = PoolClient;
export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: Pool | PoolClient = db(),
): Promise<T[]> {
  return (await client.query<T>(sql, params)).rows;
}
export async function transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
