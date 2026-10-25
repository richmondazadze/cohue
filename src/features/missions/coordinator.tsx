"use client";
import { useEffect, useRef, useState } from "react";
import type { ApiData } from "@/client/http";
import { useCommand } from "@/client/command";
import { Button } from "@/components/ui/button";
import { Checkbox, TextArea } from "@/components/ui/field";
import { ErrorNotice } from "@/components/ui/notice";
import { RecordControl } from "@/components/voice/record-control";
import { cx } from "@/components/ui/cx";

type Turn = { role: "CREATOR" | "COORDINATOR"; text: string; questions?: string[] };
export type CoordinatorDraft = ApiData<"coordinateMission">["draft"];

const MAX_TURNS = 12;
const SPEAK_KEY = "cohue.coordinator.speak";
const VOICE_LANG: Record<string, string> = { en: "en-US", es: "es-ES", fr: "fr-FR" };

/** Spoken replies use the browser's own speech engine: no audio leaves the device and nothing is stored. */
function speak(text: string, language: string) {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[language] ?? language;
  synth.speak(u);
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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  // The composer renders only after hydration, so device storage can seed state directly.
  const [speakReplies, setSpeakReplies] = useState(() => {
    try { return localStorage.getItem(SPEAK_KEY) === "1"; } catch { return false; }
  });
  const log = useRef<HTMLOListElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => globalThis.speechSynthesis?.cancel(), []);
  useEffect(() => {
    log.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns, turnCmd.isPending]);

  const toggleSpeak = (v: boolean) => {
    setSpeakReplies(v);
    if (!v) globalThis.speechSynthesis?.cancel();
    try { localStorage.setItem(SPEAK_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  };

  const send = async () => {
    const said = text.trim().slice(0, 2000);
    if (!said || turnCmd.isPending || turns.length >= MAX_TURNS - 1) return;
    if (!(await ensureSession())) return;
    // The questions the Coordinator asked are part of what the creator is answering.
    const next = [...turns, { role: "CREATOR" as const, text: said }].map(({ role, text, questions }) => ({
      role,
      text: [text, ...(questions ?? [])].join(" ").slice(0, 2000),
    }));
    setTurns([...turns, { role: "CREATOR", text: said }]);
    setText("");
    turnCmd.mutate(
      { input: { language, turns: next } },
      {
        onSuccess: (x) => {
          setTurns((t) => [...t, { role: "COORDINATOR", text: x.reply, questions: x.questions }]);
          onDraft(x.draft);
          if (speakReplies) speak([x.reply, ...x.questions].join(" "), language);
          requestAnimationFrame(() => input.current?.focus());
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
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-action text-sm font-semibold text-white">
          C
        </span>
        <div>
          <p className="font-semibold">Coordinator</p>
          <p className="text-sm text-muted">
            Tell me the idea in your own words, by voice or text. I&apos;ll ask what&apos;s missing and fill in the brief below. Nothing is saved or sent yet.
          </p>
        </div>
      </div>

      {turns.length ? (
        <ol ref={log} aria-live="polite" aria-label="Conversation with the Coordinator" className="m-0 flex max-h-[420px] list-none flex-col gap-3 overflow-y-auto p-0">
          {turns.map((t, i) => (
            <li key={i} className={cx("flex", t.role === "CREATOR" ? "justify-end" : "justify-start")}>
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
              </div>
            </li>
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
        <div className="flex flex-wrap items-center gap-3 rounded-field bg-approved-bg px-4 py-3 text-sm text-approved">
          <span className="font-medium">✓ The brief below has what I need to search.</span>
          <Button size="sm" variant="primary" onClick={onReady}>Review the brief</Button>
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
            onTranscript={(t) => {
              setText((cur) => [cur.trim(), t].filter(Boolean).join(" ").slice(0, 2000));
              requestAnimationFrame(() => input.current?.focus());
            }}
          />
        </form>
      )}
    </div>
  );
}
