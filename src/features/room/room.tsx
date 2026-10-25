"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiOutput } from "@/contracts";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { Panel, Skeleton } from "@/components/ui/surface";
import { StatusBadge } from "@/components/ui/status";
import { Tabs } from "@/components/ui/dialog";
import { useCommand } from "@/client/command";
import { isApiError } from "@/client/http";
import { keys, useRoom } from "@/client/queries";
import { useMediaQuery } from "@/client/media";
import { formatTimestamp } from "@/client/time";
import { languageName } from "@/features/shared/skills";

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
  if (room.isError && !room.data)
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
            <span className="font-medium">{m.approvedRole}</span>
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
      {room.briefs.map((b) => (
        <article key={b.id} lang={b.language} className="rounded-field border border-line-panel bg-surface p-4">
          <p className="eyebrow mb-1">
            {languageName(b.language)} · {b.status === "APPROVED" ? "reviewed" : b.status === "REVIEW_REQUIRED" ? "translation needs review" : b.status.toLowerCase()}
          </p>
          <p className="whitespace-pre-wrap">{b.text}</p>
        </article>
      ))}
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
    <div className="flex flex-col gap-6">
      <header className="rounded-panel border-2 border-activated bg-surface p-5 outline-2 outline-offset-2 outline-activated md:p-6">
        <p className="eyebrow">Mission Room</p>
        <h1 className="type-experience mt-2 break-words">{room.mission.objective}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge tone="activated">Activated</StatusBadge>
          <span className="type-meta text-muted">{room.memberships.length} members · {room.tasks.length} tasks</span>
        </div>
      </header>
      {wide ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel className="flex flex-col gap-8 p-5 md:p-6">
            {tasks}
            {brief}
          </Panel>
          <div className="flex flex-col gap-6">
            <Panel className="p-5">{team}</Panel>
            <Panel className="p-5">{resources}</Panel>
          </div>
        </div>
      ) : (
        <Panel className="p-4">
          <Tabs
            label="Room sections"
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "tasks", label: "Tasks", content: tasks },
              { value: "brief", label: "Brief", content: brief },
              { value: "team", label: "Team", content: team },
              { value: "resources", label: "Resources", content: resources },
            ]}
          />
        </Panel>
      )}
      <div>
        <ButtonLink href={`/missions/${room.mission.id}`} variant="tertiary" size="sm">
          Back to Mission Theater (creator only)
        </ButtonLink>
      </div>
    </div>
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
