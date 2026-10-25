"use client";
import { createContext, useContext, useRef, type ReactNode } from "react";
import type { AgentEvent } from "@/contracts";
import { motionFor, type MotionMeaning } from "@/client/events";
import { gsap, useGSAP } from "@/client/gsap";

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

/** Entrance tied to a cue. Reduced motion: opacity only, within 100ms, no 3D transform. */
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
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !cueKey) return;
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
        const reduce = Boolean(context.conditions?.reduce);
        gsap.fromTo(
          el,
          reduce
            ? { autoAlpha: 0 }
            : { autoAlpha: 0, y: 10, rotationX: -12, transformOrigin: "50% 100%" },
          {
            autoAlpha: 1,
            y: 0,
            rotationX: 0,
            duration: reduce ? 0.1 : duration,
            delay: reduce ? 0 : Math.min(index * DUR.stagger, DUR.staggerMax),
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [cueKey, duration, index], scope: ref, revertOnUpdate: true },
  );
  const Tag = as;
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}

/** One-shot emphasis for a newly committed event row. No pulse and no loop. */
export function Emphasis({ cueKey, children, className }: { cueKey: string | null; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !cueKey) return;
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
        if (context.conditions?.reduce) return;
        gsap.fromTo(
          el,
          { backgroundColor: "rgba(237,242,255,1)" },
          {
            backgroundColor: "rgba(237,242,255,0)",
            duration: DUR.enter * 2,
            ease: "power2.out",
            clearProps: "backgroundColor",
          },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [cueKey], scope: ref, revertOnUpdate: true },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
