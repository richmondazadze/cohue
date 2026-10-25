"use client";

import { useEffect, useRef } from "react";
import { landingMarkup } from "./content";
import "./landing.css";

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const element = root.current;
    if (!element || reduced.matches || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("pending");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
    const blocks = element.querySelectorAll<HTMLElement>(".section-head,.usecase,.read-steps>li,.principles>article,.read-faq>article,.closing");
    blocks.forEach((block) => {
      block.classList.add("reveal");
      if (block.getBoundingClientRect().top > innerHeight) {
        block.classList.add("pending");
        observer.observe(block);
      }
    });
    const clear = () => blocks.forEach((block) => block.classList.remove("pending"));
    const onChange = () => { if (reduced.matches) { clear(); observer.disconnect(); } };
    reduced.addEventListener("change", onChange);
    return () => { observer.disconnect(); reduced.removeEventListener("change", onChange); clear(); };
  }, []);
  return <div ref={root} className="landing-page" dangerouslySetInnerHTML={{ __html: landingMarkup }} />;
}
