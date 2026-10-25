"use client";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { MissionSnapshot, MissionState } from "@/contracts";
import { ApiRequestError, callApi, type ApiData } from "./http";
import {
  eventLogReducer,
  initialEventLog,
  pickNewerSnapshot,
  type EventLogState,
} from "./events";
import { readDeviceMemory, type DeviceMemory } from "./local";

export const keys = {
  taxonomy: ["taxonomy"] as const,
  session: ["session"] as const,
  participant: (id: string) => ["participant", id] as const,
  inbox: (id: string) => ["inbox", id] as const,
  snapshot: (id: string) => ["mission", id, "snapshot"] as const,
  proposals: (id: string) => ["mission", id, "proposals"] as const,
  room: (id: string) => ["mission", id, "room"] as const,
  invitation: (id: string) => ["invitation", id] as const,
  preview: ["invitation-preview"] as const,
};

const noRetryOn = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "CONTRACT",
  "INVITATION_EXPIRED",
  "INVITATION_REVOKED",
  "SCOPE_MISMATCH",
  "UNAVAILABLE",
]);
export const queryRetry = (count: number, error: unknown) =>
  count < 2 &&
  !(error instanceof ApiRequestError && noRetryOn.has(error.code));

export const TERMINAL_STATES: MissionState[] = ["CANCELLED", "EXPIRED"];
const ACTIVE_STATES: MissionState[] = [
  "PLANNING",
  "DISCOVERING",
  "REPLANNING",
  "AWAITING_APPROVAL",
  "PROPOSED",
  "REPROPOSED",
];

export function useTaxonomy() {
  return useQuery({
    queryKey: keys.taxonomy,
    queryFn: ({ signal }) => callApi("taxonomy", { signal }),
    staleTime: 60 * 60 * 1000,
    retry: queryRetry,
  });
}

export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: async ({ signal }) => {
      try {
        return await callApi("getSession", { signal });
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === "UNAUTHENTICATED")
          return null;
        throw error;
      }
    },
    retry: queryRetry,
    staleTime: 30_000,
  });
}

/** Returns the current server session, creating a LIVE guest session only when none exists. */
export async function ensureLiveSession(
  client: QueryClient,
): Promise<ApiData<"getSession">> {
  try {
    const current = await callApi("getSession");
    client.setQueryData(keys.session, current);
    return current;
  } catch (error) {
    if (!(error instanceof ApiRequestError && error.code === "UNAUTHENTICATED"))
      throw error;
  }
  const created = await callApi("createSession", {
    input: { executionMode: "LIVE", showcaseId: null },
  });
  client.setQueryData(keys.session, created);
  return created;
}

export function useParticipant(id: string | null) {
  return useQuery({
    queryKey: keys.participant(id ?? "none"),
    queryFn: ({ signal }) =>
      callApi("getParticipant", { params: { id: id as string }, signal }),
    enabled: Boolean(id),
    retry: queryRetry,
  });
}

export function useInbox(participantId: string | null) {
  return useQuery({
    queryKey: keys.inbox(participantId ?? "none"),
    queryFn: ({ signal }) =>
      callApi("inbox", {
        params: { id: participantId as string },
        input: { limit: 100 },
        signal,
      }),
    enabled: Boolean(participantId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: queryRetry,
  });
}

export function useSnapshot(missionId: string) {
  const client = useQueryClient();
  return useQuery({
    queryKey: keys.snapshot(missionId),
    queryFn: async ({ signal }) => {
      const next = await callApi("snapshot", {
        params: { id: missionId },
        signal,
      });
      return pickNewerSnapshot(
        client.getQueryData<MissionSnapshot>(keys.snapshot(missionId)),
        next,
      );
    },
    refetchInterval: (q) => {
      const state = q.state.data?.mission.state;
      if (!state) return q.state.error ? false : 4000;
      if (TERMINAL_STATES.includes(state)) return false;
      return ACTIVE_STATES.includes(state) ? 2500 : 8000;
    },
    refetchIntervalInBackground: false,
    retry: queryRetry,
  });
}

export function useProposals(missionId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.proposals(missionId),
    queryFn: ({ signal }) =>
      callApi("proposals", { params: { id: missionId }, signal }),
    enabled,
    retry: queryRetry,
  });
}

export function useRoom(missionId: string) {
  return useQuery({
    queryKey: keys.room(missionId),
    queryFn: ({ signal }) =>
      callApi("room", { params: { id: missionId }, signal }),
    refetchInterval: 6000,
    refetchIntervalInBackground: false,
    retry: queryRetry,
  });
}

export function useInvitationDetail(invitationId: string) {
  return useQuery({
    queryKey: keys.invitation(invitationId),
    queryFn: ({ signal }) =>
      callApi("getInvitation", { params: { id: invitationId }, signal }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    retry: queryRetry,
  });
}

function usePageVisible(): boolean {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => document.visibilityState === "visible",
    () => true,
  );
}

/**
 * Committed mission events over JSON polling with an `after` cursor. Pauses while the tab is hidden and
 * resumes from the cursor (no replay of a backlog as fresh work). New events invalidate the snapshot.
 */
export function useMissionEvents(
  missionId: string,
  { enabled = true, intervalMs = 2000 }: { enabled?: boolean; intervalMs?: number } = {},
): EventLogState & { error: unknown; lastSyncedAt: number | null } {
  const [state, dispatch] = useReducer(eventLogReducer, initialEventLog);
  const [meta, setMeta] = useState<{ error: unknown; lastSyncedAt: number | null }>({
    error: null,
    lastSyncedAt: null,
  });
  const client = useQueryClient();
  const visible = usePageVisible();
  const cursorRef = useRef(0);

  useEffect(() => {
    if (!enabled || !visible) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const pull = async () => {
      let hasMore = true;
      let pages = 0;
      let received = 0;
      while (hasMore && pages < 10 && !controller.signal.aborted) {
        const page = await callApi("events", {
          params: { id: missionId },
          input: { after: cursorRef.current, limit: 100, format: "json" },
          signal: controller.signal,
        });
        dispatch({
          type: "page",
          events: page.events,
          nextSequence: page.nextSequence,
          accessEpoch: page.accessEpoch,
        });
        if (page.events.length)
          cursorRef.current = Math.max(
            cursorRef.current,
            page.events[page.events.length - 1].sequence,
          );
        received += page.events.length;
        hasMore = page.hasMore && page.events.length > 0;
        pages++;
      }
      return received;
    };
    const tick = async () => {
      try {
        const received = await pull();
        setMeta({ error: null, lastSyncedAt: Date.now() });
        if (received > 0)
          void client.invalidateQueries({ queryKey: ["mission", missionId] });
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;
        setMeta((m) => ({ ...m, error }));
        if (
          error instanceof ApiRequestError &&
          ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "UNAVAILABLE"].includes(
            error.code,
          )
        )
          stopped = true;
      }
      if (!stopped && !controller.signal.aborted)
        timer = setTimeout(tick, intervalMs);
    };
    void tick();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, visible, intervalMs, client, missionId]);

  return { ...state, ...meta };
}

let memoryCache: { raw: string; value: DeviceMemory } | null = null;
export function useDeviceMemory(): DeviceMemory {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("cohue-device-memory", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("cohue-device-memory", cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => {
      const value = readDeviceMemory();
      const raw = JSON.stringify(value);
      if (memoryCache?.raw !== raw) memoryCache = { raw, value };
      return memoryCache.value;
    },
    () => SERVER_MEMORY,
  );
}
const SERVER_MEMORY: DeviceMemory = { participantId: null, missions: [] };
