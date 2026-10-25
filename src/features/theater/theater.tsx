"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IdSchema, type AgentEvent, type MissionSnapshot } from "@/contracts";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { Panel, Skeleton } from "@/components/ui/surface";
import { Sheet, Tabs } from "@/components/ui/dialog";
import {
  InvitationStatusBadge,
  MissionStateBadge,
  StatusBadge,
  missionStateCopy,
} from "@/components/ui/status";
import { cx } from "@/components/ui/cx";
import { useCommand } from "@/client/command";
import { describeError } from "@/client/errors";
import { isApiError } from "@/client/http";
import { selectedRevision } from "@/client/events";
import { keys, TERMINAL_STATES, useMissionEvents, useProposals, useSnapshot } from "@/client/queries";
import { useMediaQuery } from "@/client/media";
import { formatClock, formatTimestamp } from "@/client/time";
import { CreatorInvitationReview } from "@/features/invitations/creator-review";
import { ShareLink } from "@/features/invitations/share-link";
import { NetworkView } from "./network";
import {
  activationGate,
  agentMark,
  coverage,
  coverageSummary,
  currentProposal,
  describeEvent,
  explainEvent,
  memberStatuses,
  nameFor,
  openStep,
  participantNames,
  pauseExplanation,
  type CoverageRow,
} from "./model";
import { Avatar, ProposalCard } from "./proposals";
import { CueEntrance, CueProvider, DUR, Emphasis, cuesOf, liveEvents, useCue } from "./motion";
import { gsap, useGSAP } from "@/client/gsap";

export function MissionTheater({ missionId }: { missionId: string }) {
  // Next navigation can preserve this component between mission URLs. Reset streams and cursors
  // with the authorized object instead of carrying another mission’s event history into it.
  return <MissionTheaterSession key={missionId} missionId={missionId} />;
}

function MissionTheaterSession({ missionId }: { missionId: string }) {
  const snapshot = useSnapshot(missionId);
  const client = useQueryClient();
  const denied =
    isApiError(snapshot.error) &&
    ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "SCOPE_MISMATCH"].includes(snapshot.error.code);
  const unavailable = isApiError(snapshot.error) && snapshot.error.code === "UNAVAILABLE";
  const events = useMissionEvents(missionId, { enabled: !denied && !unavailable });

  // Access revocation: purge every cached projection for this mission immediately.
  useEffect(() => {
    if (events.revoked || denied) client.removeQueries({ queryKey: ["mission", missionId] });
  }, [events.revoked, denied, client, missionId]);

  if (events.revoked)
    return (
      <Notice tone="declined" role="alert" title="Your access to this mission changed">
        The mission view was cleared from this device. If you still have access, reload to fetch what you are allowed to see.
      </Notice>
    );
  if (snapshot.isPending)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" label="Loading mission" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-[420px] w-full rounded-panel" />
      </div>
    );
  if (denied || (snapshot.isError && !snapshot.data))
    return (
      <div className="flex max-w-[680px] flex-col gap-4">
        <h1 className="type-experience">Mission Theater</h1>
        <ErrorNotice
          error={snapshot.error}
          title={denied ? "This theater is only visible to the mission creator" : undefined}
          onRetry={() => void snapshot.refetch()}
        />
        {denied ? (
          <p className="text-sm text-muted">
            Invited participants open their own invitation link instead. Activated members use the Mission Room.
          </p>
        ) : null}
      </div>
    );
  return (
    <TheaterView
      snapshot={snapshot.data as MissionSnapshot}
      events={events.events}
      baseline={events.baseline}
      transport={events.transport}
      syncError={events.error ?? (snapshot.isError ? snapshot.error : null)}
      lastSyncedAt={events.lastSyncedAt ?? snapshot.dataUpdatedAt}
    />
  );
}

function TheaterView({
  snapshot,
  events,
  baseline,
  transport,
  syncError,
  lastSyncedAt,
}: {
  snapshot: MissionSnapshot;
  events: AgentEvent[];
  baseline: number | null;
  transport: "sse" | "polling" | "idle";
  syncError: unknown;
  lastSyncedAt: number | null;
}) {
  const live = useMemo(() => liveEvents(events, baseline), [events, baseline]);
  const cues = useMemo(() => cuesOf(live), [live]);
  const lastLive = live[live.length - 1];
  const mission = snapshot.mission;
  const state = mission.state;
  const wide = useMediaQuery("(min-width: 1024px)");
  const xl = useMediaQuery("(min-width: 1440px)");
  const [tab, setTab] = useState("mission");
  const names = useMemo(() => participantNames(snapshot), [snapshot]);
  const proposal = useMemo(() => currentProposal(snapshot, events), [snapshot, events]);
  const rows = useMemo(() => coverage(snapshot, proposal), [snapshot, proposal]);
  const cov = coverageSummary(rows);
  const wantsProposals = ["PROPOSED", "REPROPOSED", "PAUSED_FOR_HUMAN", "AWAITING_APPROVAL", "REPLANNING"].includes(state);
  const proposals = useProposals(mission.id, wantsProposals);
  const activated = state === "ACTIVATED";
  // Activation: a single 480ms emphasis, only when MISSION_ACTIVATED arrives live; a reload renders the end state.
  const activationCue = cues.activation ?? null;
  const headerRef = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = headerRef.current;
      if (!el || !activationCue) return;
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
        if (context.conditions?.reduce) return;
        gsap.fromTo(
          el,
          { rotationX: -6, y: 8, transformOrigin: "50% 0%" },
          { rotationX: 0, y: 0, duration: DUR.activation, ease: "power3.out", clearProps: "transform" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [activationCue?.id], revertOnUpdate: true },
  );

  const header = (
    <header
      ref={headerRef}
      className={cx(
        "flex flex-col gap-3 rounded-t-panel border-b border-line-subtle bg-surface px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6",
        activated && "shadow-[0_0_0_2px_#E6F2E9,0_0_0_4px_#216747]",
      )}
    >
      <div className="min-w-0">
        <p className="eyebrow flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/cohue-symbol.svg" alt="" width={20} height={20} />
          Mission Theater · Live
        </p>
        <h1 className="type-experience mt-2 break-words">{mission.objective}</h1>
        <p className="mt-2 max-w-[65ch] text-sm text-muted">{missionStateCopy[state].explain}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <MissionStateBadge state={state} />
        <p className="type-meta text-muted tabular" aria-live="polite">
          {syncError ? "Reconnecting · " : transport === "sse" ? "Live · " : transport === "polling" ? "Checking every 2 s · " : ""}
          Verified {lastSyncedAt ? formatClock(new Date(lastSyncedAt).toISOString()) : "—"}
        </p>
        <Link href={`/missions/${mission.id}/replay`} className="type-meta text-muted">
          Impact &amp; replay →
        </Link>
      </div>
    </header>
  );

  const footer = (
    <footer className="flex flex-col gap-1 rounded-b-panel border-t border-line-subtle bg-subtle px-5 py-3 text-sm sm:flex-row sm:justify-between md:px-6">
      <span>
        Requirements covered{" "}
        <strong className="tabular">
          {cov.covered} / {cov.total}
        </strong>
        {proposal ? "" : " · no proposal yet"}
      </span>
      <span className={snapshot.approvals.required && snapshot.approvals.accepted < snapshot.approvals.required ? "text-pending" : undefined}>
        Approvals{" "}
        <strong className="tabular">
          {snapshot.approvals.accepted} / {snapshot.approvals.required}
        </strong>
      </span>
      <span className={activated ? "font-medium text-activated" : "text-muted"}>
        {activated ? "◎ Activated" : "Not activated"}
      </span>
    </footer>
  );

  const rail = <RequirementRail rows={rows} names={names} />;
  const center = (
    <CenterPanel
      snapshot={snapshot}
      events={events}
      names={names}
      proposalsQuery={proposals}
      liveFrom={baseline}
      proposal={proposal}
    />
  );
  const known = [...(proposals.data?.proposals ?? []), ...snapshot.proposals].filter(
    (p, i, all) => all.findIndex((q) => q.id === p.id) === i,
  );
  const activity = (
    <ActivityList events={events} names={names} liveFrom={baseline} explain={{ names, rows, proposals: known }} />
  );
  const network = <NetworkView snapshot={snapshot} />;

  return (
    <CueProvider value={cues}>
    <Panel as="div" className="overflow-hidden">
      {header}
      <p className="sr-only" role="status" aria-live="polite">
        {lastLive ? describeEvent(lastLive, names) : ""}
      </p>
      {syncError ? (
        <Notice tone="pending" className="mx-5 mt-4 md:mx-6" role="status" title={describeError(syncError).title}>
          Showing the last verified state. Actions that change the mission stay safe to retry; nothing is queued while offline.
        </Notice>
      ) : null}
      <div className="lg:min-h-[520px] lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside aria-label="Mission needs" className="hidden border-r border-line-subtle px-5 py-6 lg:block">
          {rail}
        </aside>
        <div className="min-w-0">
          <Tabs
            className="px-4 pt-3 pb-6 sm:px-5 lg:px-6 lg:pt-4"
            label={wide ? "Theater view" : "Theater sections"}
            value={["mission", "map", ...(!wide ? ["needs"] : []), ...(!xl ? ["activity"] : [])].includes(tab) ? tab : "mission"}
            onValueChange={setTab}
            items={[
              { value: "mission", label: "Mission", content: center },
              ...(!wide ? [{ value: "needs", label: "Needs", content: rail }] : []),
              { value: "map", label: wide ? "Network map" : "Map", content: network },
              ...(!xl ? [{ value: "activity", label: "Activity", content: activity }] : []),
            ]}
          />
        </div>
        <aside aria-label="Activity" className="hidden border-l border-line-subtle px-5 py-6 xl:block">
          <h2 className="eyebrow mb-3">Activity · committed events</h2>
          {activity}
        </aside>
      </div>
      {footer}
    </Panel>
    </CueProvider>
  );
}

function RequirementRail({ rows, names }: { rows: CoverageRow[]; names: Map<string, string> }) {
  const formation = useCue("mission-formation");
  const repair = useCue("decline-repair");
  const formedId =
    formation && "requirementId" in formation.payload ? (formation.payload.requirementId as string) : null;
  const uncovered =
    repair && repair.type === "REPLAN_STARTED" ? new Set(repair.payload.uncoveredRequirementIds) : new Set<string>();
  if (!rows.length) return <p className="text-sm text-muted">No requirements recorded.</p>;
  return (
    <div>
      <h2 className="eyebrow mb-2 border-b border-line-subtle pb-2">Mission needs</h2>
      <ul className="m-0 list-none p-0">
        {rows.map((r) => {
          const met = r.covered >= r.needed;
          return (
            <CueEntrance
              as="li"
              key={r.id}
              cueKey={formedId === r.id ? formation!.id : uncovered.has(r.id) ? repair!.id : null}
              duration={DUR.sheet}
              className="border-b border-line-subtle py-3 text-sm last:border-b-0"
            >
              <p className="font-medium">
                {r.label}
                {r.kind === "RESOURCE" ? <span className="text-muted"> · resource</span> : null}
              </p>
              <p className={cx("type-meta mt-0.5", met ? "text-approved" : r.covered ? "text-pending" : "text-muted")}>
                {met ? "✓ Covered by proposed group" : r.covered ? `◷ ${r.covered}/${r.needed} covered` : "○ Not covered yet"}
                {r.required ? "" : " · optional"}
              </p>
              {r.by.length ? (
                <p className="type-meta text-muted">{r.by.map((id) => nameFor(names, id)).join(", ")}</p>
              ) : null}
            </CueEntrance>
          );
        })}
      </ul>
      <p className="type-meta mt-3 text-muted">Coverage is feasibility. It does not imply consent.</p>
    </div>
  );
}

function Why({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="mt-1.5 flex gap-2 text-sm leading-5 text-muted">
      <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-action text-[11px] font-semibold text-white">
        C
      </span>
      <span>
        <span className="sr-only">Coordinator: </span>
        {text}
      </span>
    </p>
  );
}

function ActivityList({
  events,
  names,
  liveFrom,
  explain,
}: {
  events: AgentEvent[];
  names: Map<string, string>;
  liveFrom: number | null;
  explain: Parameters<typeof explainEvent>[1];
}) {
  const recent = [...events].reverse().slice(0, 60);
  if (!recent.length)
    return <p className="text-sm text-muted">No committed events yet. Activity appears here as the server records it.</p>;
  return (
    <ol className="m-0 flex list-none flex-col p-0" aria-label="Committed events, newest first">
      {recent.map((e) => {
        const mark = agentMark(e.agent);
        const failed = e.status === "FAILED" || /FAILED$/.test(e.type);
        return (
          <li key={e.id} className="border-t border-line-subtle text-sm first:border-t-0">
            <Emphasis
              cueKey={liveFrom !== null && e.sequence > liveFrom ? e.id : null}
              className="-mx-2 rounded-compact px-2 py-3"
            >
            <div className="flex items-center gap-2">
              <time className="type-meta text-muted tabular" dateTime={e.occurredAt}>
                {formatClock(e.occurredAt)}
              </time>
              {mark ? (
                <span
                  className="type-meta rounded-compact border border-line-control px-1.5 font-semibold"
                  title={e.agent ?? undefined}
                  aria-label={`${e.agent?.toLowerCase()} agent`}
                >
                  {mark}
                </span>
              ) : null}
              <span className="type-meta text-muted">#{e.sequence}</span>
            </div>
            <p className={cx("mt-1", failed && "text-declined")}>{describeEvent(e, names)}</p>
            <Why text={explainEvent(e, explain)} />
            </Emphasis>
          </li>
        );
      })}
    </ol>
  );
}

function CenterPanel({
  snapshot,
  events,
  names,
  proposalsQuery,
  proposal,
  liveFrom,
}: {
  snapshot: MissionSnapshot;
  events: AgentEvent[];
  names: Map<string, string>;
  proposalsQuery: ReturnType<typeof useProposals>;
  proposal: ReturnType<typeof currentProposal>;
  liveFrom: number | null;
}) {
  const client = useQueryClient();
  const mission = snapshot.mission;
  const state = mission.state;
  const start = useCommand("startMission");
  const select = useCommand("selectProposal");
  const activate = useCommand("activateMission");
  const resume = useCommand("resumeMission");
  const repairCue = useCue("decline-repair");
  const [issued, setIssued] = useState<Map<string, string>>(new Map());
  const [cancelOpen, setCancelOpen] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: ["mission", mission.id] });
  const onStale = (e: unknown) => {
    if (isApiError(e) && ["STALE_VERSION", "IDEMPOTENCY_CONFLICT", "TERMINAL_MISSION"].includes(e.code)) void refresh();
  };
  const selRev = selectedRevision(events);
  const step = openStep(events);
  const pause = pauseExplanation(events, proposalsQuery.data);
  const terminal = TERMINAL_STATES.includes(state);
  const blocks: ReactNode[] = [];

  if (state === "DRAFT")
    blocks.push(
      <section key="draft" className="flex flex-col gap-3">
        <h2 className="type-section">Ready when you are</h2>
        <p className="text-muted">Starting discovery asks COHUE to search people who opted in. Nobody is contacted.</p>
        <div>
          <Button
            variant="primary"
            pending={start.isPending}
            pendingLabel="Starting discovery…"
            onClick={() =>
              start.mutate(
                { params: { id: mission.id }, input: { expectedVersion: mission.version } },
                { onSuccess: () => void refresh(), onError: onStale },
              )
            }
          >
            Start discovery
          </Button>
        </div>
        {start.isError ? <ErrorNotice error={start.error} /> : null}
      </section>,
    );

  if (["PLANNING", "DISCOVERING", "REPLANNING"].includes(state))
    blocks.push(
      <section key="working" aria-live="polite" className="flex flex-col gap-2 rounded-field border border-line-panel bg-subtle p-4">
        <p className="type-compact flex items-center gap-2 text-pending">
          <span aria-hidden="true">◷</span>
          {state === "REPLANNING" ? "Looking for a valid repair" : "Working on your mission"}
        </p>
        <p className="text-sm">
          {step ? `Current step: ${describeEvent(step, names).replace(/^Started: /, "")}` : "Waiting for the next recorded step."}
        </p>
        <p className="type-meta text-muted">No estimate is shown; progress appears only as the server records it.</p>
      </section>,
    );

  if (state === "REPLANNING" || state === "REPROPOSED") {
    const replan = [...events].reverse().find((e) => e.type === "REPLAN_STARTED");
    if (replan && replan.type === "REPLAN_STARTED" && replan.payload.uncoveredRequirementIds.length) {
      const labels = replan.payload.uncoveredRequirementIds.map((id) => {
        const r = mission.requirements.find((x) => x.id === id);
        return r ? r.normalizedSkillId : "a requirement";
      });
      blocks.push(
        <CueEntrance key="replan" cueKey={repairCue?.id ?? null} duration={DUR.graph}>
          <Notice tone="pending" title="A response left a gap">
            Missing now: {labels.join(", ")}. People who already approved unchanged terms stay approved only if the server carries their consent forward.
          </Notice>
        </CueEntrance>,
      );
    }
  }

  if (state === "PAUSED_FOR_HUMAN" || state === "FAILED") {
    if (pause)
      blocks.push(
        <Notice key="pause" tone="pending" role="status" title={pause.title}>
          {pause.body}
        </Notice>,
      );
    const paused = [...events].reverse().find((e) => e.type === "PAUSED_FOR_HUMAN");
    const checkpointId =
      paused?.type === "PAUSED_FOR_HUMAN" && IdSchema.safeParse(paused.payload.checkpoint).success
        ? paused.payload.checkpoint
        : null;
    if (state === "PAUSED_FOR_HUMAN" && checkpointId)
      blocks.push(
        <div key="resume" className="flex flex-col gap-2">
          <div>
            <Button
              pending={resume.isPending}
              pendingLabel="Resuming…"
              onClick={() =>
                resume.mutate(
                  { params: { id: mission.id }, input: { expectedVersion: mission.version, checkpointId } },
                  { onSuccess: () => void refresh(), onError: onStale },
                )
              }
            >
              Resume from checkpoint
            </Button>
          </div>
          <p className="type-meta text-muted">
            Resuming rechecks current profiles and constraints from the saved checkpoint. It cannot approve anything on anyone&apos;s behalf.
          </p>
          {resume.isError ? <ErrorNotice error={resume.error} /> : null}
        </div>,
      );
    else if (state === "FAILED")
      blocks.push(
        <Notice key="failed" tone="declined" role="status" title="A step failed">
          Nothing was confirmed on anyone&apos;s behalf. Retry from a server checkpoint is not available in this view yet.
        </Notice>,
      );
  }

  if (state === "ACTIVATED")
    blocks.push(
      <section key="activated" className="flex flex-col gap-3 rounded-field border-2 border-activated bg-activated-bg p-5 outline-2 outline-offset-2 outline-activated">
        <h2 className="type-section text-activated">◎ Activated</h2>
        <p>Every required person approved current terms. Memberships and first tasks are recorded.</p>
        <div>
          <ButtonLink href={`/missions/${mission.id}/room`} variant="primary">
            Open Mission Room
          </ButtonLink>
        </div>
      </section>,
    );

  // Proposals for review / selection (also shown for reconsent after repair).
  const showProposals = ["PROPOSED", "REPROPOSED", "PAUSED_FOR_HUMAN"].includes(state);
  if (showProposals) {
    const list = proposalsQuery.data?.proposals.length ? proposalsQuery.data.proposals : snapshot.proposals;
    const sorted = state === "REPROPOSED" ? [...list].sort((a, b) => b.revision - a.revision) : list;
    if (proposalsQuery.isError && !snapshot.proposals.length)
      blocks.push(<ErrorNotice key="perr" error={proposalsQuery.error} onRetry={() => void proposalsQuery.refetch()} />);
    else if (!sorted.length && state !== "PAUSED_FOR_HUMAN")
      blocks.push(<p key="np" className="text-muted">Proposals are being prepared.</p>);
    if (sorted.length)
      blocks.push(
        <section key="proposals" className="flex flex-col gap-4" aria-labelledby="proposals-h">
          <div>
            <h2 id="proposals-h" className="type-section">
              {state === "REPROPOSED" ? "Review the repaired proposal" : "Review proposed groups"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {state === "REPROPOSED"
                ? "The group or terms changed. Selecting issues fresh invitations where terms changed; earlier approvals of different terms do not count."
                : "These are suggestions. Selecting one prepares invitations; each person still decides."}
            </p>
          </div>
          {sorted.map((p, i) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              snapshot={snapshot}
              names={names}
              rank={i + 1}
              canSelect={!terminal}
              selectedRevision={state === "REPROPOSED" ? null : selRev}
              selecting={select.isPending && select.variables?.params?.proposalId === p.id}
              onSelect={() =>
                select.mutate(
                  {
                    params: { id: mission.id, proposalId: p.id },
                    input: { expectedVersion: mission.version, proposalRevision: p.revision },
                  },
                  {
                    onSuccess: (r) => {
                      setIssued(new Map(r.invitations.map((inv) => [inv.participantId, inv.id])));
                      void refresh();
                    },
                    onError: onStale,
                  },
                )
              }
            />
          ))}
          {select.isError ? <ErrorNotice error={select.error} /> : null}
        </section>,
      );
  }

  if (["AWAITING_APPROVAL", "REPLANNING", "ACTIVATED"].includes(state) && proposal) {
    const members = memberStatuses(proposal, events);
    const gate = activationGate(snapshot);
    blocks.push(
      <section key="invites" className="flex flex-col gap-4" aria-labelledby="invites-h">
        <div>
          <h2 id="invites-h" className="type-section">
            {state === "ACTIVATED" ? "Approved group" : "Invitations"}
          </h2>
          {state !== "ACTIVATED" ? (
            <p className="mt-1 text-sm text-muted">
              Invitation ready means a link exists, not that it was delivered. Share each link with its person; statuses change only when they respond.
            </p>
          ) : null}
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {members.map((m) => {
            const name = nameFor(names, m.participantId);
            const status = m.current ? m.track?.status : undefined;
            const invitationId = (m.current ? m.track?.invitationId : undefined) ?? issued.get(m.participantId);
            const tone = status === "ACCEPTED" ? "approved" : status === "DECLINED" ? "declined" : status ? "pending" : "neutral";
            return (
              <li key={m.participantId} className="rounded-field border border-line-panel bg-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={name} tone={tone} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted">{m.role}</p>
                  </div>
                  {status ? (
                    <CueEntrance
                      as="span"
                      cueKey={liveFrom !== null && m.track && m.track.sequence > liveFrom ? `${m.track.invitationId}-${m.track.sequence}` : null}
                    >
                      <InvitationStatusBadge status={status} />
                    </CueEntrance>
                  ) : m.track && !m.current ? (
                    <StatusBadge tone="neutral">Earlier revision: {m.track.status.toLowerCase()}</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral" icon="┄">
                      {invitationId ? "Invitation ready" : "Awaiting invitation"}
                    </StatusBadge>
                  )}
                </div>
                {status === "COUNTERPROPOSED" ? (
                  <p className="type-meta mt-2 text-pending">
                    ↔ Suggested a different time. This is not an acceptance; the planner treats it as a gap to repair.
                  </p>
                ) : null}
                {invitationId && (status === "PENDING" || (!status && !m.track)) && state !== "ACTIVATED" ? (
                  <div className="mt-3">
                    <ShareLink
                      invitationId={invitationId}
                      personLabel={name}
                    />
                    <div className="mt-3"><CreatorInvitationReview invitationId={invitationId} personLabel={name} /></div>
                    <p className="type-meta mt-1 text-muted">Review here as organizer. Open the bearer link only on the participant&apos;s own device.</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {state === "AWAITING_APPROVAL" ? (
          <div className="flex flex-col gap-2 rounded-field border border-line-panel bg-subtle p-4">
            <p className="type-compact">
              Approvals {snapshot.approvals.accepted} / {snapshot.approvals.required}
            </p>
            <div>
              <Button
                variant="primary"
                disabled={!gate.ready}
                pending={activate.isPending}
                pendingLabel="Activating…"
                onClick={() =>
                  activate.mutate(
                    {
                      params: { id: mission.id },
                      input: { expectedVersion: mission.version, proposalRevision: proposal.revision },
                    },
                    {
                      onSuccess: (room) => {
                        client.setQueryData(keys.room(mission.id), room);
                        void refresh();
                      },
                      onError: onStale,
                    },
                  )
                }
              >
                Activate mission
              </Button>
            </div>
            {!gate.ready ? <p className="type-meta text-muted">{gate.reason}</p> : null}
            {activate.isError ? <ErrorNotice error={activate.error} /> : null}
          </div>
        ) : null}
      </section>,
    );
  }

  if (!blocks.length && !terminal)
    blocks.push(
      <p key="idle" className="text-muted">
        Waiting for the next recorded update.
      </p>,
    );

  if (terminal)
    blocks.push(
      <Notice key="term" tone="info" title={state === "CANCELLED" ? "Cancelled" : "Expired"}>
        {state === "CANCELLED"
          ? "This mission was cancelled. Reservations were released and pending invitations no longer work."
          : `This mission expired at ${formatTimestamp(mission.expiresAt)}. Start a new mission to try again.`}{" "}
        <Link href="/missions/new">Start a new mission</Link>
      </Notice>,
    );

  return (
    <div className="flex flex-col gap-6">
      {blocks}
      {!terminal ? (
        <div className="border-t border-line-subtle pt-4">
          <Button size="sm" variant="tertiary" onClick={() => setCancelOpen(true)}>
            Cancel mission…
          </Button>
          <CancelSheet open={cancelOpen} onOpenChange={setCancelOpen} snapshot={snapshot} onDone={() => void refresh()} />
        </div>
      ) : null}
    </div>
  );
}

function CancelSheet({
  open,
  onOpenChange,
  snapshot,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snapshot: MissionSnapshot;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = useCommand("cancelMission");
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel this mission?"
      description="Cancelling releases any held time, withdraws pending invitations and cannot be undone."
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)}>Keep mission</Button>
          <Button
            variant="decline"
            disabled={!reason.trim()}
            pending={cancel.isPending}
            pendingLabel="Cancelling…"
            onClick={() =>
              cancel.mutate(
                {
                  params: { id: snapshot.mission.id },
                  input: { expectedVersion: snapshot.mission.version, reason: reason.trim() },
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onDone();
                  },
                },
              )
            }
          >
            Cancel mission
          </Button>
        </div>
      }
    >
      <Field label="Reason" helper="Recorded with the cancellation.">
        {(f) => (
          <TextArea id={f.id} aria-describedby={f.describedBy} value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
        )}
      </Field>
      {cancel.isError ? <ErrorNotice className="mt-4" error={cancel.error} /> : null}
    </Sheet>
  );
}
