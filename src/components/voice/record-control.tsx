"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { useRecorder, transcribeAudio, newVoiceKey } from "@/client/voice";
import { useReducedMotionPreference } from "@/client/media";
import { MEDIA_LIMITS } from "@/contracts";
import "./voice-meter.css";

type Purpose = "PROFILE" | "MISSION" | "INVITATION_RESPONSE";

/**
 * Record → upload → editable transcript. The transcript is handed to the caller as a draft; nothing is
 * submitted, accepted or extracted automatically. Every failure leaves typing available.
 */
type RecordControlProps = {
  purpose: Purpose;
  language: string;
  onTranscript: (text: string) => void;
  label?: string;
  beforeTranscribe?: () => Promise<void>;
};
export function RecordControl(props: RecordControlProps) {
  // Changing source/language retires uploads, recording state and callbacks together.
  return <RecordingSession key={`${props.purpose}:${props.language}`} {...props} />;
}
function RecordingSession({ purpose, language, onTranscript, label = "Record instead", beforeTranscribe }: RecordControlProps) {
  const meter = useRef<HTMLSpanElement>(null);
  const bars = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotionPreference();
  const onLevel = useCallback(
    (level: number) => {
      if (meter.current) meter.current.style.transform = `scaleX(${reduced ? 1 : Math.max(0.04, level)})`;
      bars.current?.querySelectorAll<HTMLElement>("span").forEach((bar, index) => {
        const weight = [0.4, 0.65, 0.85, 1, 0.85, 0.65, 0.4][index];
        bar.style.transform = `scaleY(${reduced ? 0.45 : Math.max(0.12, Math.min(1, level * 2.5 * weight))})`;
      });
    },
    [reduced],
  );
  const rec = useRecorder(onLevel);
  const [elapsed, setElapsed] = useState(0);
  const [upload, setUpload] = useState<{ phase: "idle" | "uploading" | "done" } | { phase: "error"; error: unknown }>({ phase: "idle" });
  const key = useRef<string | null>(null);
  const uploadRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { uploadRequest.current?.abort(); }, [purpose, language]);

  const startedAt = rec.state.phase === "recording" ? rec.state.startedAt : null;
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(t);
  }, [startedAt]);

  const send = async () => {
    if (rec.state.phase !== "recorded") return;
    key.current ??= newVoiceKey();
    setUpload({ phase: "uploading" });
    uploadRequest.current?.abort();
    const controller = new AbortController();
    uploadRequest.current = controller;
    try {
      await beforeTranscribe?.();
      if (controller.signal.aborted) return;
      const result = await transcribeAudio(
        rec.state.blob,
        {
          purpose,
          language,
          mimeType: rec.state.mime,
          sizeBytes: rec.state.blob.size,
          durationMs: Math.max(1, Math.round(rec.state.durationMs)),
        },
        key.current,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      key.current = null;
      setUpload({ phase: "done" });
      onTranscript(result.transcript);
      rec.reset();
    } catch (error) {
      if (controller.signal.aborted) return;
      setUpload({ phase: "error", error });
    }
  };

  const secs = Math.floor(elapsed / 1000);
  const p = rec.state.phase;
  return (
    <div className="flex flex-col gap-2">
      {p === "idle" || p === "denied" || p === "unsupported" || p === "error" ? (
        <div>
          <Button
            size="sm"
            onClick={() => {
              setUpload({ phase: "idle" });
              key.current = null;
              setElapsed(0);
              void rec.start();
            }}
            disabled={p === "unsupported"}
          >
            <span aria-hidden="true">●</span> {label}
          </Button>
        </div>
      ) : null}
      {p === "requesting" ? <p className="type-meta text-muted">Waiting for microphone permission…</p> : null}
      {p === "recording" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-field border border-line-control bg-surface p-3" role="status">
          <span className="voice-recording-visual" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6"/></svg><span ref={bars} className="voice-intensity">{Array.from({length:7},(_,i)=><span key={i}/>)}</span></span>
          <span className="type-compact text-declined">● Recording</span>
          <span className="type-meta tabular text-muted">
            {secs}s / {MEDIA_LIMITS.maxDurationMs / 1000}s
          </span>
          {!reduced ? (
            <span aria-hidden="true" className="h-1.5 w-24 overflow-hidden rounded-full bg-hover">
              <span ref={meter} className="block h-full w-full origin-left bg-action" style={{ transform: "scaleX(0.04)" }} />
            </span>
          ) : null}
          <Button size="sm" variant="primary" onClick={rec.stop}>
            Stop
          </Button>
          <Button size="sm" variant="tertiary" onClick={rec.discard}>
            Discard
          </Button>
        </div>
      ) : null}
      {p === "recorded" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="type-meta text-muted tabular">
            Recorded {Math.round(rec.state.durationMs / 1000)}s
          </span>
          <Button size="sm" variant="primary" onClick={send} pending={upload.phase === "uploading"} pendingLabel="Uploading and transcribing…">
            Transcribe to text
          </Button>
          <Button size="sm" variant="tertiary" onClick={() => { key.current = null; setUpload({ phase: "idle" }); rec.reset(); }} disabled={upload.phase === "uploading"}>
            Discard
          </Button>
        </div>
      ) : null}
      {p === "denied" ? (
        <Notice tone="pending">Microphone access was not allowed. You can type instead; nothing is lost.</Notice>
      ) : null}
      {p === "unsupported" ? (
        <p className="type-meta text-muted">Recording is not supported in this browser. Typing works everywhere.</p>
      ) : null}
      {rec.state.phase === "error" ? <Notice tone="pending">{rec.state.message}</Notice> : null}
      {upload.phase === "error" ? (
        <ErrorNotice error={upload.error} title="Transcription unavailable. No transcript was added; type instead or retry." onRetry={send} />
      ) : null}
      {upload.phase === "done" ? (
        <p role="status" className="type-meta text-approved">
          ✓ Transcript added as an editable draft. Review it before using it.
        </p>
      ) : null}
    </div>
  );
}
