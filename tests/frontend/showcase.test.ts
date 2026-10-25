import { describe, expect, it, vi } from "vitest";
import { prepareShowcaseProfile, SHOWCASE_ID } from "@/client/showcase";
import { readDeviceMemory } from "@/client/local";
import type { ApiData } from "@/client/http";
const api = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/client/http", async (original) => ({ ...await original<typeof import("@/client/http")>(), callApi: api.read }));
const session: ApiData<"getSession"> = { principalId: "00000000-0000-4000-8000-000000000385", kind: "SHOWCASE_OPERATOR", scope: { executionMode: "SHOWCASE", showcaseId: SHOWCASE_ID }, invitationId: null, expiresAt: "2026-10-26T00:00:00Z" };
describe("installed synthetic organizer", () => {
  it("rejects LIVE sessions before requesting any synthetic profile", async () => {
    api.read.mockClear();
    await expect(prepareShowcaseProfile({ ...session, kind: "GUEST", scope: { executionMode: "LIVE", showcaseId: null } })).rejects.toMatchObject({ code: "SCOPE_MISMATCH" });
    expect(api.read).not.toHaveBeenCalled();
  });
  it("remembers only an authorized synthetic profile without issuing consent commands", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    api.read.mockClear();
    api.read.mockResolvedValueOnce({ id: "00000000-0000-4000-8000-000000000001", scope: session.scope });
    try {
      await prepareShowcaseProfile(session);
      expect(readDeviceMemory(session).participantId).toBe("00000000-0000-4000-8000-000000000001");
      expect(readDeviceMemory({ ...session, scope: { executionMode: "LIVE", showcaseId: null } }).participantId).toBeNull();
      expect(api.read.mock.calls.map((call) => call[0])).toEqual(["getParticipant"]);
    } finally { vi.unstubAllGlobals(); }
  });
  it("requires a real successful authorized profile read and propagates missing seed failures", async () => {
    api.read.mockRejectedValueOnce(new Error("not seeded"));
    await expect(prepareShowcaseProfile(session)).rejects.toThrow("not seeded");
    api.read.mockResolvedValueOnce({ id: "wrong", scope: { executionMode: "LIVE", showcaseId: null } });
    await expect(prepareShowcaseProfile(session)).rejects.toMatchObject({ code: "SCOPE_MISMATCH" });
  });
});
