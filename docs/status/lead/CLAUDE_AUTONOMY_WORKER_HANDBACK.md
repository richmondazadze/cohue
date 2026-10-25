# Claude lead continuation: autonomy features, worker release, handback to Codex

25 Oct 2026, 05:40–06:35 CDT. User assigned Claude both specialist roles plus lead. All work is on main and pushed; hosted CI green on 7a18331, 11b124e, 39f1b75, 6f573f0 (0522dda/5f31b3b runs were in progress at handback).

## What Claude did after Codex's 711a4b3 checkpoint

- 7a18331 live bug fixes from the user's testing: showcase visit no longer replaces the LIVE guest identity (parked `cohue_live` cookie, restored on return); Chrome/Android WebM voice recordings measured from the EBML block timeline (src/server/domain/webm-duration.ts) when the header has no duration. See LIVE_BUGFIX_SESSION_VOICE.md.
- 11b124e 200-person labelled synthetic SHOWCASE crowd (scripts/worker/showcase-crowd.sql, run by seed:showcase); applied to production once; LIVE untouched. See SHOWCASE_CROWD.md.
- 39f1b75 Coordinator conversation in the composer: new additive operation `coordinateMission` (POST /api/missions/coordinate, SESSION, idempotent; docs/API_OPERATIONS.json updated; contract version unchanged 1.1.0, now 40 operations). Gemini replies, asks at most two follow-ups (expected output, who/how many, time together) and re-drafts the whole review-only brief each turn; max 12 turns; optional spoken replies via the browser's speechSynthesis (no audio stored). The one-shot "Draft structured brief" button was replaced by this chat; extractMission remains for API compatibility. App-wide LiveAlerts (src/components/shell/live-alerts.tsx): polls this device's inbox and its 3 most recent missions, shows an in-app alert with chime/vibrate and a background tab-title count for a new PENDING invitation or a mission moving to PROPOSED/REPROPOSED/REPLANNING/ACTIVATED/PAUSED_FOR_HUMAN/EXPIRED/FAILED; suppressed on the page already showing it; seen state in localStorage per principal.
- 6f573f0 Coordinator "why" lines in the Activity feed (explainEvent in src/features/theater/model.ts), built only from committed events/proposals: candidate count, groups checked/elapsed and who covers what, repair kept/added, activation. No model reasoning is emitted.
- 0522dda scripts/worker/release.sh plus `status` and `sync <commit>` modes in on-host-acceptance.sh. /opt/cohue is an extracted codeload archive, not a git checkout.
- Worker released to 0522dda with the user's explicit approval in the thread ("I approve updating the production worker"); auto-restart proved by SIGKILL. See RELEASE_0522DDA.md.

Tests: 93 unit tests, lint, types, production build; mocked UI suite 6/6 including new tests/e2e/frontend/live-alerts.spec.ts and tests/backend/coordinator.test.ts. Real Gemini conversations checked in English and Spanish; a real two-turn conversation on cohue.tech filled objective, expected output, 3 requirements, group 4, 180 min.

## For Codex: what Claude could NOT confirm from your work

- Worker sync to 711a4b3: never happened. At 06:15 CDT the host's .release-commit was still 266a240 (last start 05:59:27 UTC, "worker b8f62939 started"). It is now 0522dda (superset of 711a4b3); previous release kept at /opt/cohue-266a240.
- docs/status/lead/FINAL_RELEASE_CHECKPOINT.md was left untracked and not appended to the handoffs. Claude committed it unchanged and appended it before this note so its content is preserved.
- No deployed D7 kill/recovery proof exists for 711a4b3 or later; the last proof is cd32236. scripts/worker/prove-d7.ts hard-codes the 25 Oct window and needs updating before a rerun.
- A local process (yours) held :3100 throughout; Claude used its own server on :3102.
- From this Mac the Tiger PostgreSQL port was unreachable at ~06:00 CDT, so the DB-backed tests/e2e/frontend/live-features.spec.ts (updated for the chat) were verified only by hosted CI, not locally.

## Still open

Human two-phone run on production (now including live alerts), organizer review of real es/fr Room translations, phone Listen/task change/voice input, physical accessibility/performance checks. Known UX notes: repair heading can appear before the new team card; one tap target under 24 px on /missions/new. User said not to worry about the video and Devpost submission in this thread.
