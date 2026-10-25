"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/client/gsap";

/**
 * Route-level 3D entrance plus pointer tilt for opted-in cards.
 * prefers-reduced-motion skips both. Tilt is limited to fine pointers.
 */
export function Stage({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          fine: "(hover: hover) and (pointer: fine)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduce);
          const page = root.querySelector<HTMLElement>("[data-stage-page]");
          const hero = page?.querySelector("[data-stage='hero']");
          if (page && !reduce && !hero) {
            gsap.fromTo(
              page,
              { autoAlpha: 0, y: 22, rotationX: -7, transformOrigin: "50% 0%" },
              {
                autoAlpha: 1,
                y: 0,
                rotationX: 0,
                duration: 0.65,
                clearProps: "transform,opacity,visibility",
              },
            );
          }

          if (reduce || !context.conditions?.fine) return;

          const movers = new WeakMap<HTMLElement, { rx: (n: number) => void; ry: (n: number) => void }>();
          const motionFor = (card: HTMLElement) => {
            let motion = movers.get(card);
            if (!motion) {
              gsap.set(card, { transformPerspective: 900, transformOrigin: "50% 50%" });
              motion = {
                rx: gsap.quickTo(card, "rotationX", { duration: 0.45, ease: "power3.out" }),
                ry: gsap.quickTo(card, "rotationY", { duration: 0.45, ease: "power3.out" }),
              };
              movers.set(card, motion);
            }
            return motion;
          };
          const onMove = (event: PointerEvent) => {
            const card = (event.target as HTMLElement | null)?.closest?.("[data-tilt]") as HTMLElement | null;
            if (!card || !root.contains(card)) return;
            const box = card.getBoundingClientRect();
            if (!box.width || !box.height) return;
            const px = (event.clientX - box.left) / box.width - 0.5;
            const py = (event.clientY - box.top) / box.height - 0.5;
            const motion = motionFor(card);
            motion.ry(px * 7);
            motion.rx(py * -5);
          };
          const onOut = (event: PointerEvent) => {
            const card = (event.target as HTMLElement | null)?.closest?.("[data-tilt]") as HTMLElement | null;
            if (!card) return;
            const next = event.relatedTarget;
            if (next instanceof Node && card.contains(next)) return;
            const motion = movers.get(card);
            motion?.rx(0);
            motion?.ry(0);
          };
          root.addEventListener("pointermove", onMove);
          root.addEventListener("pointerout", onOut);
          return () => {
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerout", onOut);
          };
        },
        root,
      );
      return () => mm.revert();
    },
    { dependencies: [pathname], scope: rootRef, revertOnUpdate: true },
  );

  return (
    <div ref={rootRef} className="stage-3d">
      <div data-stage-page className="stage-page">
        {children}
      </div>
    </div>
  );
}
