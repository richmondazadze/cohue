"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiInput, ApiOutput, CommitmentTerms, Invitation } from "@/contracts";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Panel, Skeleton } from "@/components/ui/surface";
import { InvitationStatusBadge } from "@/components/ui/status";
import { Sheet } from "@/components/ui/dialog";
import { useCommand } from "@/client/command";
import { isApiError } from "@/client/http";
import { keys, useInvitationDetail } from "@/client/queries";
import { formatInterval, formatTimestamp, localTimezone } from "@/client/time";
import { useHydrated, useNow } from "@/client/hydrated";
import { Translations } from "./translations";
import { RecordControl } from "@/components/voice/record-control";
import {
  IntervalRow,
  draftFromInterval,
  intervalFromDraft,
  type IntervalDraft,
} from "@/features/shared/availability";

type Detail = ApiOutput<"getInvitation">["data"];
type Result = ApiOutput<"respondInvitation">["data"];
type ResponseInput = ApiInput<"respondInvitation">;

export function InvitationResponse({ invitationId }: { invitationId: string }) {
  const detail = useInvitationDetail(invitationId);
  const hydrated = useHydrated();
  if (!hydrated || detail.isPending) return <Skeleton className="h-96 w-full rounded-panel" label="Loading invitation" />;
  if (detail.isError && !detail.data) {
    const noAccess = isApiError(detail.error) && ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(detail.error.code);
    return (
      <div className="flex flex-col gap-4">
        <ErrorNotice
          error={detail.error}
          title={noAccess ? "Open your invitation link again on this device" : undefined}
          onRetry={noAccess ? undefined : () => void detail.refetch()}
        />
        {noAccess ? (
          <p className="text-sm text-muted">
            For privacy, invitation access is tied to the browser where the link was opened, and it ends when the invitation closes.
          </p>
        ) : null}
      </div>
    );
  }
  return <ResponseView detail={detail.data as Detail} />;
}

function termsDiff(a: CommitmentTerms, b: CommitmentTerms): string[] {
  const changed: string[] = [];
  if (a.role !== b.role) changed.push(`Role: “${a.role}” → “${b.role}”`);
  if (a.schedule.start !== b.schedule.start || a.schedule.end !== b.schedule.end || a.schedule.timezone !== b.schedule.timezone)
    changed.push(`Schedule: ${formatInterval(a.schedule)} → ${formatInterval(b.schedule)}`);
  if (JSON.stringify(a.responsibilities) !== JSON.stringify(b.responsibilities)) changed.push("Responsibilities changed");
  const group = (t: CommitmentTerms) => t.disclosedGroup.map((m) => `${m.participantId}:${m.role}`).sort().join("|");
  if (group(a) !== group(b)) changed.push("The group or its roles changed");
  if (a.objective !== b.objective) changed.push("Objective changed");
  if (a.expectedOutput !== b.expectedOutput) changed.push("Expected output changed");
  return changed.length ? changed : ["Terms reference changed"];
}

function ResponseView({ detail }: { detail: Detail }) {
  const client = useQueryClient();
  const inv = detail.invitation;
  const [seen, setSeen] = useState<{ hash: string; terms: CommitmentTerms }>(() => ({ hash: inv.termsHash, terms: inv.terms }));
  const [receipt, setReceipt] = useState<Result | null>(null);
  const [sheet, setSheet] = useState<null | "decline" | "counter">(null);
  const respond = useCommand("respondInvitation");
  const changed = seen.hash !== inv.termsHash;
  const now = useNow();
  const open = inv.status === "PENDING" && (now === 0 || Date.parse(inv.expiresAt) > now);
  const t = inv.terms;
  const viewerTz = localTimezone();

  const send = (input: Omit<ResponseInput, "termsHash" | "responseVersion">) =>
    respond.mutate(
      {
        params: { id: inv.id },
        input: { ...input, termsHash: seen.hash, responseVersion: inv.responseVersion },
      },
      {
        onSuccess: (r) => {
          setReceipt(r);
          setSheet(null);
          client.setQueryData<Detail>(keys.invitation(inv.id), (d) => (d ? { ...d, invitation: r.invitation } : d));
        },
        onError: (e) => {
          if (["STALE_VERSION", "INVITATION_EXPIRED", "INVITATION_REVOKED", "TERMINAL_MISSION"].includes(e.code))
            void client.invalidateQueries({ queryKey: keys.invitation(inv.id) });
        },
      },
    );

  const localized = detail.localized;

  return (
    <div className="flex flex-col gap-6">
      <Panel className="p-5 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="eyebrow">Your invitation</p>
          <InvitationStatusBadge status={inv.status} />
        </div>
        <h1 className="type-experience mt-2 break-words" lang={detail.invitation.language}>
          {t.objective}
        </h1>
        <p className="mt-3 text-muted">Expected output: {t.expectedOutput}</p>

        <Translations items={localized} invitation={inv} />

        <dl className="m-0 mt-6">
          <KeyValue label="Your role">{t.role}</KeyValue>
          <KeyValue label="When">
            <span className="block">{formatInterval(t.schedule)}</span>
            {viewerTz !== t.schedule.timezone ? (
              <span className="type-meta block text-muted">Your time: {formatInterval(t.schedule, undefined, viewerTz)}</span>
            ) : null}
          </KeyValue>
          <KeyValue label="Answer by">{formatTimestamp(inv.expiresAt)}</KeyValue>
        </dl>
        <section className="mt-6" aria-labelledby="resp-h">
          <h2 id="resp-h" className="type-panel">Responsibilities</h2>
          <ul className="mt-2 max-w-[60ch] list-disc pl-5">
            {t.responsibilities.map((r, i) => (
              <li key={i} className="py-0.5">
                {r}
              </li>
            ))}
          </ul>
        </section>
        <section className="mt-6" aria-labelledby="group-h">
          <h2 id="group-h" className="type-panel">Who else is invited</h2>
          <p className="type-meta text-muted">Disclosed as part of these terms. Each person decides independently.</p>
          <ul className="mt-2 flex list-none flex-col gap-1 p-0">
            {t.disclosedGroup.map((m) => (
              <li key={m.participantId} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-muted">●</span>
                {m.role}
                {m.participantId === t.participantId ? <strong className="text-action">(you)</strong> : null}
              </li>
            ))}
          </ul>
        </section>
        <p className="type-meta mt-6 text-muted">
          Terms reference {inv.termsHash.slice(0, 12)} · proposal revision {inv.proposalRevision}
          {inv.lineage ? ` · carried from revision ${inv.lineage.sourceProposalRevision} with identical terms` : ""}
        </p>
      </Panel>

      {receipt ? <Receipt result={receipt} /> : null}

      {changed && open ? (
        <Notice tone="pending" role="alert" title="The terms changed while you were reading">
          <ul className="list-disc pl-5">
            {termsDiff(seen.terms, inv.terms).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Button size="sm" className="mt-3" onClick={() => setSeen({ hash: inv.termsHash, terms: inv.terms })}>
            I have read the updated terms
          </Button>
        </Notice>
      ) : null}

      {!receipt && !open ? (
        <Notice tone={inv.status === "ACCEPTED" ? "approved" : "info"} title={closedTitle(inv)}>
          {inv.status === "ACCEPTED"
            ? "Your approval is recorded. The mission activates only when everyone required has approved; the Mission Room opens then."
            : "This invitation is closed. Nothing further is needed from you."}
        </Notice>
      ) : null}

      {open && !receipt ? (
        <div className="safe-bottom sticky bottom-0 z-10 -mx-4 grid grid-cols-2 gap-2 border-t border-line-subtle bg-canvas px-4 pt-3 sm:flex sm:flex-row md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
          <Button
            variant="primary"
            disabled={changed}
            pending={respond.isPending && respond.variables?.input?.action === "ACCEPT"}
            pendingLabel="Saving response…"
            onClick={() => send({ action: "ACCEPT" })}
            className="col-span-2 sm:min-w-[200px]"
          >
            Accept these terms
          </Button>
          <Button onClick={() => setSheet("counter")} disabled={respond.isPending}>
            Suggest a change
          </Button>
          <Button variant="decline" onClick={() => setSheet("decline")} disabled={respond.isPending}>
            Decline
          </Button>
        </div>
      ) : null}
      {changed && open ? <p className="type-meta text-muted">Accept is unavailable until you confirm you have read the updated terms.</p> : null}
      {respond.isError && !sheet ? <ErrorNotice error={respond.error} /> : null}

      <DeclineSheet
        language={inv.language}
        open={sheet === "decline"}
        onOpenChange={(v) => setSheet(v ? "decline" : null)}
        pending={respond.isPending}
        error={sheet === "decline" && respond.isError ? respond.error : null}
        onSubmit={(reason) => send({ action: "DECLINE", ...(reason ? { reason } : {}) })}
      />
      <CounterSheet
        language={inv.language}
        open={sheet === "counter"}
        onOpenChange={(v) => setSheet(v ? "counter" : null)}
        schedule={t.schedule}
        pending={respond.isPending}
        error={sheet === "counter" && respond.isError ? respond.error : null}
        onSubmit={(availabilityProposal, reason) =>
          send({ action: "COUNTER", availabilityProposal, ...(reason ? { reason } : {}) })
        }
      />
      <div>
        <ButtonLink href="/" variant="tertiary" size="sm">
          COHUE home
        </ButtonLink>
      </div>
    </div>
  );
}

function closedTitle(inv: Invitation) {
  switch (inv.status) {
    case "ACCEPTED":
      return "You approved these terms";
    case "DECLINED":
      return "You declined this invitation";
    case "COUNTERPROPOSED":
      return "You suggested a change";
    case "EXPIRED":
      return "This invitation expired";
    case "REVOKED":
      return "This invitation was withdrawn";
    default:
      return "This invitation can no longer be answered";
  }
}

function Receipt({ result }: { result: Result }) {
  const r = result.response;
  const copy =
    r.action === "ACCEPT"
      ? { tone: "approved" as const, title: "✓ You approved these terms", body: "The mission activates only when everyone required has approved. Nothing else is needed from you now." }
      : r.action === "DECLINE"
        ? { tone: "info" as const, title: "− You declined", body: "The organizer sees that you declined. COHUE may look for someone else." }
        : { tone: "pending" as const, title: "↔ You suggested a change", body: "This is not an acceptance. If a new arrangement is proposed, you will be asked to decide again." };
  return (
    <Notice tone={copy.tone} role="status" title={copy.title}>
      <p>{copy.body}</p>
      <p className="type-meta mt-2">
        Recorded {formatTimestamp(r.createdAt)} · terms reference {r.termsHash.slice(0, 12)}
        {r.reason ? ` · reason: ${r.reason}` : ""}
      </p>
      {r.availabilityProposal?.length ? (
        <ul className="type-meta mt-1 list-disc pl-5">
          {r.availabilityProposal.map((a) => (
            <li key={a.start}>{formatInterval(a)}</li>
          ))}
        </ul>
      ) : null}
    </Notice>
  );
}

function DeclineSheet({
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
  language,
}: {
  language: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (reason: string) => void;
  pending: boolean;
  error: unknown;
}) {
  const [reason, setReason] = useState("");
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Decline this invitation"
      description="The organizer will see that you declined. A reason is optional."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="decline" pending={pending} pendingLabel="Saving response…" onClick={() => onSubmit(reason.trim())}>
            Decline invitation
          </Button>
        </div>
      }
    >
      <Field label="Reason" optional>
        {(f) => <TextArea id={f.id} value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />}
      </Field>
      <div className="mt-3">
        <RecordControl
          purpose="INVITATION_RESPONSE"
          language={language}
          label="Say it instead"
          onTranscript={(t) => setReason((r) => [r.trim(), t].filter(Boolean).join(" ").slice(0, 2000))}
        />
      </div>
      {error ? <ErrorNotice className="mt-4" error={error} /> : null}
    </Sheet>
  );
}

function CounterSheet({
  open,
  onOpenChange,
  onSubmit,
  schedule,
  pending,
  error,
  language,
}: {
  language: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (availability: { start: string; end: string; timezone: string }[], reason: string) => void;
  schedule: CommitmentTerms["schedule"];
  pending: boolean;
  error: unknown;
}) {
  const [slots, setSlots] = useState<IntervalDraft[]>(() => [draftFromInterval(schedule)]);
  const [reason, setReason] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const parsed = slots.map((s) => ({ key: s.key, r: intervalFromDraft(s) }));
  const valid = parsed.every((p) => p.r.ok);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Suggest a different time"
      description="This sends a counterproposal. It is not an acceptance; you will be asked again if new terms are proposed."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            pending={pending}
            pendingLabel="Sending suggestion…"
            onClick={() => {
              if (!valid) return setShowErrors(true);
              onSubmit(
                parsed.flatMap((p) => (p.r.ok ? [p.r.value] : [])),
                reason.trim(),
              );
            }}
          >
            Send suggestion
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {slots.map((s, i) => (
          <IntervalRow
            key={s.key}
            legend={`Time that works ${i + 1}`}
            value={s}
            allowMultiDay
            error={showErrors ? (parsed[i].r.ok ? null : (parsed[i].r as { error: string }).error) : null}
            onChange={(v) => setSlots(slots.map((x) => (x.key === s.key ? v : x)))}
            onRemove={slots.length > 1 ? () => setSlots(slots.filter((x) => x.key !== s.key)) : undefined}
          />
        ))}
        {slots.length < 10 ? (
          <Button size="sm" className="self-start" onClick={() => setSlots([...slots, draftFromInterval(schedule)])}>
            Add another time
          </Button>
        ) : null}
        <Field label="Note to the organizer" optional>
          {(f) => <TextArea id={f.id} value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <RecordControl
          purpose="INVITATION_RESPONSE"
          language={language}
          label="Say it instead"
          onTranscript={(t) => setReason((r) => [r.trim(), t].filter(Boolean).join(" ").slice(0, 2000))}
        />
        {error ? <ErrorNotice error={error} /> : null}
      </div>
    </Sheet>
  );
}
