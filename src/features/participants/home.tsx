"use client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Invitation } from "@/contracts";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Skeleton } from "@/components/ui/surface";
import { InvitationStatusBadge } from "@/components/ui/status";
import { Sheet } from "@/components/ui/dialog";
import { useCommand } from "@/client/command";
import { isApiError } from "@/client/http";
import {
  useDeviceMemory,
  useInbox,
  useParticipant,
  useSession,
} from "@/client/queries";
import { forgetParticipant } from "@/client/local";
import { formatInterval, formatTimestamp } from "@/client/time";
import { useHydrated } from "@/client/hydrated";
import { ShareLink } from "@/features/invitations/share-link";
import { languageName, skillLabel } from "@/features/shared/skills";
import { ArrowIcon, ParticipantIcon } from "./participant-shell";

export function ParticipantHome() {
  const hydrated = useHydrated();
  const memory = useDeviceMemory();
  const session = useSession();
  const params = useSearchParams();
  if (!hydrated || session.isPending)
    return (
      <Skeleton className="h-64 w-full rounded-panel" label="Loading profile" />
    );
  if (session.isError)
    return (
      <div className="participant-empty">
        <div className="participant-empty-icon">
          <ParticipantIcon kind="person" />
        </div>
        <h2>Let’s reconnect your space.</h2>
        <p>
          We could not check this browser’s session. Your profile has not been
          changed. Try again before creating a new one.
        </p>
        <ErrorNotice
          className="mt-5"
          error={session.error}
          onRetry={() => void session.refetch()}
        />
      </div>
    );
  if (!memory.participantId)
    return (
      <div className="participant-empty participant-empty-full">
        <section>
          <div className="participant-empty-icon">
            <ParticipantIcon kind="person" />
          </div>
          <p className="eyebrow mb-3">Your space starts here</p>
          <h2>No profile on this device yet</h2>
          <p>
            Bring what you know. A profile lets COHUE consider you for missions,
            and gives your invitations a home.
          </p>
          <div className="empty-actions">
            <ButtonLink href="/join" variant="primary">
              Create your profile <ArrowIcon />
            </ButtonLink>
            <ButtonLink href="/app" variant="tertiary">
              Explore first
            </ButtonLink>
          </div>
        </section>
        <aside
          className="participant-empty-explainer"
          aria-label="Before you join"
        >
          <ol>
            <li>
              <span>01</span>Share your skills and a time that works.
            </li>
            <li>
              <span>02</span>Choose whether mission searches can find you.
            </li>
            <li>
              <span>03</span>Review every invitation. You always decide.
            </li>
          </ol>
          <p className="mt-6">
            Already have an invitation link? Open it directly. It works without
            a profile. A profile saved under a different browser session will
            not appear here.
          </p>
        </aside>
      </div>
    );
  return (
    <Home
      participantId={memory.participantId}
      justJoined={params.get("joined") === "1"}
    />
  );
}

function Home({
  participantId,
  justJoined,
}: {
  participantId: string;
  justJoined: boolean;
}) {
  const session = useSession();
  const participant = useParticipant(participantId);
  const lost =
    isApiError(participant.error) &&
    ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND"].includes(
      participant.error.code,
    );
  const inbox = useInbox(lost ? null : participantId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteTrigger = useRef<HTMLButtonElement>(null);

  if (lost)
    return (
      <section className="participant-empty">
        <div className="participant-empty-icon">
          <ParticipantIcon kind="person" />
        </div>
        <p className="eyebrow mb-3">Profile access changed</p>
        <h2>This browser no longer has access to the saved profile</h2>
        <p>
          Your browser remembers a profile, but the current session cannot open
          it. Private profile details and invitations stay protected. Forgetting
          it here only removes the reference on this device; it does not delete
          the server profile.
        </p>
        <div className="empty-actions">
          <Button onClick={() => void participant.refetch()}>
            Check access again
          </Button>
          <Button
            variant="tertiary"
            onClick={() => forgetParticipant(session.data)}
          >
            Forget it on this device
          </Button>
        </div>
      </section>
    );

  return (
    <>
      {justJoined && participant.data ? (
        <Notice
          tone="approved"
          role="status"
          className="mb-7"
          title="Profile saved. A new possibility starts here."
        >
          You can be proposed when your skills, time and visibility settings
          fit. You decide on every invitation.
        </Notice>
      ) : null}
      <div className="participant-home-grid">
        <section aria-labelledby="inbox-heading" className="min-w-0">
          <div className="inbox-heading">
            <h2 id="inbox-heading">
              Invitations inbox
              {inbox.data ? (
                <span
                  className="inbox-count"
                  aria-label={`${inbox.data.invitations.length} invitations`}
                >
                  {inbox.data.invitations.length}
                </span>
              ) : null}
            </h2>
            <p>
              Checked automatically
              <br />
              while you are here
            </p>
          </div>
          {inbox.isPending ? (
            <Skeleton
              className="h-64 w-full rounded-panel"
              label="Loading invitations"
            />
          ) : inbox.isError ? (
            <ErrorNotice
              error={inbox.error}
              onRetry={() => void inbox.refetch()}
            />
          ) : inbox.data.invitations.length ? (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {inbox.data.invitations.map((inv) => (
                <InboxItem key={inv.id} invitation={inv} />
              ))}
            </ul>
          ) : (
            <div className="participant-empty">
              <div className="participant-empty-icon">
                <ParticipantIcon kind="inbox" />
              </div>
              <h3>Room for your next possibility.</h3>
              <p>
                No invitations yet. When a mission creator proposes a group that
                includes you, your invitation will appear here.
              </p>
              <p className="mt-3">
                A match starts a conversation. It never commits you to a team.
              </p>
              <div className="empty-actions">
                <ButtonLink href="/app" variant="tertiary">
                  Explore COHUE <ArrowIcon />
                </ButtonLink>
              </div>
            </div>
          )}
        </section>
        <aside aria-label="Your profile" className="saved-profile">
          <section className="profile-panel">
            <p className="eyebrow">Your profile</p>
            {participant.isPending ? (
              <Skeleton
                className="mt-4 h-64 w-full"
                label="Loading profile details"
              />
            ) : participant.isError ? (
              <ErrorNotice
                className="mt-4"
                error={participant.error}
                onRetry={() => void participant.refetch()}
              />
            ) : (
              <>
                <div className="summary-person">
                  <span className="profile-initial" aria-hidden="true">
                    {participant.data.avatarId ? (<Image src={`/avatars/${participant.data.avatarId}.png`} width={44} height={44} alt="" className="rounded-full"/>) : participant.data.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{participant.data.displayName}</h2>
                    <p>{languageName(participant.data.language)}</p>
                  </div>
                </div>
                <dl className="m-0">
                  <KeyValue label="Username">{participant.data.username ? `@${participant.data.username}` : "Not chosen yet"}</KeyValue>
                <KeyValue label="Language">
                    {languageName(participant.data.language)}
                  </KeyValue>
                  <KeyValue label="Skills offered">
                    {participant.data.capabilities.length
                      ? participant.data.capabilities.map((c) => (
                          <span key={c.normalizedSkillId} className="block">
                            {skillLabel(c.normalizedSkillId)}
                            {c.level ? ` · Level ${c.level}` : ""}
                          </span>
                        ))
                      : "None listed"}
                  </KeyValue>
                  <KeyValue label="Looking for">
                    {participant.data.needs.map(skillLabel).join(", ") ||
                      "None listed"}
                  </KeyValue>
                  <KeyValue label="Interests">
                    {participant.data.interests.map(skillLabel).join(", ") ||
                      "None listed"}
                  </KeyValue>
                  <KeyValue label="Participation">
                    {participant.data.participationOptIn
                      ? "Opted in to missions"
                      : "Not opted in"}
                  </KeyValue>
                  <KeyValue label="Matching visibility">
                    {participant.data.visibility.discoverable
                      ? "Discoverable"
                      : "Not searchable"}
                  </KeyValue>
                  <KeyValue label="Public map">
                    {participant.data.visibility.publicGraph
                      ? "Minimal entry visible"
                      : "Hidden"}
                  </KeyValue>
                  <KeyValue label="Availability">
                    {participant.data.availability.length
                      ? participant.data.availability.map((a, i) => (
                          <span className="block" key={`${a.start}-${i}`}>
                            {formatInterval(a)}
                          </span>
                        ))
                      : "None — searches will not propose you"}
                  </KeyValue>
                </dl>
                <div className="profile-delete">
                  <p>
                    Removing your profile stops discovery and withdraws pending
                    invitations.
                  </p>
                  <Button
                    ref={deleteTrigger}
                    size="sm"
                    variant="decline"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete my profile…
                  </Button>
                </div>
                <DeleteSheet
                  open={deleteOpen}
                  onOpenChange={setDeleteOpen}
                  participantId={participantId}
                  version={participant.data.profileVersion}
                  returnFocusRef={deleteTrigger}
                />
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function InboxItem({ invitation }: { invitation: Invitation }) {
  const router = useRouter();
  const t = invitation.terms;
  return (
    <li className="inbox-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">
          Invitation · Revision {invitation.proposalRevision}
        </p>
        <InvitationStatusBadge status={invitation.status} />
      </div>
      <h3>{t.objective}</h3>
      <dl className="invitation-details">
        <div>
          <dt>Your proposed role</dt>
          <dd>{t.role}</dd>
        </div>
        <div>
          <dt>Shared time</dt>
          <dd>{formatInterval(t.schedule)}</dd>
        </div>
        <div>
          <dt>Answer deadline</dt>
          <dd>{formatTimestamp(invitation.expiresAt)}</dd>
        </div>
        <div>
          <dt>Proposal revision</dt>
          <dd>{invitation.proposalRevision}</dd>
        </div>
      </dl>
      {invitation.status === "PENDING" ? (
        <div className="invitation-share">
          <p>
            Read the full terms before deciding. Open your private invitation on
            this device, or scan its QR code with your phone.
          </p>
          <ShareLink
            invitationId={invitation.id}
            personLabel="you"
            forSelf
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
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  participantId: string;
  version: number;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const del = useCommand("deleteParticipant");
  const session = useSession();
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      className="participant-sheet"
      subtle
      returnFocusRef={returnFocusRef}
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
                {
                  params: { id: participantId },
                  input: { expectedVersion: version },
                },
                {
                  onSuccess: () => {
                    forgetParticipant(session.data);
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
        Active missions you belong to receive a privacy-safe notice for review;
        they are not dissolved automatically.
      </p>
      {del.isError ? <ErrorNotice className="mt-4" error={del.error} /> : null}
    </Sheet>
  );
}
