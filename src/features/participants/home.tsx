"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Invitation } from "@/contracts";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Panel, Skeleton } from "@/components/ui/surface";
import { InvitationStatusBadge } from "@/components/ui/status";
import { Sheet } from "@/components/ui/dialog";
import { useCommand } from "@/client/command";
import { isApiError } from "@/client/http";
import { useDeviceMemory, useInbox, useParticipant } from "@/client/queries";
import { forgetParticipant } from "@/client/local";
import { formatInterval, formatTimestamp } from "@/client/time";
import { useHydrated } from "@/client/hydrated";
import { ShareLink } from "@/features/invitations/share-link";
import { languageName, skillLabel } from "@/features/shared/skills";

export function ParticipantHome() {
  const hydrated = useHydrated();
  const memory = useDeviceMemory();
  const params = useSearchParams();
  if (!hydrated) return <Skeleton className="h-64 w-full rounded-panel" label="Loading profile" />;
  if (!memory.participantId)
    return (
      <Panel className="flex flex-col gap-4 p-6">
        <h2 className="type-section">No profile on this device yet</h2>
        <p className="text-muted">
          Join to receive invitations here. If you were sent an invitation link, open that link directly; it works without a profile.
        </p>
        <div>
          <ButtonLink href="/join" variant="primary">
            Join the network
          </ButtonLink>
        </div>
      </Panel>
    );
  return <Home participantId={memory.participantId} justJoined={params.get("joined") === "1"} />;
}

function Home({ participantId, justJoined }: { participantId: string; justJoined: boolean }) {
  const participant = useParticipant(participantId);
  const inbox = useInbox(participantId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const lost =
    isApiError(participant.error) && ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(participant.error.code);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        {justJoined && participant.data ? (
          <Notice tone="approved" role="status" title="✓ Profile saved">
            You can now be proposed for missions you match. You decide on every invitation.
          </Notice>
        ) : null}
        <h2 className="type-section">Invitations</h2>
        {inbox.isPending ? (
          <Skeleton className="h-40 w-full" label="Loading invitations" />
        ) : inbox.isError ? (
          <ErrorNotice error={inbox.error} onRetry={() => void inbox.refetch()} />
        ) : inbox.data.invitations.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {inbox.data.invitations.map((inv) => (
              <InboxItem key={inv.id} invitation={inv} />
            ))}
          </ul>
        ) : (
          <Panel className="p-5">
            <p className="font-medium">No invitations yet</p>
            <p className="mt-1 text-sm text-muted">
              When a mission creator selects a group that includes you, the invitation appears here. This page checks every few seconds.
            </p>
          </Panel>
        )}
      </div>
      <aside aria-label="Your profile" className="flex flex-col gap-4">
        <Panel className="p-5">
          <p className="eyebrow">Your profile</p>
          {participant.isPending ? (
            <Skeleton className="mt-3 h-32 w-full" />
          ) : participant.isError ? (
            <div className="mt-3 flex flex-col gap-3">
              <ErrorNotice
                error={participant.error}
                title={lost ? "This browser no longer has access to the saved profile" : undefined}
                onRetry={lost ? undefined : () => void participant.refetch()}
              />
              {lost ? (
                <Button size="sm" variant="tertiary" onClick={() => forgetParticipant()}>
                  Forget it on this device
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <h2 className="type-panel mt-2">{participant.data.displayName}</h2>
              <dl className="m-0 mt-2">
                <KeyValue label="Language">{languageName(participant.data.language)}</KeyValue>
                <KeyValue label="Offers">
                  {participant.data.capabilities.map((c) => skillLabel(c.normalizedSkillId)).join(", ") || "—"}
                </KeyValue>
                <KeyValue label="Matching">
                  {participant.data.participationOptIn && participant.data.visibility.discoverable ? "✓ Can be proposed" : "− Not searchable"}
                </KeyValue>
                <KeyValue label="Available">
                  {participant.data.availability.length
                    ? participant.data.availability.slice(0, 3).map((a) => (
                        <span key={a.start} className="block">
                          {formatInterval(a)}
                        </span>
                      ))
                    : "—"}
                </KeyValue>
              </dl>
              <Button size="sm" variant="decline" className="mt-4" onClick={() => setDeleteOpen(true)}>
                Delete my profile…
              </Button>
              <DeleteSheet
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                participantId={participantId}
                version={participant.data.profileVersion}
              />
            </>
          )}
        </Panel>
      </aside>
    </div>
  );
}

function InboxItem({ invitation }: { invitation: Invitation }) {
  const router = useRouter();
  const t = invitation.terms;
  return (
    <li className="rounded-panel border border-line-panel bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="eyebrow">Revision {invitation.proposalRevision}</p>
        <InvitationStatusBadge status={invitation.status} />
      </div>
      <h3 className="type-panel mt-1 break-words">{t.objective}</h3>
      <p className="mt-1 text-sm">
        Role: <strong>{t.role}</strong>
      </p>
      <p className="text-sm text-muted">{formatInterval(t.schedule)}</p>
      <p className="type-meta mt-1 text-muted">Answer by {formatTimestamp(invitation.expiresAt)}</p>
      {invitation.status === "PENDING" ? (
        <div className="mt-4">
          <p className="type-meta mb-2 text-muted">
            To read the full terms and answer, open your invitation link — on this device, or scan the QR with your phone.
          </p>
          <ShareLink
            invitationId={invitation.id}
            personLabel="you"
            onOpenHere={(url) => router.push(new URL(url).pathname)}
          />
        </div>
      ) : null}
    </li>
  );
}

function DeleteSheet({
  open,
  onOpenChange,
  participantId,
  version,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  participantId: string;
  version: number;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const del = useCommand("deleteParticipant");
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Delete your profile?"
      description="This removes you from discovery immediately and withdraws pending invitations. Personal data is purged within 24 hours."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>Keep profile</Button>
          <Button
            variant="decline"
            pending={del.isPending}
            pendingLabel="Deleting…"
            onClick={() =>
              del.mutate(
                { params: { id: participantId }, input: { expectedVersion: version } },
                {
                  onSuccess: () => {
                    forgetParticipant();
                    client.clear();
                    onOpenChange(false);
                    router.push("/");
                  },
                },
              )
            }
          >
            Delete profile
          </Button>
        </div>
      }
    >
      <p className="text-sm">
        Active missions you belong to receive a privacy-safe notice for review; they are not dissolved automatically.
      </p>
      {del.isError ? <ErrorNotice className="mt-4" error={del.error} /> : null}
    </Sheet>
  );
}
