import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceMemoryKey, readDeviceMemory, writeDeviceMemory, type DeviceIdentity } from "@/client/local";

const principalA = "00000000-0000-4000-8000-000000000001";
const principalB = "00000000-0000-4000-8000-000000000002";
const live: DeviceIdentity = { principalId: principalA, scope: { executionMode: "LIVE", showcaseId: null } };
const showcase: DeviceIdentity = { principalId: principalA, scope: { executionMode: "SHOWCASE", showcaseId: "00000000-0000-4000-8000-000000000384" } };
const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("scoped device conveniences", () => {
  it("keeps live, each showcase and each principal separate", () => {
    writeDeviceMemory((m) => ({ ...m, participantId: "live-profile" }), live);
    writeDeviceMemory((m) => ({ ...m, participantId: "synthetic-profile" }), showcase);
    expect(readDeviceMemory(live).participantId).toBe("live-profile");
    expect(readDeviceMemory(showcase).participantId).toBe("synthetic-profile");
    expect(readDeviceMemory({ ...live, principalId: principalB }).participantId).toBeNull();
    expect(readDeviceMemory({ ...showcase, scope: { executionMode: "SHOWCASE", showcaseId: principalB } }).participantId).toBeNull();
    expect(deviceMemoryKey(live)).not.toBe(deviceMemoryKey(showcase));
  });
  it("quarantines ambiguous legacy v1 memory and never reads it before session authorization", () => {
    data.set("cohue.device.v1", JSON.stringify({ participantId: "unknown-scope", missions: [{ id: "secret", objective: "Legacy mission" }] }));
    expect(readDeviceMemory(live)).toEqual({ participantId: null, missions: [] });
    expect(readDeviceMemory()).toEqual({ participantId: null, missions: [] });
    writeDeviceMemory(() => ({ participantId: "orphan", missions: [] }));
    expect(data.size).toBe(1);
  });
});
