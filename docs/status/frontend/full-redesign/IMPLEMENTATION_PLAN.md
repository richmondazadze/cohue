# Full product redesign — active implementation plan

25 October 2026. User objective read from attached goal-objective.md. Preserve the full scope; do not mark done based on the first slices.

1. Shared workspace: extend approved App Shell2/landing visual vocabulary across composer, Theater, invitations, Room, replay, app entry, error/404. Preserve real LIVE/SHOWCASE and return-to-live controls.
2. Voice: microphone and waveform respond to measured recording intensity; playback visual responds to actual playback state; permission/transcription/failure remain semantic. Initial recording-intensity UI implemented, verification pending.
3. Identity: scout/license/download modern3D avatar assets; short username/avatar onboarding. Current strict profile contract supports displayName but no avatar or unique username; shared identity persistence requires authoritative contract/backend coordination. Do not pretend local avatars identify other users. Continue UI/asset work while resolving integration.
4. Composer: conversation/drafter/Strategist/speech states, structured requirements/time/group summary, review/edit/launch and draft-start failure states.
5. Theater: all lifecycle states, Mission/Needs/Map/Activity responsive panels; live interactive event-driven graph with committed agent/tool progress, explicit people/requirements/consent edges, zoom/fit and equivalent list. No manufactured business success or fake agent thoughts.
6. Invitation gate/decision: explicit redemption; original/translation/audio terms, updated-terms reread, accept/decline/counter sheets and truthful receipts, expiry/access/activation states.
7. Room: mobile Tasks/Brief/Team/Resources, desktop panels, kickoff languages/status, task conflict/save feedback, translation review and authorized audio, public-resource/review labels.
8. Impact/replay: measured recorded facts, event scrubber/navigation/history and historical map/list, empty/unavailable/access states.
9. Verify each slice with scoped checks and browser review; complete final check/audit/meaningful regression, document real versus fixture evidence. Avoid excessive duplicate testing. Synchronize both handoffs at meaningful milestones. No other-chat messaging until user authorizes it again; no spontaneous backend/shared-schema edits.

Completion is unproven until all objective sections and identity/assets/voice/live-board requirements are implemented and verified. This plan is not a scope reduction.

## Final audit

The identity authorization/persistence and UI/voice verification noted above were subsequently resolved. See `COMPLETION_AUDIT.md` for requirement-by-requirement implementation evidence, browser artifacts, real isolated PostgreSQL results and the explicit production release boundary. Production migration/deployment still awaits the user's later go-ahead; local implementation completion does not imply live synchronization.
