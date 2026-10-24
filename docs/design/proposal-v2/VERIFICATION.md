# V2 static design verification

These are isolated design-artifact checks, not product tests. No application scaffold, provider, API, DB or deployment was created.

## Contrast

Python sRGB relative-luminance calculation executed for 12 role pairs; all passed stated thresholds. Quiet dividers/grid dots are decorative and not counted as control boundaries. This does not establish full rendered accessibility compliance.

| Role | Foreground | Background | Ratio | Minimum |
| --- | --- | --- | --- | --- |
| body | #202323 | #F5F3EF | 14.29:1 | 4.5:1 |
| secondary | #626662 | #FFFFFF | 5.84:1 | 4.5:1 |
| primary button | #FFFFFF | #315CCE | 5.91:1 | 4.5:1 |
| hover | #FFFFFF | #254DAF | 7.61:1 | 4.5:1 |
| selection | #315CCE | #EDF2FF | 5.28:1 | 4.5:1 |
| approval | #216747 | #E6F2E9 | 5.89:1 | 4.5:1 |
| pending | #785317 | #FFF2D6 | 6.21:1 | 4.5:1 |
| decline | #A13F36 | #FBE4DE | 5.26:1 | 4.5:1 |
| evidence | #466A84 | #EDF3F7 | 5.13:1 | 4.5:1 |
| control boundary | #7B847C | #FFFFFF | 3.86:1 | 3:1 |
| graph connection | #7B847C | #FCFCFA | 3.76:1 | 3:1 |
| focus | #315CCE | #F5F3EF | 5.33:1 | 3:1 |

## Browser

IAB opened local `/docs/design/proposal-v2/index.html`. Active-tab viewport tests at 320, 390, 768, 1024, 1440px (height 1000) returned document scrollWidth equal to innerWidth and fonts loaded. Initial measurement targeted a background tab and returned 1440 at every setting; discarded as invalid. Re-ran on active preview with AX refresh between sizes; all five actual widths confirmed. Visually inspected desktop Theater/selection inspector and 390px light phone composition plus 320px entry. Local logo SVG images loaded. Saved Theater/phone/board screenshots; viewport overrides reset before delivery. Static sample controls remain explicitly synthetic. No microphone/consent/provider integration.

## Logo checks

Skill commands: svg_audit.py v1 concepts; render_png.py v1 concepts at 512; preview_sheet.py v1/v2; svg_audit.py v2 concepts/wordmark/lockups; concept_sheet.py v2. Full paths under `/Users/richkay/.codex/skills/logo-design/scripts/`. V1 C companion overflow found, v2 corrected. A detached block enlarged; B meeting block/gaps adjusted for small size. V2 audit scores 99–100 heuristic, no WARN/FAIL, documented INFO only. Inspected v1 raster renders, final concept overview, monochrome/reversed comparisons and diagnostic competitor shelf. Overview includes actual 64/32/16px studies. C's narrow companion remains weaker as a standalone favicon; selection matters. Final-kit optical reverse adjustment and device raster tests remain pending.

Library research: productivity-collaboration summary (81 marks), connection/letterform/negative-space searches; studied Patreon, Framer, Pagekit source geometry and diagnostic shelf. No outlines traced or used in COHUE concepts. Diagnostic test HTML includes reference trademarks from skill library; those are not adopted brand assets. Their owners retain all rights. Production logo kit not created; no trademark clearance asserted.

## Remaining validation

No production build/typecheck/unit/E2E, actual phone/VoiceOver, deployed consent, localization QA, frame profiling, provider/audio or durable dispatcher checks. No print proofs, Pantone/CMYK approval, trademark clearance or production favicon kit. These remain planned/pending selection and authorization.
