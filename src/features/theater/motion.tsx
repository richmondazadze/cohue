"use client";
import { createContext, useContext, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { AgentEvent } from "@/contracts";
import { motionFor, type MotionMeaning } from "@/client/events";

// Event-bound motion (Design System v1.0 §7). Only committed events newer than the initial load cue motion;
// a newer cue interrupts an older one by key; nothing here gates state, focus or command completion.

export type Cue = { meaning: MotionMeaning; event: AgentEvent } | null;

export const EASE = [0.2, 0.8, 0.2, 1] as const;
export const DUR = { enter: 0.18, sheet: 0.24, graph: 0.32, activation: 0.48, stagger: 0.024, staggerMax: 0.12 };

export function liveEvents(events: AgentEvent[], baseline: number | null): AgentEvent[] {
  return baseline === null ? [] : events.filter((e) => e.sequence > baseline);
}

/** Newest live cue per meaning, so concurrent meanings (e.g. discovery + invitation) don't cancel each other. */
export function cuesOf(live: AgentEvent[]): Partial<Record<MotionMeaning, AgentEvent>> {
  const out: Partial<Record<MotionMeaning, AgentEvent>> = {};
  for (const e of live) {
    const m = motionFor(e);
    if (m) out[m] = e;
  }
  return out;
}

const CueContext = createContext<Partial<Record<MotionMeaning, AgentEvent>>>({});
export const CueProvider = CueContext.Provider;
export const useCue = (m: MotionMeaning) => useContext(CueContext)[m] ?? null;

/** Entrance tied to a cue. Reduced motion: immediate (opacity ≤100ms, no transform). */
export function CueEntrance({
  cueKey,
  children,
  index = 0,
  duration = DUR.enter,
  className,
  as = "div",
}: {
  cueKey: string | null;
  children: ReactNode;
  index?: number;
  duration?: number;
  className?: string;
  as?: "div" | "li" | "span";
}) {
  const reduced = useReducedMotion();
  const Tag = as === "li" ? motion.li : as === "span" ? motion.span : motion.div;
  if (!cueKey) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  return (
    <Tag
      key={cueKey}
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduced ? 0.1 : duration,
        ease: EASE,
        delay: reduced ? 0 : Math.min(index * DUR.stagger, DUR.staggerMax),
      }}
    >
      {children}
    </Tag>
  );
}

/** One-shot emphasis (background flash to transparent) for agent execution rows. No pulse, no loop. */
export function Emphasis({ cueKey, children, className }: { cueKey: string | null; children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (!cueKey || reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      key={cueKey}
      className={className}
      initial={{ backgroundColor: "rgba(237,242,255,1)" }}
      animate={{ backgroundColor: "rgba(237,242,255,0)" }}
      transition={{ duration: DUR.enter * 2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
