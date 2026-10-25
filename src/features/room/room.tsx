"use client";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiOutput } from "@/contracts";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { Panel, Skeleton } from "@/components/ui/surface";
import { StatusBadge } from "@/components/ui/status";
import * as RoomTabs from "@radix-ui/react-tabs";
import { cx } from "@/components/ui/cx";
import { useCommand } from "@/client/command";
import { callApi, isApiError } from "@/client/http";
import { keys, queryRetry, useDeviceMemory, useParticipant, useRoom } from "@/client/queries";
import { useMediaQuery } from "@/client/media";
import { formatTimestamp } from "@/client/time";
import { languageName } from "@/features/shared/skills";
import { Listen, OrganizerReview } from "@/features/invitations/translations";

type Room = ApiOutput<"room">["data"];
type Task = Room["tasks"][number];
const TASK_LABEL: Record<Task["status"], string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };

export function MissionRoom({ missionId }: { missionId: string }) {
  const room = useRoom(missionId);
  if (room.isPending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" label="Loading Mission Room" />
        <Skeleton className="h-64 w-full rounded-panel" />
      </div>
    );
  const denied = isApiError(room.error) && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "SCOPE_MISMATCH"].includes(room.error.code);
  if (denied || (room.isError && !room.data))
    return (
      <div className="flex max-w-[680px] flex-col gap-4">
        <h1 className="type-experience">Mission Room</h1>
        <ErrorNotice
          error={room.error}
          title={
            isApiError(room.error) && ["FORBIDDEN", "NOT_FOUND"].includes(room.error.code)
              ? "The room opens only for activated members and the creator"
              : undefined
          }
          onRetry={() => void room.refetch()}
        />
        <p className="text-sm text-muted">An accepted invitation alone does not open the room; the mission must be activated first.</p>
      </div>
    );
  return <RoomView room={room.data as Room} />;
}

function RoomView({ room }: { room: Room }) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [tab, setTab] = useState("tasks");
  const roleOf = new Map(room.memberships.map((m) => [m.id, m.approvedRole]));
  const tasks = (
    <section aria-labelledby="tasks-h">
      <KickoffPlan missionId={room.mission.id} />
      <h2 id="tasks-h" className="type-section mb-3">Tasks</h2>
      {room.tasks.length ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {room.tasks.map((t) => (
            <TaskRow key={t.id} task={t} ownerRole={roleOf.get(t.ownerMembershipId) ?? "Member"} missionId={room.mission.id} />
          ))}
        </ul>
      ) : (
        <p className="text-muted">No tasks were created at activation.</p>
      )}
    </section>
  );
  const team = (
    <section aria-labelledby="team-h">
      <h2 id="team-h" className="type-section mb-3">Approved team</h2>
      <ul className="m-0 list-none divide-y divide-line-subtle rounded-field border border-line-panel bg-surface p-0">
        {room.memberships.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <span className="flex items-center gap-3">{room.identities?.find(p=>p.id===m.participantId)?.avatarId ? (<Image width={36} height={36} className="rounded-full" alt="" src={`/avatars/${room.identities.find(p=>p.id===m.participantId)!.avatarId}.png`}/>) : null}<span><strong className="block font-medium">{room.identities?.find(p=>p.id===m.participantId)?.displayName ?? m.approvedRole}</strong><span className="block text-xs text-muted">{m.approvedRole}{room.identities?.find(p=>p.id===m.participantId)?.username ? ` · @${room.identities.find(p=>p.id===m.participantId)!.username}` : ""}</span></span></span>
            <span className="type-meta text-muted">✓ Joined {formatTimestamp(m.joinedAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
  const brief = (
    <section aria-labelledby="brief-h" className="flex flex-col gap-3">
      <h2 id="brief-h" className="type-section">Brief</h2>
      <p>{room.mission.objective}</p>
      <p className="text-sm text-muted">Expected output: {room.mission.expectedOutput}</p>
      <BriefList room={room} playbackAllowed={wide || tab === "brief"} />
    </section>
  );
  const resources = (
    <section aria-labelledby="res-h" className="flex flex-col gap-3">
      <h2 id="res-h" className="type-section">Resources</h2>
      {room.opportunities.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {room.opportunities.map((o) => (
            <li key={o.id} className="rounded-field border border-dotted border-evidence bg-evidence-bg p-4 text-sm">
              <p className="font-medium">
                <span aria-hidden="true">■ </span>
                <a href={o.sourceURL} target="_blank" rel="noopener noreferrer nofollow">
                  {o.title}
                </a>
              </p>
              <p className="mt-1">{o.relevanceEvidence}</p>
              <p className="type-meta mt-1 text-evidence">
                Public resource · Unverified · retrieved {formatTimestamp(o.retrievedAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No public resources attached.</p>
      )}
      {room.reviews.length ? (
        <>
          <h3 className="type-panel mt-2">Review requests</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {room.reviews.map((r) => (
              <li key={r.id}>
                <Notice tone="pending" title={`${r.kind === "WITHDRAWAL" ? "Withdrawal" : "Schedule change"} · ${r.status.toLowerCase()}`}>
                  {r.reason}
                </Notice>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );

  return (
    <div className="mission-room-workspace flex flex-col gap-6">
      <header className="mission-room-header rounded-panel border border-line-panel bg-surface p-5 md:p-6">
        <p className="eyebrow">Mission Room</p>
        <h1 className="type-experience mt-2 break-words">{room.mission.objective}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge tone="activated">Activated</StatusBadge>
          <span className="type-meta text-muted">{room.memberships.length} members · {room.tasks.length} tasks</span>
        </div>
      </header>
      {/* Stable panel ancestry preserves unsubmitted review text during orientation changes.
          forceMount keeps inactive mobile panels in state; display:none removes them from access/focus. */}
      <RoomTabs.Root value={tab} onValueChange={setTab} className="rounded-panel border border-line-panel bg-surface p-4 md:border-0 md:bg-transparent md:p-0">
        <RoomTabs.List aria-label="Room sections" className="mb-4 flex gap-1 overflow-x-auto border-b border-line-subtle md:hidden">
          {[['tasks', 'Tasks'], ['brief', 'Brief'], ['team', 'Team'], ['resources', 'Resources']].map(([value, label]) => (
            <RoomTabs.Trigger key={value} value={value} className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-medium text-muted data-[state=active]:border-action data-[state=active]:text-ink hover:text-ink">{label}</RoomTabs.Trigger>
          ))}
        </RoomTabs.List>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel className={cx("min-w-0 flex-col gap-8 border-0 bg-transparent p-0 md:flex md:border md:bg-surface md:p-6", ['tasks', 'brief'].includes(tab) ? 'flex' : 'hidden')}>
            <RoomTabs.Content forceMount value="tasks" className="hidden outline-none data-[state=active]:block md:block">{tasks}</RoomTabs.Content>
            <RoomTabs.Content forceMount value="brief" className="hidden outline-none data-[state=active]:block md:block">{brief}</RoomTabs.Content>
          </Panel>
          <div className={cx("flex-col gap-6 md:flex", ['team', 'resources'].includes(tab) ? 'flex' : 'hidden')}>
            <RoomTabs.Content forceMount value="team" className="hidden outline-none data-[state=active]:block md:block"><Panel className="border-0 bg-transparent p-0 md:border md:bg-surface md:p-5">{team}</Panel></RoomTabs.Content>
            <RoomTabs.Content forceMount value="resources" className="hidden outline-none data-[state=active]:block md:block"><Panel className="border-0 bg-transparent p-0 md:border md:bg-surface md:p-5">{resources}</Panel></RoomTabs.Content>
          </div>
        </div>
      </RoomTabs.Root>
      <div>
        <ButtonLink href={`/missions/${room.mission.id}`} variant="tertiary" size="sm">
          Back to Mission Theater (creator only)
        </ButtonLink>
      </div>
    </div>
  );
}

const PLAN_LANGUAGES = ["en", "es", "fr"] as const;

/** The Coordinator's advisory first-hour plan, in the reader's language; tasks and terms stay authoritative. */
function KickoffPlan({ missionId }: { missionId: string }) {
  const memory = useDeviceMemory();
  const me = useParticipant(memory.participantId);
  const fallback = PLAN_LANGUAGES.find((l) => navigator.language?.startsWith(l)) ?? "en";
  const [chosen, setChosen] = useState<string | null>(null);
  const language = chosen ?? (PLAN_LANGUAGES.find((l) => l === me.data?.language) ?? fallback);
  const plan = useQuery({
    queryKey: ["mission", missionId, "kickoff", language],
    queryFn: ({ signal }) => callApi("kickoffPlan", { params: { id: missionId }, input: { language }, signal }),
    staleTime: Infinity,
    retry: queryRetry,
  });
  return (
    <section aria-labelledby="kickoff-h" className="kickoff-plan mb-8 rounded-field border border-line-panel bg-subtle p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="kickoff-h" className="type-panel flex items-center gap-2">
          <span aria-hidden className="grid size-6 place-items-center rounded-full bg-action text-xs font-semibold text-white">C</span>
          Kickoff plan for your first hour
        </h2>
        <div role="group" aria-label="Plan language" className="flex gap-1">
          {PLAN_LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === language}
              onClick={() => setChosen(l)}
              className={cx(
                "min-h-11 min-w-11 rounded-button px-2 text-sm font-medium uppercase",
                l === language ? "bg-action text-white" : "text-muted hover:text-ink",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {plan.isPending ? (
        <Skeleton className="mt-3 h-24 w-full" label="The Coordinator is writing the kickoff plan" />
      ) : plan.isError ? (
        <ErrorNotice className="mt-3" error={plan.error} title="Kickoff plan unavailable. The tasks below are the plan of record." onRetry={() => void plan.refetch()} />
      ) : (
        <>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-6">
            {plan.data.steps.map((st, i) => (
              <li key={i}>
                <strong>{st.role}:</strong> {st.action}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm">{plan.data.checkIn}</p>
          <p className="type-meta mt-2 text-muted">
            Suggested by the Coordinator · {plan.data.drafter === "META" ? "Meta Muse Spark" : "Gemini"} · {languageName(plan.data.language)}. Advisory; the tasks and approved terms are binding.
          </p>
        </>
      )}
    </section>
  );
}

function TaskRow({ task, ownerRole, missionId }: { task: Task; ownerRole: string; missionId: string }) {
  const client = useQueryClient();
  const update = useCommand("updateTask");
  const [attempted, setAttempted] = useState<Task["status"] | null>(null);
  const [lost, setLost] = useState<Task["status"] | null>(null);
  const stale = update.isError && update.error.code === "STALE_VERSION";
  return (
    <li className="rounded-field border border-line-panel bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium">{task.description}</p>
          <p className="type-meta mt-1 text-muted">
            Owner: {ownerRole}
            {task.dueAt ? ` · due ${formatTimestamp(task.dueAt)}` : ""} · version {task.version}
          </p>
        </div>
        <div className="w-full sm:w-48">
          <label className="sr-only" htmlFor={`task-${task.id}`}>
            Status for {task.description}
          </label>
          <Select
            id={`task-${task.id}`}
            value={attempted ?? task.status}
            disabled={update.isPending}
            onChange={(e) => {
              const status = e.target.value as Task["status"];
              setAttempted(status);
              setLost(null);
              update.mutate(
                { params: { id: missionId, taskId: task.id }, input: { expectedVersion: task.version, status } },
                {
                  onSuccess: (saved) => {
                    setAttempted(null);
                    client.setQueryData<Room>(keys.room(missionId), (r) =>
                      r ? { ...r, tasks: r.tasks.map((t) => (t.id === saved.id ? saved : t)) } : r,
                    );
                  },
                  onError: (err) => {
                    setAttempted(null);
                    if (err.code === "STALE_VERSION") {
                      setLost(status);
                      void client.invalidateQueries({ queryKey: keys.room(missionId) });
                    }
                  },
                },
              );
            }}
          >
            {(["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => (
              <option key={s} value={s}>
                {TASK_LABEL[s]}
              </option>
            ))}
          </Select>
          <p className="type-meta mt-1 text-muted" aria-live="polite">
            {update.isPending ? "Saving…" : update.isSuccess && !attempted ? "✓ Saved" : ""}
          </p>
        </div>
      </div>
      {stale ? (
        <Notice tone="pending" className="mt-3" role="alert" title="Someone else changed this task">
          It is now “{TASK_LABEL[task.status]}” (version {task.version}). Your choice “{lost ? TASK_LABEL[lost] : ""}” was not saved. Choose again to apply it to the current version.
        </Notice>
      ) : update.isError ? (
        <ErrorNotice className="mt-3" error={update.error} />
      ) : null}
    </li>
  );
}

type Brief = Room["briefs"][number];
/** Shared team brief: the canonical original plus member-language translations. Playback only for reviewed text. */
function BriefList({ room, playbackAllowed }: { room: Room; playbackAllowed: boolean }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const label = (b: Brief) =>
    b.language === b.originalLanguage
      ? "original"
      : b.status === "APPROVED"
        ? "translation reviewed by the organizer"
        : b.status === "REVIEW_REQUIRED"
          ? "machine translation · review required"
          : b.status.toLowerCase();
  return (
    <>
      {room.briefs.map((b) => (
        <article
          key={`${b.id}:${b.version}:${b.sourceVersion}:${b.canonicalTextHash}:${b.status}`}
          lang={b.language}
          className="rounded-field border border-line-panel bg-surface p-4"
        >
          <p className="eyebrow mb-1">
            {languageName(b.language)} · {label(b)}
          </p>
          <p className="whitespace-pre-wrap">{b.text}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {b.status === "APPROVED" ? (
              <Listen
                id={`${b.id}-brief`}
                label={`Listen in ${languageName(b.language)}`}
                active={playbackAllowed && playing === `${b.id}-brief`}
                onActivate={setPlaying}
                source={{ sourceId: b.sourceId, sourceKind: "BRIEF", sourceVersion: b.sourceVersion }}
                language={b.language}
                hash={b.canonicalTextHash}
              />
            ) : (
              <p className="type-meta text-muted">Playback is available after the organizer reviews this translation.</p>
            )}
          </div>
          {b.language !== b.originalLanguage ? (
            <OrganizerReview item={b} queryKeys={[keys.room(room.mission.id)]} />
          ) : null}
        </article>
      ))}
    </>
  );
}
