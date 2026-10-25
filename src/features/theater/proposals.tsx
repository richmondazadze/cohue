"use client";
import type { GroupProposal, MissionSnapshot } from "@/contracts";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status";
import { formatInterval, minutesBetween } from "@/client/time";
import { skillLabel } from "@/features/shared/skills";
import { initialsOf, nameFor } from "./model";
import { CueEntrance, useCue } from "./motion";

export function Avatar({ name, tone = "neutral" }: { name: string; tone?: "neutral" | "approved" | "pending" | "declined" }) {
  const ring =
    tone === "approved"
      ? "border-approved bg-approved-bg text-approved"
      : tone === "pending"
        ? "border-pending border-dashed bg-pending-bg text-pending"
        : tone === "declined"
          ? "border-declined bg-declined-bg text-declined"
          : "border-line-control bg-surface text-ink";
  return (
    <span
      aria-hidden="true"
      className={`grid size-10 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold ${ring}`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function ProposalCard({
  proposal,
  snapshot,
  names,
  rank,
  onSelect,
  selecting,
  canSelect,
  selectedRevision,
}: {
  proposal: GroupProposal;
  snapshot: MissionSnapshot;
  names: Map<string, string>;
  rank: number;
  onSelect?: () => void;
  selecting?: boolean;
  canSelect: boolean;
  selectedRevision: number | null;
}) {
  // Discovery (candidates found) or a completed repair staggers member entrance once, ≤120ms total.
  const discovery = useCue("discovery");
  const repair = useCue("decline-repair");
  const entranceKey =
    repair?.type === "REPLAN_COMPLETED" && repair.payload.proposalId === proposal.id
      ? repair.id
      : discovery
        ? discovery.id
        : null;
  const reqById = new Map(snapshot.mission.requirements.map((r) => [r.id, r]));
  const s = proposal.score;
  const isSelected = selectedRevision === proposal.revision;
  return (
    <article
      aria-labelledby={`proposal-${proposal.id}`}
      data-tilt
      className="rounded-panel border border-line-panel bg-surface"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <div>
          <p className="eyebrow">
            Option {rank} · revision {proposal.revision}
          </p>
          <h3 id={`proposal-${proposal.id}`} className="type-panel mt-1">
            {proposal.members.length} {proposal.members.length === 1 ? "person" : "people"} ·{" "}
            {minutesBetween(proposal.commonWindow.start, proposal.commonWindow.end)} min together
          </h3>
        </div>
        {isSelected ? (
          <StatusBadge tone="action">Selected · invitations issued</StatusBadge>
        ) : (
          <StatusBadge tone="neutral" icon="┄">
            Suggested · not invited
          </StatusBadge>
        )}
      </header>
      <ul className="m-0 list-none divide-y divide-line-subtle p-0">
        {proposal.members.map((m, i) => {
          const name = nameFor(names, m.participantId);
          return (
            <CueEntrance
              as="li"
              key={m.participantId}
              index={i}
              cueKey={entranceKey ? `${entranceKey}-${m.participantId}` : null}
              className="flex items-start gap-3 px-5 py-3"
            >
              <Avatar name={name} />
              <div className="min-w-0">
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted">
                  {m.role}{m.coveredRequirementIds.length ? " · covers " : ""}
                  {m.coveredRequirementIds
                    .map((id) => {
                      const r = reqById.get(id);
                      return r ? skillLabel(r.normalizedSkillId) : "requirement";
                    })
                    .join(", ")}
                </p>
              </div>
            </CueEntrance>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 border-t border-line-subtle px-5 py-4 text-sm">
        <p>
          <span className="eyebrow mr-2">Shared window</span>
          {formatInterval(proposal.commonWindow)}
        </p>
        <p>
          <span className="eyebrow mr-2">Why this group</span>
          {proposal.rationale}
        </p>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="type-meta text-muted">Optional needs met</dt>
            <dd className="m-0 tabular">{s.optionalCoverage}</dd>
          </div>
          <div>
            <dt className="type-meta text-muted">Mutual benefit</dt>
            <dd className="m-0 tabular">{s.mutualBenefit}</dd>
          </div>
          <div>
            <dt className="type-meta text-muted">Interest match</dt>
            <dd className="m-0 tabular">{s.interestRelevance}</dd>
          </div>
          <div>
            <dt className="type-meta text-muted">Kept commitments</dt>
            <dd className="m-0 tabular">{s.preservedCommitments}</dd>
          </div>
        </dl>
        <p className="type-meta text-muted">
          {proposal.search.complete
            ? `Search complete · ${proposal.search.visitedNodes.toLocaleString()} combinations checked.`
            : `Search stopped early (${proposal.search.stoppedBecause === "NODE_LIMIT" ? "node limit" : "time limit"}) · feasible, but not proven best.`}{" "}
          Ranking uses counts above, never a consent prediction.
        </p>
      </div>
      {onSelect && canSelect && !isSelected ? (
        <footer className="border-t border-line-subtle px-5 py-4">
          <Button
            variant="primary"
            onClick={onSelect}
            pending={selecting}
            pendingLabel="Preparing invitations…"
            className="w-full sm:w-auto"
          >
            Select this group &amp; prepare invitations
          </Button>
          <p className="type-meta mt-2 text-muted">
            Prepares one invitation per person. Each person reads the terms and decides; nobody is added automatically.
          </p>
        </footer>
      ) : null}
    </article>
  );
}
