# Landing overhaul — first exact reference replica

User explicitly requested lifting the previous visual constraints for a full UI overhaul, starting with scouting and exactly replicating a motion-rich landing template. Current scope is this first landing reference only. User also prohibited messaging other chats; none were contacted.

## Selected reference

**MATTER Kinetic 3D Experience** by Aksonvady Phomhome on Aura.
- Catalog: https://www.aura.build/templates/matter-immersive
- Original preview: https://matter-immersive.aura.build/
- Local replica: http://127.0.0.1:8795/matter/
- Source: public/landing-lab/matter/index.html

Scouted the user-opened MotionSites free landing catalog, Aura recent/featured templates and full previews, Efferd block catalog, and Refero web-app directory. Aura offered the strongest directly reusable full motion experience for this task. Aniwall was a strong SaaS candidate but explicitly Pro-only, so its gated source was not obtained. Efferd is useful for the later application component phase; Refero supplies visual references rather than ready-to-export landing code.

MATTER is explicitly marked Use for Free. Used the site's provided Copy recreation prompt and Copy code controls; no subscription, trial, paid export, scraping of gated source, or generation credits used. Exact original HTML export and exact recreation prompt retained under reference/; SHA-256 and provenance in reference/source.json. All third-party work remains attributed. No trademark clearance or broader asset-ownership claim.

## What is reproduced

Original Archivo + Instrument Serif typography, pearl/ink/blue palette, live Three.js glass/chrome geometry, full-screen menu, scroll-driven camera/section transitions, kinetic hero, statement/masking sequence, object gallery + detail drawer, architectural typography corridor, interactive gravity lab, finale/footer. Original wording/branding retained for this fidelity pass; not yet a COHUE copy/identity adaptation. No original business claims are presented as COHUE facts.

The untouched export is archived. The preview has two narrow nonvisual corrections: exported menu toggle passed undefined as a forced class state, preventing opening; fixed toggle and synchronized aria-hidden/expanded/inert so hidden navigation cannot receive focus. No visual restyling.

## Preview

Run from the repository:

```sh
python3 -m http.server 8795 --bind 127.0.0.1 --directory public/landing-lab
```

This serves only the static reference directory, with no app DB/providers/secrets. Existing COHUE home, app flows, contracts, dependencies and frozen design sources are unchanged. Nothing deployed/pushed. The experimental static page could also be served by Next at /landing-lab/matter/index.html in a future reviewed deployment; no such deployment occurred here.

## Verification and inherited limits

Actual CUA: local live WebGL hero rendered; menu opens/closes; gallery chapter and object detail drawer render; physics chapter renders. Desktop and390px hero screenshots retained.390px document scrollWidth equals viewport andcanvasfits. Exact copied source audit found no fetch/XHR/localStorage/cookie/serviceworker calls; remote imports are Three.js/Tailwind/fonts and supplied gallery assets. External runtime dependencies remain at original URLs, requiring internet.

This is a reference replica, not production accessibility/performance certification. Original menu touch target is only18px high; magnetic split-character labels and original email/footer links remain source content. Tailwind CDN emits its normal production warning. Source reduced-motion logic is retained, not newly certified. Before COHUE integration: adapt realcopy/CTAs/links, make touch and keyboard behavior production-ready, remove preview instrumentation/CDN Tailwind, self-host eligible dependencies through reviewed stack, and profile/adaptWebGL/mobile cost. No invented60fps or business-success claim.

Wait for the user's next direction after reviewing this first replica. Do not expand into application redesign or message other chats.
