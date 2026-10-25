# Coordinator voice, kickoff plan and Meta Muse Spark (25 Oct 2026, ~06:55 CDT)

Commits 351ea0e and the follow-up language fix, on main and cohue.tech. Contract 1.1.0 additive, now 42 operations (coordinateMission, speakCoordinator, kickoffPlan added today).

- Coordinator voice: replies render as text first; with "Speak replies aloud" on, the client requests speakCoordinator, which voices only the Coordinator's own words for this session (HMAC over principal + text with a SESSION_SECRET-derived key; tampered text or another principal returns FORBIDDEN, unit-tested). ElevenLabs eleven_multilingual_v2; device speech is the fallback. Production: speech 200, audio/mpeg ~128 KB (~3.5 s TTS). Replies and questions now follow the language of the creator's latest message.
- Meta Model API (https://api.meta.ai/v1, Chat Completions, json_schema response_format, model META_MODEL default muse-spark-1.3, key META_MODEL_API_KEY): Strategist second opinion on each Coordinator draft (shown as a dashed "St" bubble with the model name), and fallback drafter for coordinateMission and kickoffPlan when Gemini fails. Not yet configured in Vercel at this checkpoint, so production runs Gemini-only; nothing changes when the key is absent. Real Meta calls are UNVERIFIED until the key is added.
- kickoffPlan (GET /api/missions/:id/kickoff, MEMBER, same audience as room()): advisory first-hour steps per approved role plus a check-in line, in en/es/fr (switch in the Room), Gemini with Meta fallback, cached per mission version and language in process memory. Production (showcase journey spec with COHUE_EXPECT_PROVIDERS=1) returned a Spanish plan for all three roles; the synthetic mission was cancelled by the spec.

Observed: Gemini 3.1 flash-lite had intermittent 20 s timeouts from this Mac around 06:45 CDT (several turns 1.5–12 s, one abort), which is the motivation for the Meta fallback.

Tests: 93 unit (coordinator turn, signature binding), mocked UI 6/6 (core loop now asserts the kickoff plan and language switch), build. Mock backend serves kickoffPlan.
