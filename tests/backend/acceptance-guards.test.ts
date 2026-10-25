import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("operator acceptance opt-in guards", () => {
  for (const [script, flag, message] of [
    ["prove-d7.ts", "COHUE_D7_ACCEPTANCE", "Explicit D7 acceptance flag required"],
    ["privacy-smoke.ts", "COHUE_PRIVACY_ACCEPTANCE", "Explicit privacy acceptance flag required"],
  ]) it(`${script} refuses execution before DB/environment access without ${flag}`, () => {
    const env = { ...process.env };
    delete env[flag];
    const result = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "--conditions=react-server", `scripts/worker/${script}`], {
      env, encoding: "utf8", timeout: 10000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(message);
    expect(result.stdout).toBe("");
  });
});
