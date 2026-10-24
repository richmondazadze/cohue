import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const baseline = JSON.parse(
  readFileSync("docs/FOUNDATION_BASELINE.json", "utf8"),
);
for (const { path, sha256 } of baseline.canonicalDesignHashes)
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    sha256,
    `Canonical approved design changed: ${path}`,
  );
const approval = JSON.parse(
  readFileSync("docs/design/APPROVAL_V1.0.json", "utf8"),
);
for (const { path, sha256 } of approval.approvedSourceHashes)
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    sha256,
    `Frozen approved asset changed: ${path}`,
  );
assert.equal(
  readFileSync("CODEX_HANDOFF.md", "utf8"),
  readFileSync("CLAUDE_HANDOFF.md", "utf8"),
  "Handoffs must be synchronized",
);
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
for (const [name, version] of Object.entries({
  ...manifest.dependencies,
  ...manifest.devDependencies,
}))
  assert.match(
    version,
    /^\d+\.\d+\.\d+$/u,
    `Pin an exact stable version: ${name}`,
  );
assert.equal(
  manifest.dependencies.next.split(".")[0],
  "16",
  "Preserve approved Next major",
);
console.log(
  `Foundation integrity passed: ${approval.approvedSourceHashes.length} frozen design sources, synchronized handoffs, exact dependency pins.`,
);
