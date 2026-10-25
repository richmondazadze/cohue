"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import type { ApiData } from "@/client/http";
import { useCommand } from "@/client/command";
import { Button } from "@/components/ui/button";
import { Checkbox, TextArea } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { PlaybackMeter } from "@/components/voice/playback-meter";
import { RecordControl } from "@/components/voice/record-control";
import { cx } from "@/components/ui/cx";

type Turn = {
  role: "CREATOR" | "COORDINATOR";
  text: string;
  questions?: string[];
  drafter?: "GEMINI" | "META";
  strategist?: { model: string; note: string } | null;
  /** What this turn filled in the brief, shown as it lands. */
  filled?: string[];
};
export type CoordinatorDraft = ApiData<"coordinateMission">["draft"];

const MAX_TURNS = 12;
const SPEAK_KEY = "cohue.coordinator.speak";

const MODEL_NAME = { GEMINI: "Gemini", META: "Meta Muse Spark" } as const;

function filledFrom(d: CoordinatorDraft): string[] {
  const out = ["Objective"];
  if (d.expectedOutput) out.push("Expected output");
  if (d.requirements.length) out.push(`${d.requirements.length} skill${d.requirements.length === 1 ? "" : "s"} needed`);
  const c = d.constraintsDraft;
  if (c.minGroupSize || c.maxGroupSize)
    out.push(c.minGroupSize === c.maxGroupSize || !c.maxGroupSize ? `Group of ${c.minGroupSize ?? c.maxGroupSize}` : `Group of ${c.minGroupSize ?? 1}–${c.maxGroupSize}`);
  if (c.minOverlapMinutes) out.push(`${c.minOverlapMinutes} min together`);
  return out;
}

/**
 * A conversation with the Coordinator agent. Each turn re-drafts the whole brief from everything said so far
 * and fills the form below; nothing is saved or started until the creator reviews and starts discovery.
 */
export function CoordinatorChat({
  language,
  ensureSession,
  onDraft,
  onReady,
}: {
  language: string;
  ensureSession: () => Promise<boolean>;
  onDraft: (draft: CoordinatorDraft) => void;
  onReady: () => void;
}) {
  const turnCmd = useCommand("coordinateMission");
  const speakCmd = useCommand("speakCoordinator");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speaking,setSpeaking]=useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceEpoch = useRef(0);
  const voiceEnabled = useRef(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  // Hands-free flow: what happens next waits until the Coordinator has finished speaking.
  const afterSpeech = useRef<(() => void) | null>(null);
  const runAfterSpeech = () => {
    const next = afterSpeech.current;
    afterSpeech.current = null;
    next?.();
  };
  const [startSignal, setStartSignal] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSpeaking = () => {
    voiceEpoch.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
    setVoiceUnavailable(false);
  };
  const speak = (audio: { mimeType: string; base64: string } | null, epoch: number) => {
    if (!voiceEnabled.current || epoch !== voiceEpoch.current) return;
    // Only playable audio can supply a truthful intensity signal. Provider failure keeps the full text.
    if (!audio) { setVoiceUnavailable(true); runAfterSpeech(); return; }
    const element = new Audio(`data:${audio.mimeType};base64,${audio.base64}`);
    audioRef.current = element;
    element.onplay = () => { if (epoch === voiceEpoch.current) setSpeaking(true); };
    element.onpause = () => { if (epoch === voiceEpoch.current) setSpeaking(false); };
    element.onended = () => { if (epoch === voiceEpoch.current) { setSpeaking(false); runAfterSpeech(); } };
    const unavailable = () => { if (epoch === voiceEpoch.current) { setSpeaking(false); setVoiceUnavailable(true); runAfterSpeech(); } };
    element.onerror = unavailable;
    void element.play().catch(unavailable);
  };
  const [text, setText] = useState("");
  // The composer renders only after hydration, so device storage can seed state directly.
  const [speakReplies, setSpeakReplies] = useState(() => {
    try { return localStorage.getItem(SPEAK_KEY) === "1"; } catch { return false; }
  });
  const log = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const canSpeak = typeof window !== "undefined" && "Audio" in window;

  useEffect(() => {
    voiceEnabled.current = speakReplies;
  }, [speakReplies]);
  useEffect(() => () => {
    voiceEpoch.current += 1;
    audioRef.current?.pause();
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);
  useEffect(() => {
    log.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [turns, turnCmd.isPending]);

  const toggleSpeak = (v: boolean) => {
    voiceEnabled.current = v;
    setSpeakReplies(v);
    if (!v) stopSpeaking();
    try { localStorage.setItem(SPEAK_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  };

  const cancelAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
    setAdvancing(false);
  };

  const send = async (spoken?: string) => {
    const viaVoice = spoken !== undefined;
    const said = (viaVoice ? [text.trim(), spoken.trim()].filter(Boolean).join(" ") : text.trim()).slice(0, 2000);
    if (!said || turnCmd.isPending || turns.length >= MAX_TURNS - 1) return;
    if (!(await ensureSession())) return;
    // The questions the Coordinator asked are part of what the creator is answering.
    const next = [...turns, { role: "CREATOR" as const, text: said }].map(({ role, text, questions }) => ({
      role,
      text: [text, ...(questions ?? [])].join(" ").slice(0, 2000),
    }));
    stopSpeaking();
    cancelAdvance();
    afterSpeech.current = null;
    const epoch = voiceEpoch.current;
    setTurns([...turns, { role: "CREATOR", text: said }]);
    setText("");
    turnCmd.mutate(
      { input: { language, turns: next } },
      {
        onSuccess: (x) => {
          setTurns((t) => [
            ...t,
            { role: "COORDINATOR", text: x.reply, questions: x.questions, drafter: x.drafter, strategist: x.strategist, filled: filledFrom(x.draft) },
          ]);
          onDraft(x.draft);
          // Autonomous next step: a complete brief flows on to review; open questions reopen the microphone
          // for someone who is talking rather than typing. Either waits until the reply has been spoken.
          const next = !x.questions.length
            ? () => {
                setAdvancing(true);
                advanceTimer.current = setTimeout(() => {
                  advanceTimer.current = null;
                  setAdvancing(false);
                  onReady();
                }, 2200);
              }
            : viaVoice
              ? () => setStartSignal((n) => n + 1)
              : null;
          if (next) {
            if (voiceEnabled.current && epoch === voiceEpoch.current) afterSpeech.current = next;
            else setTimeout(next, x.questions.length ? 700 : 0);
          }
          if (voiceEnabled.current && epoch === voiceEpoch.current)
            // Text is already on screen; an audio failure never hides the reply.
            speakCmd.mutate(
              { input: { speech: x.speech } },
              {
                onSuccess: (audio) => speak(audio, epoch),
                onError: () => speak(null, epoch),
              },
            );
          if (!viaVoice) requestAnimationFrame(() => input.current?.focus());
        },
        onError: () => {
          // Keep what they said so a retry is one tap.
          setTurns(turns);
          setText(said);
        },
      },
    );
  };

  const lastIsCoordinator = turns.at(-1)?.role === "COORDINATOR";
  const ready = lastIsCoordinator && !turns.at(-1)?.questions?.length;
  const full = turns.length >= MAX_TURNS - 1;

  return (
    <div className="coordinator-conversation flex flex-col gap-4">
      <header className="coordinator-head">
        <p className="eyebrow">Coordinator</p>
        <h2 className="type-panel mt-1">Tell me your idea.</h2>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          Talk or type. I&apos;ll ask what&apos;s missing and fill in the brief for you. Nothing is saved or sent until you start discovery.
        </p>
      </header>

      {speakReplies && speakCmd.isPending ? <p role="status" className="coordinator-speaking">Preparing the Coordinator’s voice…</p> : null}
      {speaking ? <div className="coordinator-speaking" role="status"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 9 5 0 5-4v14l-5-4H4V9Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><PlaybackMeter audio={audioRef} playing={speaking} label="Coordinator is speaking" /><Button size="sm" onClick={stopSpeaking}>Stop voice</Button></div> : null}
      {voiceUnavailable && speakReplies ? <Notice tone="info" title="Voice is unavailable">The full reply is in the conversation below. You can keep going by text.</Notice> : null}
      {turns.length ? (
        <ol ref={log} aria-live="polite" aria-label="Conversation with the Coordinator" className="m-0 flex max-h-[420px] list-none flex-col gap-3 overflow-y-auto p-0">
          {turns.map((t, i) => (
            <Fragment key={i}>
            <li className={cx("flex", t.role === "CREATOR" ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[85%] rounded-panel px-4 py-3 text-sm leading-6 break-words",
                  t.role === "CREATOR" ? "bg-action text-white" : "border border-line-panel bg-subtle",
                )}
              >
                <span className="sr-only">{t.role === "CREATOR" ? "You: " : "Coordinator: "}</span>
                {t.text}
                {t.questions?.length ? (
                  <ul className="mt-2 flex list-none flex-col gap-1 p-0 font-medium">
                    {t.questions.map((q) => <li key={q}>→ {q}</li>)}
                  </ul>
                ) : null}
                {t.filled?.length ? (
                  <ul className="coordinator-filled" aria-label="Filled in the brief">
                    {t.filled.map((f, k) => (
                      <li key={f} style={{ "--fill-i": k } as React.CSSProperties}>✓ {f}</li>
                    ))}
                  </ul>
                ) : null}
                {t.drafter ? <span className="type-meta mt-2 block text-muted">Coordinator · {MODEL_NAME[t.drafter]}</span> : null}
              </div>
            </li>
            {t.strategist ? (
              <li className="flex justify-start">
                <div className="flex max-w-[85%] gap-2 rounded-panel border border-dashed border-line-control px-4 py-3 text-sm leading-6">
                  <span aria-hidden className="type-meta mt-0.5 h-fit rounded-compact border border-line-control px-1.5 font-semibold">St</span>
                  <span>
                    <span className="sr-only">Strategist: </span>
                    {t.strategist.note}
                    <span className="type-meta mt-1 block text-muted">Strategist second opinion · Meta {t.strategist.model}</span>
                  </span>
                </div>
              </li>
            ) : null}
            </Fragment>
          ))}
          {turnCmd.isPending ? (
            <li className="flex justify-start">
              <div className="rounded-panel border border-line-panel bg-subtle px-4 py-3 text-sm text-muted" role="status">
                Coordinator is thinking…
              </div>
            </li>
          ) : null}
        </ol>
      ) : null}

      {ready ? (
        <div className="flex flex-wrap items-center gap-3 rounded-field bg-approved-bg px-4 py-3 text-sm text-approved" role="status">
          <span className="font-medium">
            {advancing ? "✓ Brief complete. Taking you to review…" : "✓ The brief below has what I need to search."}
          </span>
          <Button size="sm" variant="primary" onClick={() => { cancelAdvance(); onReady(); }}>Review the brief</Button>
          {advancing ? <Button size="sm" variant="tertiary" onClick={cancelAdvance}>Stay here</Button> : null}
        </div>
      ) : null}

      {turnCmd.isError ? (
        <ErrorNotice error={turnCmd.error} title="The Coordinator could not answer. Your words are kept; send again or fill the fields below." />
      ) : null}

      {full ? (
        <p className="type-meta text-muted">That&apos;s the end of this conversation. Finish the details in the form below.</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="coordinator-input" className="sr-only">
            {turns.length ? "Answer the Coordinator" : "Describe the mission"}
          </label>
          <TextArea
            ref={input}
            id="coordinator-input"
            rows={turns.length ? 2 : 3}
            className="text-lg"
            maxLength={2000}
            placeholder={turns.length ? "Answer, or add anything else…" : "Let's bring a repair café to our neighborhood…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" variant={turns.length ? "secondary" : "primary"} disabled={!text.trim()} pending={turnCmd.isPending} pendingLabel="Coordinator is thinking…">
              {turns.length ? "Send" : "Talk to the Coordinator"}
            </Button>
            {canSpeak ? (
              <Checkbox checked={speakReplies} onCheckedChange={toggleSpeak} label="Speak replies aloud" />
            ) : null}
          </div>
          <RecordControl
            purpose="MISSION"
            language={language}
            label={turns.length ? "Answer by voice" : "Describe it by voice"}
            autoTranscribe
            startSignal={startSignal}
            // Spoken answers go straight to the Coordinator; the conversation shows exactly what was heard.
            onTranscript={(t) => void send(t)}
          />
        </form>
      )}
    </div>
  );
}
