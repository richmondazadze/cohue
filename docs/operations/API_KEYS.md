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
