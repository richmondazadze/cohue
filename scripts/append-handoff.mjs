import {
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { resolve, relative } from "node:path";
import assert from "node:assert/strict";
const source = process.argv[2];
assert(
  source,
  "Usage: npm run handoff:append -- docs/status/<frontend|backend|lead>/<milestone>.md",
);
const path = relative(process.cwd(), resolve(source));
assert.match(
  path,
  /^docs\/status\/(frontend|backend|lead)\/[a-zA-Z0-9_-]+\.md$/u,
  "Use your owned milestone report path",
);
const note = readFileSync(path, "utf8").trim();
assert(
  note.length > 20,
  "Supply a substantive milestone with actual evidence and no secrets",
);
// Shared checkout: fail closed rather than overwrite another writer or mismatched handoffs.
const lock = ".handoff-update.lock";
const fd = openSync(lock, "wx");
try {
  writeFileSync(fd, `${process.pid}\n${new Date().toISOString()}\n`);
  const current = readFileSync("CODEX_HANDOFF.md", "utf8");
  assert.equal(
    current,
    readFileSync("CLAUDE_HANDOFF.md", "utf8"),
    "Stop and ask lead to reconcile mismatched handoffs",
  );
  const updated =
    current.replace(
      /^Last update:.*$/mu,
      `Last update: ${new Date().toISOString()} (America/Chicago display dates apply).`,
    ) + `\n\n## Milestone from ${path}\n\n${note}\n`;
  for (const target of ["CODEX_HANDOFF.md", "CLAUDE_HANDOFF.md"]) {
    const temporary = `${target}.tmp`;
    writeFileSync(temporary, updated);
    renameSync(temporary, target);
  }
  console.log(
    "Both handoffs updated under exclusive lock. Stage both with your owned milestone; do not stage unrelated work.",
  );
} finally {
  closeSync(fd);
  unlinkSync(lock);
}
