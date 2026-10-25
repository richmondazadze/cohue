// Per-device conveniences only (which profile/missions this browser created). Never bearer tokens or terms.
const KEY = "cohue.device.v1";

export type DeviceMemory = {
  participantId: string | null;
  missions: { id: string; objective: string; createdAt: string }[];
};

const empty: DeviceMemory = { participantId: null, missions: [] };

export function readDeviceMemory(): DeviceMemory {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<DeviceMemory>;
    return {
      participantId:
        typeof parsed.participantId === "string" ? parsed.participantId : null,
      missions: Array.isArray(parsed.missions)
        ? parsed.missions
            .filter(
              (m) =>
                m && typeof m.id === "string" && typeof m.objective === "string",
            )
            .slice(0, 20)
        : [],
    };
  } catch {
    return empty;
  }
}

export function writeDeviceMemory(update: (m: DeviceMemory) => DeviceMemory) {
  try {
    const next = update(readDeviceMemory());
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("cohue-device-memory"));
  } catch {
    /* storage unavailable: the app still works for this page view */
  }
}

export function rememberMission(m: {
  id: string;
  objective: string;
  createdAt: string;
}) {
  writeDeviceMemory((d) => ({
    ...d,
    missions: [
      { id: m.id, objective: m.objective.slice(0, 160), createdAt: m.createdAt },
      ...d.missions.filter((x) => x.id !== m.id),
    ].slice(0, 20),
  }));
}

export function forgetParticipant() {
  writeDeviceMemory((d) => ({ ...d, participantId: null }));
}
