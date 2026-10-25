# Frontend release hardening — 24 October 2026

Preceding baseline:47d5a5c on shared main. User-authorized release ownership reassigned to this Frontend Engineer through Product Engineer. Approved frozen Design System1.0 unchanged. No root/config/shared contract/backend edits; no push/build/deploy.

## Implemented

- Added creator invitation review sheet directly in Theater using lead-approved `getInvitationForReview` owner operation. Original binding objective/output/role/schedule/responsibilities/disclosed group remain visible; no participant Accept/Decline/respond command exists in organizer review. Removed the misleading bearer-link-opening workaround from Theater. Organizer session no longer needs to redeem/replace itself with a participant capability to review a translation.
- Creator query/cache is separate from invitation capability detail, active only while sheet content is mounted, with zero inactive cache lifetime. Any failed refetch hides cached terms, translations and audio; retry remains explicit. Translation filtering requires matching invitation source ID and proposal source revision; item version/hash/status keys retire old text editors and audio when source changes. Backend remains authority for canonical hash/source authorization.
- Translation approval controls exist only in explicit organizer review context. Unreviewed/failed translated audio has no Listen action; original text remains readable. Approval updates both creator/capability queries. Approval is labeled organizer translation review, never participant consent.
- Audio completion fenced after source unmount, byte fetch aborts, object URLs revoked on teardown/replacement, expired audio cannot be replayed from cached URL. Playback remains explicit, single-active-language and text-first on failure. No actual provider/microphone success claimed here.
- Transcription fetch accepts navigation cancellation; recording sessions remount on source-purpose/language changes so a late transcript cannot populate another source. Unmount aborts active upload; same deliberate upload retry retains idempotency behavior. Existing microphone late-permission/generation cleanup retained.
- Stream denied backfill (including gap recovery) stops reopening and clears private event state; changed access epoch requires an explicit authorized reload rather than reusing cached history. New revoke reducer action discards event history. Server periodic source authorization observation relayed to backend owner; frontend does not modify server routes.

## Actual local checks

- `npx vitest run tests/frontend`:38passed,8files (2026-10-25T02:39:35Z approximate runner time; local host displayed21:39:35 America/Chicago). New10creator-review/filter/playback/denied-cache cases,3multipart/cancellation/invalid-metadata cases,1event purge case. All are unit/SSR/transport stubs, not deployed integration.
- `npx eslint src/client src/components src/features tests/frontend tests/e2e/frontend --max-warnings=0`:passed.
- `npx tsc --noEmit`:passed after backend owner corrected its transient concurrent media.ts narrowing error. No nexttypegen or shared build invoked.
- `npm audit --audit-level=high`:0vulnerabilities.
- `git diff --check`:passed before serialization/commit.
- Authored `tests/e2e/frontend/translation-review.spec.ts` over explicitly synthetic contract harness: organizer reads/edits/approves translation without redeem/respond, reviewed-playback503retains text and dialog closes. Not executed yet; lead owns shared production build/browser test slot. Existing fixture harness extended for review/approval/synthesis failure only, never live fallback.

Initial local checks found one test expecting English “Spanish” rather than the existing native label “Español”; corrected expectation. Existing24tests passed before additions. Early lint found newly unused router from removed workaround; removed it. These failures are resolved, not passing earlier attempts.

## Runtime / coordination / remaining

Backend reports producer/auth tests independently; this frontend report does not claim its results. Contracts remain lead-owned1.1.0 with additive39-operation registry. No migrations, provider credentials, environment or deployed runtime changed. Product Engineer schedules combined npmcheck/build/production smoke, push/deploy. Quiet window respected: production app tab closed immediately on lead request; no production polling or requests while backend D7 proof runs.

`RELEASE_ACCEPTANCE.md` tracks pending deployed/browser/device/provider/performance evidence. D7, actual English/Spanish/French media, two-session production consent/repair/room/replay, physical phone/screenreader and graph30/60profiling remain unverified in this milestone. No design changes or frozen-source edits. Immediate next action: lead integrates stable owned slice, runs reserved full checks/build and frontend E2E (including new spec), then provides final reviewed deployed commit for targeted CUA acceptance.
