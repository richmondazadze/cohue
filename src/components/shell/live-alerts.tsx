"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import type { MissionState } from "@/contracts";
import { callApi } from "@/client/http";
import { keys, TERMINAL_STATES, useDeviceMemory, useInbox, useSession } from "@/client/queries";
import { cx } from "@/components/ui/cx";

type Alert = { id: string; title: string; body: string; href: string; tone: "action" | "approved" | "pending" };
type Seen = { inv: Record<string, string>; mission: Record<string, string> };

const WATCHED_MISSIONS = 3;
const SHOW_MS = 12_000;

// What a creator hears about, per state their mission moves into. Other states change nothing they must do.
const MISSION_COPY: Partial<Record<MissionState, { title: string; tone: Alert["tone"]; room?: boolean }>> = {
  PROPOSED: { title: "Teams are ready for you to choose", tone: "action" },
  REPROPOSED: { title: "A new team is ready after a change", tone: "action" },
  REPLANNING: { title: "Someone asked for a change. Replanning now", tone: "pending" },
  ACTIVATED: { title: "Your team is confirmed. The Mission Room is open", tone: "approved", room: true },
  PAUSED_FOR_HUMAN: { title: "Your mission needs a decision from you", tone: "pending" },
  EXPIRED: { title: "Your mission expired before everyone answered", tone: "pending" },
  FAILED: { title: "Your mission stopped and needs a look", tone: "pending" },
};

function readSeen(key: string): Seen {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "") as Seen;
    if (v && typeof v.inv === "object" && typeof v.mission === "object") return v;
  } catch { /* first visit or storage unavailable */ }
  return { inv: {}, mission: {} };
}
function writeSeen(key: string, seen: Seen) {
  try { localStorage.setItem(key, JSON.stringify(seen)); } catch { /* alerts still show this session */ }
}

/** Short two-note chime, generated locally. Browsers allow it only after the person has interacted with the page. */
function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    const unlock = () => {
      try {
        ctx.current ??= new AudioContext();
        void ctx.current.resume();
      } catch { /* no audio on this device */ }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  return () => {
    const ac = ctx.current;
    if (!ac || ac.state !== "running") return;
    [660, 880].forEach((freq, i) => {
      const t = ac.currentTime + i * 0.14;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  };
}

/**
 * App-wide "for you" alerts: a new invitation for this device's participant, or a state change on a mission
 * this device created. Reads the same scoped endpoints the pages use; nothing new is exposed or stored server-side.
 */
export function LiveAlerts() {
  const session = useSession();
  const memory = useDeviceMemory();
  const pathname = usePathname();
  const inbox = useInbox(memory.participantId);
  const watched = memory.missions.slice(0, WATCHED_MISSIONS);
  const snapshots = useQueries({
    queries: watched.map((m) => ({
      queryKey: keys.snapshot(m.id),
      queryFn: ({ signal }: { signal: AbortSignal }) => callApi("snapshot", { params: { id: m.id }, signal }),
      enabled: Boolean(session.data),
      refetchInterval: (q: { state: { data?: { mission: { state: MissionState } } } }) =>
        q.state.data && TERMINAL_STATES.includes(q.state.data.mission.state) ? false : 8000,
      refetchIntervalInBackground: false,
      retry: false,
    })),
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const chime = useChime();
  const seenKey = session.data ? `cohue.alerts.v1:${session.data.principalId}` : null;

  const invitationKey = (inbox.data?.invitations ?? []).map((i) => `${i.id}:${i.status}`).join(",");
  const missionKey = snapshots.map((s) => (s.data ? `${s.data.mission.id}:${s.data.mission.state}` : "")).join(",");

  useEffect(() => {
    if (!seenKey) return;
    const seen = readSeen(seenKey);
    const fresh: Alert[] = [];
    for (const inv of inbox.data?.invitations ?? []) {
      const before = seen.inv[inv.id];
      if (before !== inv.status && inv.status === "PENDING" && pathname !== "/me")
        fresh.push({
          id: `inv:${inv.id}:${inv.responseVersion}`,
          title: "You're invited to a mission",
          body: `${inv.terms.role} · ${inv.terms.objective}`,
          href: "/me",
          tone: "action",
        });
      seen.inv[inv.id] = inv.status;
    }
    for (const s of snapshots) {
      const m = s.data?.mission;
      if (!m) continue;
      const before = seen.mission[m.id];
      const copy = MISSION_COPY[m.state];
      const here = pathname?.startsWith(`/missions/${m.id}`);
      // First sight only records the state; alerts are for changes that happen while the person is elsewhere.
      if (before && before !== m.state && copy && !here)
        fresh.push({
          id: `mission:${m.id}:${m.state}`,
          title: copy.title,
          body: m.objective,
          href: copy.room ? `/missions/${m.id}/room` : `/missions/${m.id}`,
          tone: copy.tone,
        });
      seen.mission[m.id] = m.state;
    }
    writeSeen(seenKey, seen);
    if (!fresh.length) return;
    // Alerts arrive from polled server data, an external system this effect synchronizes with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts((a) => [...fresh, ...a.filter((x) => !fresh.some((f) => f.id === x.id))].slice(0, 3));
    if (document.hidden) setUnread((n) => n + fresh.length);
    chime();
    navigator.vibrate?.(80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenKey, invitationKey, missionKey]);

  // Each alert leaves on its own after a while; the inbox and the mission page keep the full record.
  useEffect(() => {
    if (!alerts.length) return;
    const t = setTimeout(() => setAlerts((a) => a.slice(0, -1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [alerts]);

  // While the tab is in the background, the title carries a count so the change is noticed on return.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = unread ? `(${unread}) ${base}` : base;
    const clear = () => { if (!document.hidden) setUnread(0); };
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, [unread]);

  if (!alerts.length) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-4 sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-auto sm:items-end"
    >
      {alerts.map((a) => (
        <div
          key={a.id}
          className={cx(
            "pointer-events-auto w-full max-w-sm rounded-panel border-l-[3px] bg-surface px-4 py-3 shadow-lg",
            a.tone === "approved" ? "border-approved" : a.tone === "pending" ? "border-pending" : "border-action",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{a.body}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss alert"
              className="-m-2 grid size-11 shrink-0 place-items-center rounded-button text-muted hover:text-ink"
              onClick={() => setAlerts((x) => x.filter((y) => y.id !== a.id))}
            >
              ×
            </button>
          </div>
          <Link
            href={a.href}
            className="type-meta mt-1 inline-block font-medium text-action underline underline-offset-4"
            onClick={() => setAlerts((x) => x.filter((y) => y.id !== a.id))}
          >
            Open
          </Link>
        </div>
      ))}
    </div>
  );
}
