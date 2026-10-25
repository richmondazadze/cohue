import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("deployment dispatcher configuration", () => {
  it("normalizes incidental surrounding whitespace like other environment settings", async () => {
    vi.stubEnv("DISPATCHER_MODE", "worker\n");
    const { env } = await import("@/server/config/env");
    expect(env().DISPATCHER_MODE).toBe("worker");
  });
  it("does not treat an unknown dispatcher mode as configured", async () => {
    vi.stubEnv("DISPATCHER_MODE", "unknown");
    const { env } = await import("@/server/config/env");
    expect(env().DISPATCHER_MODE).toBeUndefined();
  });
});
