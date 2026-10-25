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

## Resume blocker (resolved for local browser access)

See BROWSER_ACCEPTANCE_BLOCKER.md: local3100HTTP200, but CUA navigation rejected because local browser use is disabled in Work settings.38unit tests rerun pass. No freshbuild responsive/checkbox/creatorreview browser pass claimed. Product Engineer notified; awaiting enabled browser capability or lead-owned acceptance evidence.


## Fresh local browser acceptance — 24 October, 11 PM America/Chicago

Browser access restored. CUA inspected lead-reported b412e35 production build at localhost3100, isolated synthetic database, providers disabled. This is local UI evidence, not final deployed acceptance.

- Onboarding1024x900: loaded fonts, innerWidth1024=scrollWidth1024, all summary DD right<=967. Previous overflow corrected.
- Composer320/390/768/1024/1440x900: scrollWidth equals each viewport, checkbox44x44 with unchanged24x24 visual. Space checked and unchecked; focused checkbox matched focus-visible with2px blue outline.
- Through visible UI entered labeled SHOWCASE, created synthetic mission86a3cb40-78db-4157-9e31-b999942ab1df, reviewed brief, started real discovery, selected proposal, opened creator review. Original objective/output/role/schedule/responsibilities/group/revision displayed; organizer-only notice, no accept/redeem controls. Approvals remained1/4, activation disabled.
- At390px creator sheet width390/right390, document width390. Screenshot artifacts/creator-review-390.png. Original English listen offered; no provider playback/translation approval attempted. Providers disabled means three-language acceptance remains pending.
- Defect: Escape dismissed review but focus returned to body. Source corrected by optional native Radix Sheet trigger, used by creator review; awaiting lead rebuild for browser confirmation. Responsive breakpoint changes also remount Theater and dismiss sheet; no completed draft lost in observed original-only review, no preservation pass claimed.

No production mutation, microphone prompt or participant consent performed. Remaining private screens, reduced-motion/profiled graph, real audio/phone/screenreader and final deployed journey gates remain open. Lead owns combined build/audit/E2E/deploy.

## Breakpoint review continuity correction

Static diagnosis confirms wide conditional replaced the entire Tabs/CenterPanel subtree at1024px, unmounting CreatorInvitationReview and OrganizerReview's local text state. CUA had actually observed original-only sheet dismissal; translated draft loss was not browser-reproduced because local providers disabled, but follows directly from unmounted useState. Unified stable layout/Tabs ancestry now uses the same responsive classes and tab choices, preserving open sheet/draft across breakpoints. Added synthetic E2E assertions at390/1024/1440/768 for open dialog+exact edited text and Escape trigger focus. Authored assertions pending lead execution/rebuild, not a pass. Owned ESLint/types/38unit tests pass before final class-only adjustment.

## Fresh integrated real-provider browser checks — 24 October, 11:03 PM America/Chicago

Lead confirmed fresh3100 production build includes f4952f6/192c2b6/809db4f, isolatedcohue_ci_review_e2e, actual configured providers ON. Reopened own synthetic SHOWCASE mission through preserved session.

Actual CUA: Escape closes review and focuses its native review trigger. Spanish machine translation appeared; corrected responsibility wording while retaining complete terms, then exact edited text and open sheet survived390/1024/1440/768 widths, scrollWidth equals viewport each. Approved Spanish via organizer UI; status reviewed and translated Listen appeared. Participant approvals remained1/4 with activation disabled. Actual Spanish audio readyState4, duration28.606984s, currentTime5.670248s, pausedfalse, noerrors. Switching to original English paused Spanish at10.039884s; actual English readyState4, duration26.006349s, currentTime7.707597s, pausedfalse. Both actual media, no browser microphone permission. This is DOM playback-progress evidence, not a human listening/quality claim.

French actual generated translation reviewed and approved on SyntheticParticipant03; French Listen requested, final media observation pending. Screenshot artifacts/review-approved-provider-390.png contains only synthetic terms, no bearer. These are LOCAL real-provider results, not deployed-site/physicalphone/recording/STT evidence. Prior providers-disabled limitation superseded for these specific checks only.

French final playback PASS: readyState4, duration30.51102s, currentTime13.488512s, pausedfalse, noalerts. Ownsyntheticmission cancelled normally; finalUI confirms releasedreservations. See FRESH_REVIEW_ACCEPTANCE.md for consolidated evidence and remaininggates.
