import type { ApiOutput } from "@/contracts";

// Per-device conveniences only. Scope and principal partitioning is not an authorization grant.
export type DeviceIdentity = Pick<ApiOutput<"getSession">["data"], "principalId" | "scope">;
export type DeviceMemory = {
  participantId: string | null;
  missions: { id: string; objective: string; createdAt: string }[];
};
const empty: DeviceMemory = { participantId: null, missions: [] };
export function deviceMemoryKey(identity: DeviceIdentity): string {
  const scope = identity.scope.executionMode === "LIVE" ? "LIVE" : `SHOWCASE:${identity.scope.showcaseId}`;
  return `cohue.device.v2:${scope}:${identity.principalId}`;
}

export function readDeviceMemory(identity?: DeviceIdentity | null): DeviceMemory {
  if (!identity) return empty;
  try {
    // Legacy v1 did not record scope/principal. Leave it intact but never import ambiguous data.
    const raw = globalThis.localStorage?.getItem(deviceMemoryKey(identity));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<DeviceMemory>;
    return {
      participantId: typeof parsed.participantId === "string" ? parsed.participantId : null,
      missions: Array.isArray(parsed.missions)
        ? parsed.missions.filter((m) => m && typeof m.id === "string" && typeof m.objective === "string" && typeof m.createdAt === "string").slice(0, 20)
        : [],
    };
  } catch { return empty; }
}

export function writeDeviceMemory(update: (m: DeviceMemory) => DeviceMemory, identity?: DeviceIdentity | null) {
  if (!identity) return;
  try {
    const next = update(readDeviceMemory(identity));
    globalThis.localStorage?.setItem(deviceMemoryKey(identity), JSON.stringify(next));
    window.dispatchEvent(new Event("cohue-device-memory"));
  } catch { /* storage unavailable: server authorization and the current page still work */ }
}

export function rememberMission(m: { id: string; objective: string; createdAt: string }, identity: DeviceIdentity) {
  writeDeviceMemory((d) => ({
    ...d,
    missions: [{ id: m.id, objective: m.objective.slice(0, 160), createdAt: m.createdAt }, ...d.missions.filter((x) => x.id !== m.id)].slice(0, 20),
  }), identity);
}
export function forgetParticipant(identity?: DeviceIdentity | null) {
  writeDeviceMemory((d) => ({ ...d, participantId: null }), identity);
}
