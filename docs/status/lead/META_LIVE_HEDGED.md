# Meta Model API live; hedged drafting (25 Oct 2026, 07:00–07:12 CDT)

Supersedes the "Meta UNVERIFIED" line in VOICE_KICKOFF_META.md.

- User added META_MODEL_API_KEY to Vercel Production and redeployed (confirmed by name via `vercel env ls`; value never read).
- First live run failed: Muse Spark is a reasoning model whose reasoning tokens share max_tokens, so 2048 truncated the JSON ("unusable output"). b0dcb31 sets reasoning_effort "low" and max_tokens 8192, and logs only the failure shape (finish_reason, length, Zod issue paths), never text.
- Gemini 3.1 flash-lite was slow or timing out from both the Mac and production during this window (a plain "Say hi" call hung >60 s locally).
- 04b20e4 `draftWithFallback` (src/server/providers/meta.ts), used by coordinateMission and kickoffPlan: Gemini starts with a 25 s budget; if it hasn't answered in 6 s (or fails sooner), Meta starts in parallel and the first usable result wins. Without a Meta key it is the plain Gemini call. The Strategist second opinion stays a separate Meta call (9 s timeout, optional).
- Production after 04b20e4 (two-turn composer script on https://cohue.tech): 200 in 9.5 s and 13.8 s, drafter META both turns (Gemini slow), Strategist note each turn ("15 minutes is unrealistic for a 10-person repair café…"). Before the hedge one turn returned 503 after both providers failed; another had drafter GEMINI with a Meta Strategist note.
- Not re-verified after 04b20e4: kickoff plan on production (last verified on Gemini at 351ea0e) and Meta-drafted kickoff plans.

For Codex: the composer now depends on two LLM providers plus ElevenLabs for optional voice. If latency matters for the demo, watch Gemini health; Meta covers it. Unit 93/93, lint, types pass at 04b20e4; hosted CI not checked for b0dcb31/04b20e4.
