"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Skeleton } from "@/components/ui/surface";
import { useInvitationReview } from "@/client/queries";
import { formatInterval } from "@/client/time";
import { Translations } from "./translations";

/** Creator scope stays intact: never redeem a participant's bearer capability to review text. */
export function CreatorInvitationReview({ invitationId, personLabel }: { invitationId: string; personLabel: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Sheet open={open} onOpenChange={setOpen} trigger={<Button size="sm">Review terms &amp; translations</Button>} title={`Invitation for ${personLabel}`} description="Organizer review only. Reviewing or playing a translation never accepts the invitation.">
      {open ? <CreatorInvitationReviewContent key={invitationId} invitationId={invitationId} /> : null}
    </Sheet>
  </>;
}

export function CreatorInvitationReviewContent({ invitationId }: { invitationId: string }) {
  const query = useInvitationReview(invitationId);
  // A failed background read must not keep a private cached translation/player on screen.
  if (query.isError) return <ErrorNotice error={query.error} onRetry={() => void query.refetch()} title="Invitation review is not available" />;
  if (!query.data || query.isPending) return <Skeleton label="Loading current invitation terms" className="h-64 w-full" />;
  const { invitation, localized } = query.data;
  const t = invitation.terms;
  return <div className="flex flex-col gap-4" key={`${invitation.id}:${invitation.proposalRevision}:${invitation.termsHash}`}>
    <Notice tone="info" title="Binding original terms">Translations help people understand these terms. They never change the commitments or record participant consent.</Notice>
    <section aria-label="Original invitation terms" lang={invitation.language}>
      <h3 className="type-panel break-words">{t.objective}</h3>
      <p className="mt-2 whitespace-pre-wrap">{t.expectedOutput}</p>
      <dl className="m-0 mt-3"><KeyValue label="Role">{t.role}</KeyValue><KeyValue label="Schedule">{formatInterval(t.schedule)}</KeyValue></dl>
      <h4 className="mt-3 font-medium">Responsibilities</h4>
      <ul className="list-disc pl-5">{t.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul>
      <h4 className="mt-3 font-medium">Disclosed group</h4>
      <ul className="list-disc pl-5">{t.disclosedGroup.map((m) => <li key={m.participantId}>{m.role}</li>)}</ul>
      <p className="type-meta mt-3 text-muted">Proposal revision {invitation.proposalRevision} · terms reference {invitation.termsHash.slice(0, 12)}</p>
    </section>
    <Translations items={localized} invitation={invitation} organizerReview />
    {!localized.length ? <p className="text-sm text-muted">No translation is available yet. The complete original terms remain above.</p> : null}
  </div>;
}
