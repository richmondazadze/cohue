"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};
/** False during server render and hydration, true afterwards. Gates device-dependent values (time, zone, storage). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

let nowValue = 0;
/** Coarse wall clock (updates every 30s) for expiry display; server truth still decides. */
export function useNow(): number {
  return useSyncExternalStore(
    (cb) => {
      const t = setInterval(() => {
        nowValue = Date.now();
        cb();
      }, 30_000);
      return () => clearInterval(t);
    },
    () => (nowValue ||= Date.now()),
    () => 0,
  );
}
