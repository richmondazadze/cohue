# Proposal v1 verification

Planning/static board checks only; not application QA.

## Token contrast

Python sRGB relative-luminance calculation, executed 24 October 2026. All 14 representative pairs passed their stated thresholds. This is not a full component or rendered-text audit.

| Role | Foreground | Background | Ratio | Minimum |
| --- | --- | --- | --- | --- |
| body | #182726 | #F4F1E8 | 13.70:1 | 4.5:1 |
| secondary light | #52615D | #FFFDF7 | 6.40:1 | 4.5:1 |
| secondary dark | #B7C4BD | #192929 | 8.37:1 | 4.5:1 |
| primary | #182726 | #DFEF76 | 12.34:1 | 4.5:1 |
| approved light | #216747 | #E1F1E5 | 5.79:1 | 4.5:1 |
| pending light | #76500F | #FFF0CB | 6.35:1 | 4.5:1 |
| declined light | #A13F36 | #FBE4DE | 5.26:1 | 4.5:1 |
| evidence light | #315A96 | #E7EEF8 | 5.93:1 | 4.5:1 |
| approved dark | #8BD2AC | #192929 | 8.57:1 | 4.5:1 |
| pending dark | #F1CB7A | #192929 | 9.75:1 | 4.5:1 |
| declined dark | #F2A397 | #192929 | 7.52:1 | 4.5:1 |
| evidence dark | #A9C8F4 | #192929 | 8.81:1 | 4.5:1 |
| line light | #687B72 | #FFFDF7 | 4.43:1 | 3:1 |
| line dark | #78928A | #192929 | 4.51:1 | 3:1 |

## Browser checks

Served with `python3 -m http.server 8765 --bind 127.0.0.1` from repository root; IAB opened `/docs/design/proposal-v1/index.html`. Local design-only preview, no publication.

Cua browser viewport override set to widths 320, 390, 768, 1024, 1440 (height 900). Read-only DOM measurement returned document scrollWidth equal to viewport width at all five sizes, with document.fonts.status loaded. Viewport override reset afterward. Desktop Theater and 320px reading/phone specimens visually inspected. No horizontal page overflow observed. This does not prove every label, zoom mode or real device interaction is accessible.

Manual pending/approved comparison button updated status to “Synthetic style comparison: approved. No real consent recorded.” Board has no network commands or actual recording/playback. Saved theater-preview.png, mobile-preview.png and board-preview.png via browser screenshot API.

## Limits

No production tests/build/typecheck, automated accessibility suite, screen-reader audit, microphone/media, real mobile browser, provider, consent, graph-event integration or motion performance verification. Motion timings are specification only. Board uses static sample controls and reduced-motion CSS for press feedback; production event motion remains planned.
