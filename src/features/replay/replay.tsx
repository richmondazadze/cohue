"use client";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AgentEvent, MissionSnapshot } from "@/contracts";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Panel, Skeleton } from "@/components/ui/surface";
import { MissionStateBadge } from "@/components/ui/status";
import { cx } from "@/components/ui/cx";
import { callApi } from "@/client/http";
import { queryRetry, useSnapshot } from "@/client/queries";
import { formatClock, formatTimestamp } from "@/client/time";
import { NetworkView } from "@/features/theater/network";
import { coverage, coverageSummary, currentProposal, describeEvent, participantNames } from "@/features/theater/model";

/** All committed events, read once over JSON. Replay never opens a live stream and never issues commands. */
function useAllEvents(missionId: string) {
  return useQuery({
    queryKey: ["mission", missionId, "replay-events"],
    queryFn: async ({ signal }) => {
      const all: AgentEvent[] = [];
      let after = 0;
      for (let i = 0; i < 50; i++) {
        const page = await callApi("events", {
          params: { id: missionId },
          input: { after, limit: 100, format: "json" },
          signal,
        });
        all.push(...page.events);
        if (!page.hasMore || !page.events.length) break;
        after = page.events[page.events.length - 1].sequence;
      }
      return all;
    },
    retry: queryRetry,
    staleTime: 30_000,
  });
}

export function ReplayAndImpact({ missionId }: { missionId: string }) {
  const events = useAllEvents(missionId);
  const live = useSnapshot(missionId);
  if (events.isPending || live.isPending)
    return <Skeleton className="h-96 w-full rounded-panel" label="Loading mission history" />;
  if (events.isError || live.isError)
    return <ErrorNotice error={events.error ?? live.error} onRetry={() => void events.refetch()} />;
  return <ReplayView missionId={missionId} events={events.data} current={live.data} />;
}

function Impact({ snapshot, events }: { snapshot: MissionSnapshot; events: AgentEvent[] }) {
  const proposal = currentProposal(snapshot, events);
  const cov = coverageSummary(coverage(snapshot, proposal));
  const activation = [...events].reverse().find((e) => e.type === "MISSION_ACTIVATED");
  const repairs = events.filter((e) => e.type === "REPLAN_COMPLETED").length;
  const declines = events.filter((e) => e.type === "INVITATION_DECLINED" || e.type === "INVITATION_COUNTERPROPOSED").length;
  return (
    <Panel data-tilt className="p-5 md:p-6" aria-labelledby="impact-h">
      <p className="eyebrow">Verifiable outcomes · from committed records only</p>
      <h2 id="impact-h" className="type-section mt-1">
        Impact
      </h2>
      <dl className="m-0 mt-3 grid gap-x-8 sm:grid-cols-2">
        <KeyValue label="Approved members">
          <span className="tabular">
            {snapshot.approvals.accepted} of {snapshot.approvals.required || "—"}
          </span>
        </KeyValue>
        <KeyValue label="Required needs covered">
          <span className="tabular">
            {cov.covered} of {cov.total}
          </span>
        </KeyValue>
        <KeyValue label="Declines or changes handled">
          <span className="tabular">
            {declines} · {repairs} repaired proposal{repairs === 1 ? "" : "s"}
          </span>
        </KeyValue>
        <KeyValue label="Tasks assigned">
          {activation && activation.type === "MISSION_ACTIVATED" ? (
            <span className="tabular">{activation.payload.taskIds.length}</span>
          ) : (
            "Not activated yet"
          )}
        </KeyValue>
        <KeyValue label="Activated">{activation ? formatTimestamp(activation.occurredAt) : "Not yet"}</KeyValue>
        <KeyValue label="Public resources">
          {snapshot.opportunities.length ? `${snapshot.opportunities.length} · unverified` : "None"}
        </KeyValue>
      </dl>
      <p className="type-meta mt-3 text-muted">
        No estimated reach or “people impacted” figure is shown: only what the records prove.
      </p>
    </Panel>
  );
}

function ReplayView({
  missionId,
  events,
  current,
}: {
  missionId: string;
  events: AgentEvent[];
  current: MissionSnapshot;
}) {
  const max = events.length ? events[events.length - 1].sequence : 0;
  const min = events.length ? events[0].sequence : 0;
  const [at, setAt] = useState(max);
  const deferred = useDeferredValue(at);
  const historic = useQuery({
    queryKey: ["mission", missionId, "replay", deferred],
    queryFn: ({ signal }) => callApi("replay", { params: { id: missionId }, input: { atSequence: deferred }, signal }),
    enabled: deferred > 0,
    placeholderData: keepPreviousData,
    retry: queryRetry,
    staleTime: Infinity,
  });
  const upTo = useMemo(() => events.filter((e) => e.sequence <= at), [events, at]);
  const atEvent = upTo[upTo.length - 1];
  const names = useMemo(() => (historic.data ? participantNames(historic.data) : participantNames(current)), [historic.data, current]);

  return (
    <div className="flex flex-col gap-6">
      <Impact snapshot={current} events={events} />

      <Panel className="overflow-hidden" aria-labelledby="replay-h">
        <div className="sticky top-0 z-10 border-b border-pending bg-pending-bg px-5 py-3 text-sm text-pending" role="note">
          <strong>Replay · read-only.</strong> Historical state at event #{at}
          {atEvent ? ` · ${formatClock(atEvent.occurredAt)}` : ""}. Nothing here changes the live mission.
        </div>
        <div className="flex flex-col gap-5 p-5 md:p-6">
          <h2 id="replay-h" className="type-section">
            Replay
          </h2>
          {max === 0 ? (
            <p className="text-muted">History unavailable: no committed events yet.</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <label htmlFor="replay-scrubber" className="type-compact">
                  Event {at} of {max}
                </label>
                <input
                  id="replay-scrubber"
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={at}
                  onChange={(e) => setAt(Number(e.target.value))}
                  aria-valuetext={atEvent ? `Event ${at}: ${describeEvent(atEvent, names)}` : `Event ${at}`}
                  className="h-11 w-full accent-[#315CCE]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setAt((v) => Math.max(min, v - 1))} disabled={at <= min}>
                    ← Previous
                  </Button>
                  <Button size="sm" onClick={() => setAt((v) => Math.min(max, v + 1))} disabled={at >= max}>
                    Next →
                  </Button>
                  <Button size="sm" variant="tertiary" onClick={() => setAt(max)} disabled={at === max}>
                    Latest
                  </Button>
                </div>
                {atEvent ? (
                  <p className="text-sm" aria-live="polite">
                    {describeEvent(atEvent, names)}
                  </p>
                ) : null}
              </div>

              <div className={cx("grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]", historic.isFetching && "opacity-70")}>
                <div className="min-w-0">
                  {historic.isError ? (
                    <ErrorNotice
                      error={historic.error}
                      title="Historical snapshot unavailable · the event record beside it is complete"
                      onRetry={() => void historic.refetch()}
                    />
                  ) : !historic.data ? (
                    <Skeleton className="h-64 w-full" label="Loading historical state" />
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <MissionStateBadge state={historic.data.mission.state} />
                        <span className="type-meta text-muted tabular">
                          Approvals {historic.data.approvals.accepted}/{historic.data.approvals.required}
                        </span>
                      </div>
                      <NetworkView snapshot={historic.data} events={upTo} historical />
                    </>
                  )}
                </div>
                <ol className="m-0 flex max-h-[480px] list-none flex-col overflow-y-auto p-0" aria-label="Events up to this point">
                  {[...upTo].reverse().map((e) => (
                    <li
                      key={e.id}
                      className={cx(
                        "border-t border-line-subtle px-2 py-2 text-sm first:border-t-0",
                        e.sequence === at && "bg-selected",
                      )}
                    >
                      <button type="button" className="w-full text-left" onClick={() => setAt(e.sequence)}>
                        <span className="type-meta text-muted tabular">
                          #{e.sequence} · {formatClock(e.occurredAt)}
                        </span>
                        <span className="block">{describeEvent(e, names)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </Panel>
      <Notice tone="info">
        Replay uses its own historical snapshots and clock. Audio is not kept in history.{" "}
        <Link href={`/missions/${missionId}`}>Back to the live Mission Theater</Link>
      </Notice>
    </div>
  );
}
