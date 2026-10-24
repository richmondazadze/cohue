import { writeFileSync } from "node:fs";
import { apiContracts, CONTRACT_VERSION } from "../src/contracts";
// Navigation manifest only; the executable Zod definitions remain authoritative.
const operations = Object.entries(apiContracts).map(
  ([name, { method, path, auth, status, idempotentCommand }]) => ({
    name,
    method,
    path,
    auth,
    status,
    idempotentCommand,
  }),
);
writeFileSync(
  "docs/API_OPERATIONS.json",
  JSON.stringify({ contractVersion: CONTRACT_VERSION, operations }, null, 2) +
    "\n",
);
console.log(`Exported ${operations.length} API operations.`);
