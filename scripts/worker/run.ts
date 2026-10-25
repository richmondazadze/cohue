// DISPATCHER_MODE=worker: long-running leased-job loop. Run with: npm run worker
import { randomUUID } from "node:crypto";

try {
  process.loadEnvFile(".env.local");
} catch {}
const { drain } = await import("../../src/server/runner/steps");
const owner = randomUUID();
let stopping = false;
process.on("SIGINT", () => (stopping = true));
process.on("SIGTERM", () => (stopping = true));
console.log(`worker ${owner.slice(0, 8)} started`);
while (!stopping) {
  try {
    const processed = await drain(owner, 25, 20_000);
    if (processed) console.log(`${new Date().toISOString()} processed ${processed} job(s)`);
  } catch (error) {
    console.error("drain failed", error instanceof Error ? error.message : "unknown");
  }
  await new Promise((r) => setTimeout(r, 1000));
}
process.exit(0);
