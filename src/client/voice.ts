"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioMimeSchema,
  CommandHeadersSchema,
  MEDIA_LIMITS,
  TranscriptionMetadataSchema,
  type ApiOutput,
} from "@/contracts";
import type { z } from "zod";
import { ApiRequestError, newIdempotencyKey, parseResponse } from "./http";

export type Transcription = ApiOutput<"transcribe">["data"];

/** First recorder MIME the browser supports from the contract allowlist (base type without codecs). */
export function pickRecorderMime(): { recorder: string; base: z.output<typeof AudioMimeSchema> } | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const candidate of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) {
        const base = AudioMimeSchema.safeParse(candidate.split(";")[0]);
        if (base.success) return { recorder: candidate, base: base.data };
      }
    } catch {
      /* continue */
    }
  }
  return null;
}

/** Multipart `audio` + JSON `metadata` to /api/voice/transcribe. Same key on an identical retry. */
export async function transcribeAudio(
  audio: Blob,
  metadata: z.input<typeof TranscriptionMetadataSchema>,
  idempotencyKey: string,
): Promise<Transcription> {
  const meta = TranscriptionMetadataSchema.safeParse(metadata);
  if (!meta.success)
    throw new ApiRequestError({
      operation: "transcribe",
      code: "INVALID_INPUT",
      message: "The recording is too long, too large or in an unsupported format.",
      status: null,
      retryable: false,
    });
  const headers = CommandHeadersSchema.parse({ "idempotency-key": idempotencyKey });
  const form = new FormData();
  form.append("audio", new File([audio], `recording.${meta.data.mimeType.split("/")[1]}`, { type: meta.data.mimeType }));
  form.append("metadata", JSON.stringify(meta.data));
  let res: Response;
  try {
    res = await fetch("/api/voice/transcribe", {
      method: "POST",
      body: form,
      headers: { accept: "application/json", ...headers },
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ApiRequestError({
      operation: "transcribe",
      code: "NETWORK",
      message: "Upload interrupted.",
      status: null,
      retryable: true,
    });
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  return parseResponse("transcribe", res.status, body);
}

export type RecorderState =
  | { phase: "idle" }
  | { phase: "requesting" }
  | { phase: "recording"; startedAt: number }
  | { phase: "recorded"; blob: Blob; durationMs: number; mime: z.output<typeof AudioMimeSchema> }
  | { phase: "denied" }
  | { phase: "unsupported" }
  | { phase: "error"; message: string };

/**
 * Explicit microphone recording. Permission is requested only on Record. Auto-stops at the contract
 * duration cap. `levelRef` receives live input level (0..1) from real samples, written outside React.
 */
export function useRecorder(onLevel?: (level: number) => void) {
  const [state, setState] = useState<RecorderState>({ phase: "idle" });
  const media = useRef<{ stream: MediaStream; recorder: MediaRecorder; ctx?: AudioContext; raf?: number; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const discardNext = useRef(false);

  const teardown = useCallback(() => {
    const m = media.current;
    if (!m) return;
    if (m.raf) cancelAnimationFrame(m.raf);
    if (m.timer) clearTimeout(m.timer);
    m.stream.getTracks().forEach((t) => t.stop());
    void m.ctx?.close().catch(() => undefined);
    media.current = null;
    onLevel?.(0);
  }, [onLevel]);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    const mime = pickRecorderMime();
    if (!mime || !navigator.mediaDevices?.getUserMedia) {
      setState({ phase: "unsupported" });
      return;
    }
    setState({ phase: "requesting" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState({ phase: "denied" });
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType: mime.recorder });
    const chunks: Blob[] = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      const durationMs = Math.min(Date.now() - startedAt, MEDIA_LIMITS.maxDurationMs);
      teardown();
      if (discardNext.current) {
        discardNext.current = false;
        setState({ phase: "idle" });
        return;
      }
      const blob = new Blob(chunks, { type: mime.base });
      if (blob.size > MEDIA_LIMITS.maxBytes) {
        setState({ phase: "error", message: "The recording is larger than 3 MB. Record a shorter message or type instead." });
        return;
      }
      if (!blob.size || durationMs < 300) {
        setState({ phase: "error", message: "Nothing was recorded. Try again or type instead." });
        return;
      }
      setState({ phase: "recorded", blob, durationMs, mime: mime.base });
    };
    media.current = { stream, recorder };
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC && onLevel) {
        const ctx = new AC();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          onLevel(Math.min(1, peak / 64));
          if (media.current) media.current.raf = requestAnimationFrame(tick);
        };
        media.current.ctx = ctx;
        media.current.raf = requestAnimationFrame(tick);
      }
    } catch {
      /* level meter is optional */
    }
    recorder.start(250);
    media.current.timer = setTimeout(() => recorder.state !== "inactive" && recorder.stop(), MEDIA_LIMITS.maxDurationMs - 250);
    setState({ phase: "recording", startedAt });
  }, [onLevel, teardown]);

  const stop = useCallback(() => {
    const r = media.current?.recorder;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const discard = useCallback(() => {
    const r = media.current?.recorder;
    if (r && r.state !== "inactive") {
      discardNext.current = true;
      r.stop();
    } else setState({ phase: "idle" });
  }, []);

  return { state, start, stop, discard, reset: () => setState({ phase: "idle" }) };
}

export const newVoiceKey = newIdempotencyKey;
