"use client";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import "./motion.css";

const MAX_UNITS = 64;
// Containers taller than this are split, so cards, rows and list items assemble one after another.
const SPLIT_PX = 220;
const SKIP = "svg, canvas, video, .fill-target, [data-motion-skip], [role='tabpanel'][data-state]";

/**
 * Reveals each page as it assembles row by row (blur + small offset ease-out, staggered), blocks further down as they
 * scroll into view, and any content that arrives later (loaded data, new list items). Purely presentational:
 * it never changes layout, and does nothing at all when the person prefers reduced motion.
 */
export function MotionLayer() {
  const pathname = usePathname();

  // Layout effect: blocks are queued before the browser paints the new route, so nothing flashes first.
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-motion-root]");
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.dataset.motionReady = "";
      return;
    }

    const viewport = () => window.innerHeight || 800;
    const play = (el: HTMLElement, i: number) => {
      el.style.setProperty("--motion-i", String(i));
      el.dataset.motion = "in";
    };
    const done = (event: AnimationEvent) => {
      const el = event.target as HTMLElement;
      if (el.dataset.motion === "in" && event.animationName === "motion-blur-in") {
        delete el.dataset.motion;
        el.style.removeProperty("--motion-i");
      }
    };
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            watcher.unobserve(entry.target);
            play(entry.target as HTMLElement, 0);
          }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    // Animated by GSAP or already moving: leave it alone so two systems never fight over one element.
    const busy = (el: HTMLElement) =>
      Boolean(el.style.transform || el.style.opacity || el.style.visibility || el.closest(SKIP) || el.dataset.motion);
    const reveal = (els: HTMLElement[]) => {
      let i = 0;
      for (const el of els) {
        if (busy(el)) continue;
        const box = el.getBoundingClientRect();
        if (!box.width && !box.height) continue;
        if (box.top < viewport()) play(el, i++);
        else {
          el.dataset.motion = "pending";
          watcher.observe(el);
        }
      }
    };
    // Large containers are split into their children so a long page reveals block by block.
    const units = (el: HTMLElement, depth: number, out: HTMLElement[]) => {
      for (const child of Array.from(el.children) as HTMLElement[]) {
        if (out.length >= MAX_UNITS) return out;
        if (child.matches(SKIP)) continue;
        const tall = child.getBoundingClientRect().height > SPLIT_PX;
        if (tall && depth < 5 && child.children.length > 1) units(child, depth + 1, out);
        else out.push(child);
      }
      return out;
    };

    root.addEventListener("animationend", done);
    reveal(units(root, 0, []));
    root.dataset.motionReady = "";

    // Content that arrives after the first paint (queries resolving, new events) settles in the same way.
    const mutations = new MutationObserver((records) => {
      const added: HTMLElement[] = [];
      for (const record of records)
        for (const node of Array.from(record.addedNodes))
          if (node instanceof HTMLElement && !added.some((a) => a.contains(node))) added.push(node);
      if (!added.length) return;
      requestAnimationFrame(() => {
        // A large arrival (a whole loaded page section) assembles row by row too.
        const blocks: HTMLElement[] = [];
        for (const el of added.filter((e) => e.isConnected)) {
          if (blocks.length >= MAX_UNITS) break;
          if (el.getBoundingClientRect().height > SPLIT_PX && el.children.length > 1) units(el, 1, blocks);
          else blocks.push(el);
        }
        reveal(blocks);
      });
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      watcher.disconnect();
      root.removeEventListener("animationend", done);
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-motion]"))) delete el.dataset.motion;
    };
  }, [pathname]);

  return null;
}
