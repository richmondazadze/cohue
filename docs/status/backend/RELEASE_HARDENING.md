# Backend release hardening — 24 October 2026

Resumed at user request through lead delegation. Read repository instructions, both synchronized handoffs, backend work order and shared contract/resolution authorities. No architecture/design/contract changes; no production data tests or deployment claims. Lead serializes handoffs/commit.

## Fixed

- Exhausted runner jobs recheck mission input version, allowed state and current FAILED-job fence under locks before failing a mission. A late failure cannot clobber a corrected mission or newer lease.
- SerpApi reserves every attempted call before network I/O under a mission lock and current lease/fence check. The existing private job checkpoint JSON holds searchAttempts; aggregate maximum three per mission across jobs includes failed, empty and crash-interrupted calls. Burned reservations are deliberately conservative. No exactly-once external-call claim.
- Gemini, ElevenLabs STT and SerpApi JSON bodies pass bounded Zod boundary validation. Invalid provider payloads return safe typed errors instead of unchecked casts.
- Server measures uploaded audio duration with pinned music-metadata (lead-owned dependency addition), rejects unreadable/unknown/nonpositive/>60second audio regardless of client metadata. Raw upload bytes zeroed in finally, including failure; no disk persistence. Transient File/Blob copies remain GC-managed memory.
- Gemini reviewed extraction/translation uses low thinking for Gemini3/4 and a bounded30second provider timeout. The richer extraction prompt timed out with gemini-3.8-flash; actual account-listed gemini-3.1-flash-lite passed. Ignored local model configured to3.1 Flash Lite; lead must use same hosting setting.

## Evidence

- `COHUE_TEST_DATABASE_URL=postgresql://cohue@127.0.0.1:54329/cohue_test npx vitest run tests/backend`:12passed, no skipped DB test. Includes expired-lease recovery, stale commit fence, ordered events, three successful jobs; added late-exhaustion regression and ten concurrent search reservations admitting exactlythree, stale fence rejected.
- Owned ESLint run passed. Lead runs full check/audit/production smoke after integration.
- Generated local2second WAV/MP3/MP4/Ogg/WebM through ffmpeg, measured all successfully (2.0–2.04seconds). Unit test rejects61second WAV below3MB, accepts2second WAV, rejects malformed data. Artifacts are ignored; no raw participant audio used.
- Real application Gemini `extractProfile` and `extractMissionDraft` synthetic English/Spanish/French:6successful provider calls with `gemini-3.1-flash-lite`, schema/semantic validation and explicit requiresConfirmation true. Python mapped to taxonomy software; two web/design mission requirements returned per language. Original3.8Flash probes timed out at15/30seconds; no fixture fallback.

## Outstanding release verification

D7 is UNVERIFIED until deployed every-minute scheduler/worker progress with clients closed, restart/lease recovery, stale fence rejection, ordering and unique activation/member/task effects are captured. Vercel Hobby cannot run every-minute cron; lead resolves supported host/scheduler without silently buying a plan. Existing local runner test is rehearsal only. Creator-side translation listing remains an existing INVITATION-only contract gap; lead elected to defer contract expansion. Full localized invitation review/playback and end-to-end providers, phone/device/accessibility, actual deployed retention remain separate acceptance gates.

## Final verification additions

Provider fetch now retains its timeout through receipt of the body, caps upstream bodies at4MB, and maps oversized/invalid responses to safe errors. Gemini has a35second overall JSON retry deadline with at most20seconds per attempt, leaving headroom under the deployment60second limit. The authoritative local model is `gemini-3.1-flash-lite`.

Backend suite final run:13passed on actual isolated PostgreSQL (4files), owned ESLint passed. One real SerpApi search through actual local mission runner stored5public resources, reached PROPOSED, and included an explicitly unverified public-resource review in the deterministic rationale; it never became a human team member. Worker host template in scripts/worker/cohue-worker.service and HOST_SETUP.md is prepared, not installed or proven deployed.

Direct low-level translation calls returned JSON in English/Spanish/French in1.7–3.6seconds; French reformatted a timestamp. Strengthened invitation translation semantic check to require both binding ISO timestamps verbatim and requested literal timestamp preservation. This prevents changed-time output being offered as a valid translation; domain probe results follow separately. Machine translations remain REVIEW_REQUIRED and never confer consent.

Actual `localizeInvitation` against isolated test invitations with configured real Gemini3.1FlashLite passed Spanish and French: translated records present, REVIEW_REQUIRED, both canonical ISO timestamps preserved. Original English is approved canonical text. These are domain-level provider probes, not a deployed invitation UI acceptance claim.
