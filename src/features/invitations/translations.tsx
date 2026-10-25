"use client";
import { PlaybackMeter } from "@/components/voice/playback-meter";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiOutput, Invitation } from "@/contracts";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { ErrorNotice } from "@/components/ui/notice";
import { useCommand } from "@/client/command";
import { ApiRequestError } from "@/client/http";
import { keys } from "@/client/queries";
import { languageName } from "@/features/shared/skills";

export type Localized = ApiOutput<"getInvitation">["data"]["localized"][number];

/** Never render/play translations from a different invitation or superseded source revision. */
export function currentTranslations(items: Localized[], invitation: Invitation): Localized[] {
  return items.filter((item) => item.sourceId === invitation.id && item.sourceVersion === invitation.proposalRevision);
}

const statusLabel = (l: Localized) =>
  l.status === "APPROVED"
    ? "Translation reviewed by the organizer"
    : l.status === "REVIEW_REQUIRED"
      ? "Machine translation · review required"
      : l.status === "FAILED"
        ? "Translation unavailable"
        : "Machine translation";

/**
 * Translations sit beside the binding original; they never replace or change it. Listening is explicit
 * and optional; every failure leaves the text.
 */
export function Translations({
  items,
  invitation,
  organizerReview = false,
}: {
  items: Localized[];
  invitation: Invitation;
  organizerReview?: boolean;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const current = currentTranslations(items, invitation);
  if (!current.length) return null;
  return (
    <section className="mt-5 flex flex-col gap-3" aria-label="Translations">
      {current.map((l) =>
        l.language === l.originalLanguage ? (
          // The server lists the binding original first so playback can bind to its hash; its text is shown below.
          <div key={`${l.id}:${l.version}:${l.canonicalTextHash}:${l.status}`} className="flex flex-wrap gap-3">
            <Listen
              id={`${l.id}-orig`}
              label={`Listen in ${languageName(l.originalLanguage)} (original)`}
              active={playing === `${l.id}-orig`}
              onActivate={setPlaying}
              source={invitationSource(invitation)}
              language={l.originalLanguage}
              hash={l.canonicalTextHash}
            />
          </div>
        ) : (
          <article
            key={`${l.id}:${l.version}:${l.canonicalTextHash}:${l.status}`}
            lang={l.language}
            className="rounded-field border border-line-panel bg-subtle p-4"
          >
            <p className="eyebrow mb-2">
              {languageName(l.language)} · {statusLabel(l)}
            </p>
            {l.status !== "FAILED" ? (
              <p className="max-w-[60ch] whitespace-pre-wrap">{l.text}</p>
            ) : null}
            <p className="type-meta mt-2 text-muted">
              The binding original terms ({languageName(l.originalLanguage)}) are
              what you agree to. If the translation seems different, suggest a
              change instead of accepting.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {l.status === "APPROVED" ? <Listen
                key={`${l.id}-tr`}
                id={`${l.id}-tr`}
                label={`Listen in ${languageName(l.language)}`}
                active={playing === `${l.id}-tr`}
                onActivate={setPlaying}
                source={invitationSource(invitation)}
                language={l.language}
                hash={l.canonicalTextHash}
              /> : <p className="type-meta text-muted">Playback is available after the organizer reviews this translation.</p>}
            </div>
            {organizerReview ? (
              <OrganizerReview
                item={l}
                queryKeys={[keys.invitationReview(invitation.id), keys.invitation(invitation.id)]}
              />
            ) : null}
          </article>
        ),
      )}
    </section>
  );
}

export type PlaybackSource = { sourceId: string; sourceKind: "INVITATION" | "BRIEF"; sourceVersion: number };
const invitationSource = (invitation: Invitation): PlaybackSource => ({
  sourceId: invitation.id,
  sourceKind: "INVITATION",
  sourceVersion: invitation.proposalRevision,
});

export function Listen({
  id,
  label,
  active,
  onActivate,
  source,
  language,
  hash,
}: {
  id: string;
  label: string;
  active: boolean;
  onActivate: (id: string | null) => void;
  source: PlaybackSource;
  language: string;
  hash: string;
}) {
  const synth = useCommand("synthesize");
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const mediaRequest = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const expiresAt = useRef(0);

  useEffect(() => () => {
    generation.current++;
    mediaRequest.current?.abort();
  }, []);

  // Switching to another language stops this player (never two voices at once).
  useEffect(() => {
    if (!active) audio.current?.pause();
  }, [active]);
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );

  const run = () => {
    setFailure(null);
    onActivate(id);
    if (src && expiresAt.current > Date.now()) {
      void audio.current?.play().catch(() => setFailure(new Error("Playback could not start. Use the text or try again.")));
      return;
    }
    if (src) setSrc(null);
    const request = ++generation.current;
    synth.mutate(
      {
        input: { ...source, canonicalTextHash: hash, language },
      },
      {
        onSuccess: async (artifact) => {
          if (request !== generation.current) return;
          if (artifact.status !== "READY" || !artifact.accessPath) {
            setFailure(
              new ApiRequestError({
                operation: "media",
                code: "PROVIDER_UNAVAILABLE",
                message: `Audio is ${artifact.status.toLowerCase()}.`,
                status: null,
                retryable: artifact.status === "PENDING",
              }),
            );
            return;
          }
          mediaRequest.current?.abort();
          const controller = new AbortController();
          mediaRequest.current = controller;
          try {
            const res = await fetch(artifact.accessPath, {
              signal: controller.signal,
              headers: { accept: "audio/*" },
              credentials: "same-origin",
              cache: "no-store",
            });
            const type = res.headers.get("content-type") ?? "";
            if (!res.ok || !type.startsWith("audio/"))
              throw new Error("not audio");
            const blob = await res.blob();
            if (controller.signal.aborted || request !== generation.current) return;
            expiresAt.current = Date.parse(artifact.expiresAt);
            if (expiresAt.current <= Date.now()) throw new Error("expired");
            setSrc(URL.createObjectURL(blob));
          } catch {
            if (controller.signal.aborted) return;
            setFailure(
              new ApiRequestError({
                operation: "media",
                code: "UNAVAILABLE",
                message: "Audio could not be loaded.",
                status: null,
                retryable: true,
              }),
            );
          }
        },
        onError: (e) => { if (request === generation.current) setFailure(e); },
      },
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Button
        size="sm"
        onClick={run}
        pending={synth.isPending}
        pendingLabel="Preparing audio…"
      >
        <span aria-hidden="true">▶</span> {label}
      </Button>
      {src ? (
        // User-initiated: plays after the explicit Listen click; controls expose pause/seek/elapsed.
        <>
        <PlaybackMeter audio={audio} playing={playing}/>
        <audio
          ref={audio}
          src={src}
          controls
          autoPlay={active}
          className="w-full max-w-xs"
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => { setPlaying(false); setFailure(new Error("Audio could not play. The text remains available.")); }}
          onPlay={() => {
            if (expiresAt.current <= Date.now()) {
              audio.current?.pause();
              setSrc(null);
              setFailure(new Error("This audio expired. Request a fresh version or use the text."));
            } else { setPlaying(true); onActivate(id); }
          }}
        />
        </>
      ) : null}
      {failure ? (
        <ErrorNotice
          error={failure}
          title="Audio unavailable · the text above is complete"
        />
      ) : null}
    </div>
  );
}

/** Source-authorized review. Only the mission organizer's own session can approve; others get an honest denial. */
export function OrganizerReview({
  item,
  queryKeys,
}: {
  item: Localized;
  queryKeys: readonly (readonly unknown[])[];
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(item.text);
  const approve = useCommand("approveLocalization");
  if (item.status !== "REVIEW_REQUIRED")
    return null;
  if (!open)
    return (
      <Button
        size="sm"
        variant="tertiary"
        className="mt-2"
        onClick={() => setOpen(true)}
      >
        Organizer: review this translation
      </Button>
    );
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-field border border-line-control bg-surface p-3">
      <Field
        label="Reviewed translation"
        helper="Correct the wording if needed. Approval cannot change the original commitments."
      >
        {(f) => (
          <TextArea
            id={f.id}
            aria-describedby={f.describedBy}
            rows={5}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
      </Field>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={!text.trim()}
          pending={approve.isPending}
          pendingLabel="Approving…"
          onClick={() =>
            approve.mutate(
              {
                params: { id: item.id },
                input: {
                  expectedVersion: item.version,
                  canonicalTextHash: item.canonicalTextHash,
                  text: text.trim(),
                },
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  for (const queryKey of queryKeys) void client.invalidateQueries({ queryKey });
                },
                onError: () => {
                  void client.invalidateQueries({ queryKey: queryKeys[0] });
                },
              },
            )
          }
        >
          Approve translation
        </Button>
        <Button size="sm" variant="tertiary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {approve.isError ? (
        <ErrorNotice
          error={approve.error}
          title={
            approve.error.code === "NOT_FOUND"
              ? "Only the mission organizer can approve this translation"
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
