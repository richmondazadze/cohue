# COHUE remaining provider credentials

Store secrets only in ignored `.env.local` and the eventual Vercel/worker secret settings. Never put keys in chat, committed files, NEXT_PUBLIC variables, screenshots or logs. A browser login is not an application API credential.

| Variable | Where to obtain it | Required use |
| --- | --- | --- |
| GEMINI_API_KEY | Google AI Studio API keys: https://aistudio.google.com/api-keys ; create a key restricted to Gemini API in your project | Reviewed mission/profile extraction and invitation translation |
| ELEVENLABS_API_KEY | ElevenLabs → Developers → API Keys; create a restricted COHUE key with speech-to-text and text-to-speech permissions | Transcription and spoken invitation/brief playback |
| SERPAPI_API_KEY | SerpApi dashboard: https://serpapi.com/manage-api-key | Scout public-opportunity discovery |

Also configure these non-secret identifiers after checking account availability: GEMINI_MODEL, ELEVENLABS_STT_MODEL, ELEVENLABS_TTS_MODEL and ELEVENLABS_VOICE_ID. Choose a voice in ElevenLabs Voices/My Voices and use its voice ID. Model and voice IDs are not additional API keys. English, Spanish and French must be verified with actual account calls before claiming readiness.

DATABASE_URL is the Tiger Data PgBouncer/runtime URI; DATABASE_MIGRATION_URL is the direct URI. Credentials are service-specific; the Tiger Data account's credit balance does not replace database authentication. Keep direct migration access separate from the bounded runtime pool where possible. No Tiger management API key is required by the running application.

SESSION_SECRET and DISPATCHER_SECRET are locally generated cryptographic random values, not vendor API keys. Set CRON_SECRET equal to DISPATCHER_SECRET if using Vercel Cron. These will be generated/configured without asking the user to invent them. Existing secrets must not be rotated unnecessarily because sessions and invitation links derive from them.

Official references checked for this setup: https://ai.google.dev/gemini-api/docs/api-key , https://elevenlabs.io/docs/help-center/technical/how-do-i-authorize-myself-using-an-api-key , https://serpapi.com/blog/getting-started-with-serpapi-the-web-search-api/ .

## Local setup verified — 24 October 2026

All three provider keys are configured in ignored, mode0600 `.env.local`. Gemini project `gen-lang-client-0252269051` remains free tier with billing disabled. `GEMINI_MODEL=gemini-3.8-flash` passed an actual structured JSON generation request with English/Spanish/French fields. The older 2.5 Flash model was listed but rejected for new users.

ElevenLabs uses `ELEVENLABS_TTS_MODEL=eleven_multilingual_v2`, `ELEVENLABS_STT_MODEL=scribe_v2`, and Sarah voice `EXAVITQu4vr4xnSDxMaL`. Actual English TTS and transcription of that synthetic audio both returned HTTP200. SerpApi authenticated account request returned HTTP200 with1,250 searches available. Full product three-language acceptance and deployed provider behavior remain to be tested. Copy secret values to hosting secret settings securely during deployment; local configuration does not configure Vercel or a worker automatically.

Release follow-up: authoritative deployed model is now `gemini-3.1-flash-lite`, verified by real application profile/mission extraction in English/Spanish/French and timestamp-preserving Spanish/French invitation localization. This supersedes the earlier generic3.8probe. Production Vercel secrets configured securely; worker credentials remain to be installed onVultr.
