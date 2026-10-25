# Approved COHUE landing and design lookup v1.0

Approved and locked by the user on 25 October 2026, including SVG arrows and restrained blur scroll reveal. Canonical executable reference: `public/landing-lab/cohue/index.html`. Approval checksum is in `APPROVED_LANDING.json`. This is the current landing/design lookup for subsequent frontend work. Preserve this direction; future material changes require user direction. Earlier frozen Design System v1.0 documents remain historical records and are not rewritten. This approval does not independently authorize application-wide replacement or publication.

## Visual tokens

| Token | Value |
| --- | --- |
| Paper / ink / muted | #f3f2ee / #151619 / #64666f |
| Blue / divider | #315cce / #d9d9d4 |
| Typography | Archivo sans; Instrument Serif italic accents |
| Mark | Existing Open Circle, blue, 28px desktop |
| Container | 1320px max; 5vw gutter, 6vw at <=550px |
| Section spacing | 110px desktop, 76px <=850px, 60px <=550px |
| Hero heading | clamp(64px,8.7vw,120px), .99 line height, -.065em tracking; mobile clamp(55px,13.5vw,74px) |
| Section heading | clamp(36px,4.5vw,62px), 1.06 line height, -.055em tracking; mobile39px |
| Action | Pill; 50px high, nav44px; blue primary, outlined secondary |
| Arrow | Inline16x16 SVG,24-unit viewBox,1.5 stroke,currentColor; decorative/aria-hidden/nonfocusable |

## Layout and content

Natural document scrolling, sticky84px navigation (74px mobile), editorial hero, illustrative mission workflow, three use cases, complete five-step process, principles, synthetic showcase, six FAQs, final CTA and footer. Tablet grids collapse at850px; mobile at550px uses single-column layouts and a compact header. Maintain real CTA destinations, explicit consent copy and synthetic/illustrative labeling. No invented activity or testimonials. Preserve comfortable text measures, whitespace, thin dividers and restrained colored surfaces.

## Motion and accessibility

One-time blur-to-clear entrances on bounded content blocks: opacity0→1, translateY6px→0, blur4px→0,500ms cubic-bezier(.23,1,.32,1). IntersectionObserver starts24px inside the viewport and unobserves after entry. Do not animate entire long sections, reblur while reading, pin scroll or restore continuous physics/WebGL. No permanent will-change or animation loop. Fine-pointer button hover is160ms; no hover movement on touch. Reduced motion: immediate clear content, no blur/translation/smooth scrolling. Keyboard focus inside pending content forces immediate visibility. No JavaScript leaves all content visible. Keep semantic headings/lists/links, skip link, visible focus and decorative SVG icons out of accessible names.

## Scope and review

Local review: http://127.0.0.1:8795/cohue/. Next static path: /landing-lab/cohue/index.html. This is approved as the landing and future design reference, but the current production home remains unchanged pending integration. Original template/reference provenance is retained separately; this direction is the refined derivative, not the kinetic replica. Google Fonts remain an external dependency. Mobile browser rendering and reduced-motion emulation verified; no physical-device performance certification.

## Production homepage mapping

User authorized homepage integration and Git push on25 October2026. The approved reference is implemented at `/` by `src/app/page.tsx` and `src/features/landing/**`; existing app entry/showcase moved to `/app`. Runtime CTAs use same-origin routes. See `../COHUE_LANDING_INTEGRATED.md` for checks and deployment limits. The standalone reference/checksum remains the locked visual lookup.
