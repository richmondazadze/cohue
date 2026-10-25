import "server-only";
import { env } from "../config/env";
import { fail } from "../http/errors";
import { providerFetch } from "./http";

const base = "https://api.elevenlabs.io";
const lang = (tag: string) => tag.split("-")[0].toLowerCase();

// Raw audio is held only in memory for this call; nothing is written to storage.
export async function transcribeAudio(audio: Blob, filename: string, language: string): Promise<{ text: string; language: string }> {
  const key = env().ELEVENLABS_API_KEY;
  const model = env().ELEVENLABS_STT_MODEL;
  if (!key || !model) fail("PROVIDER_UNAVAILABLE", "Speech recognition is not configured; type your answer instead.");
  const form = new FormData();
  form.append("model_id", model!);
  form.append("language_code", lang(language));
  form.append("tag_audio_events", "false");
  form.append("file", audio, filename);
  const response = await providerFetch("ElevenLabs speech-to-text", `${base}/v1/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": key! },
    body: form,
  }, 30_000);
  const body = (await response.json()) as { text?: string; language_code?: string };
  const text = body.text?.trim();
  if (!text) fail("PROVIDER_UNAVAILABLE", "No speech was recognized; try again or type instead.");
  return { text: text!.slice(0, 2000), language: body.language_code ? lang(body.language_code) : lang(language) };
}

export async function synthesizeSpeech(text: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const key = env().ELEVENLABS_API_KEY;
  const model = env().ELEVENLABS_TTS_MODEL;
  const voice = env().ELEVENLABS_VOICE_ID;
  if (!key || !model || !voice) fail("PROVIDER_UNAVAILABLE", "Voice playback is not configured; the written text is authoritative.");
  const response = await providerFetch(
    "ElevenLabs text-to-speech",
    `${base}/v1/text-to-speech/${encodeURIComponent(voice!)}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": key!, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: text.slice(0, 2000), model_id: model }),
    },
    30_000,
  );
  return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: "audio/mpeg" };
}
