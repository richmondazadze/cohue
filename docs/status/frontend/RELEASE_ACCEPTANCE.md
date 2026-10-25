# Frontend release acceptance — in progress

24 October 2026, release hardening against shared main47d5a5c. **Not a final release-ready declaration.** Product Engineer owns integration/deploy and final readiness. DesignSystem1.0 remains locked, all seven experiences/eight event motions required. Local milestone details: RELEASE_HARDENING.md.

| Gate | Current evidence | Remaining |
| --- | --- | --- |
| Creator translation read/review | New owner registry consumer and original-terms sheet;10SSR/filter/negative-cache tests pass | Lead-built browser interaction/new E2E; actual deployed producer/current-source/approval flow |
| Access / scope cleanup | Scoped memory tests retained; denied cached rendering, fatal event/epoch purge regression passes | Deployed cross-mode/navigation/revocation/SSE gap/backfill/reload checks |
| Recording / media | Multipart signal/metadata limits tested; unmount upload cancellation and playback/source fencing implemented | Actual audio samples and playback; no microphone permission granted/accepted |
| English / Spanish / French | Labels/status/source filtering implemented; approved translated audio gate | Actual three-language recording/transcription/review/extraction/translation approval/playback |
| Responsive320/390/768/1024/1440 | Read-only pre-integrated production15samples; join1024overflow and24pxcheckbox found; owned fixes pass lint/types/unit (RESPONSIVE_RELEASE_FIX.md) | Verify corrected freshbuild/finaldeployment, remaining private screens and wrapped Spanish/French/focus/touch sweep |
| Keyboard / reduced motion | Existing Radix/semantic list/reduced-motion behavior retained | Actual current-browser focus/escape/list parity; physical VoiceOver/TalkBack unavailable until tested |
| Core two-session loop | Earlier integrated browser evidence in historical reports | Final deployed SHOWCASE create/select/decline/repair/reconsent/activate/room/task/replay with backend worker |
| Graph30nodes/60edges | Stable-layout code present; existing timing/meaning tests | Actual profiled workload/device/frame evidence; no60fps claim |
| Build / CI / audit | Owned lint, tsc,38unit tests pass; npm audit0vulnerabilities | Lead reserved npmruncheck/build/E2E/hostedCI; no production smoke run by this engineer yet |
| Durable worker D7 | Backend quiet proof in progress, app tab closed on request | Backend/lead actual unattended/restart/lease/fencing/order/unique-effects report |

## Exact changed frontend files

src/client/events.ts, queries.ts, voice.ts; src/components/voice/record-control.tsx; src/features/invitations/creator-review.tsx, translations.tsx; src/features/theater/theater.tsx; tests/frontend/events.test.ts, translation-review.test.ts, voice-upload.test.ts; tests/e2e/frontend/translation-review.spec.ts and support/mock-backend.ts; this owned status directory. Paired handoffs appended only through shared lock script.

No root/schema/config/backend paths staged; no app build/push/deploy by frontend. No real participant data used. No provider/browser/device proof substituted by mocks. Actual production origin confirmed by lead as https://cohue.tech; exact final deployed commit not verified by this frontend yet, so no current release screenshot is claimed.

## Demo walkthrough (planned, not passed)

Use dedicated labeled SHOWCASE. Open synthetic entry, confirm organizer profile, speak or type mission, review extracted requirements/time/size before starting. Inspect actual proposals and requirement/approval distinction. Review original/localized invitation as organizer; approval only reviews translation. Share participant-specific link/QR into separate browser session; explicitly redeem and decline one, inspect real repair/reconsent, then answer current invitations and activate through server gate. Open Room, update authorized task, inspect replay read-only evidence. Demonstrate voice/text fallbacks and current-source media. Keep LIVE unrelated data untouched. Capture actual run only once deployed checks pass; user/lead handles recording/submission per release plan.

## Resume blocker

See BROWSER_ACCEPTANCE_BLOCKER.md: local3100HTTP200, but CUA navigation rejected because local browser use is disabled in Work settings.38unit tests rerun pass. No freshbuild responsive/checkbox/creatorreview browser pass claimed. Product Engineer notified; awaiting enabled browser capability or lead-owned acceptance evidence.
