"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

let ready = false;

/** Register GSAP once. The curve matches the approved standard ease. */
export function ensureGsap() {
  if (ready) return;
  gsap.registerPlugin(useGSAP, CustomEase, ScrollTrigger);
  CustomEase.create("cohue", "0.2,0.8,0.2,1");
  gsap.defaults({ ease: "cohue", duration: 0.6 });
  ready = true;
}

ensureGsap();

export { gsap, useGSAP, ScrollTrigger };
