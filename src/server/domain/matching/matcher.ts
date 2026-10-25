// Pure deterministic bounded matcher (D-matching resolutions). No I/O, no LLM, no wall time in ranking.
export type Interval = { start: number; end: number };
export type MatchCapability = { skillId: string; level: number | null };
export type MatchCandidate = {
  id: string;
  capabilities: MatchCapability[];
  needs: string[];
  interests: string[];
  availability: Interval[];
  busy: Interval[];
};
export type MatchRequirement = {
  id: string;
  kind: "HUMAN" | "RESOURCE";
  skillId: string;
  priority: "REQUIRED" | "OPTIONAL";
  minimumCoverage: number;
  minimumLevel: number | null;
};
export type MatchInput = {
  candidates: MatchCandidate[];
  requirements: MatchRequirement[];
  preferences: string[];
  minGroupSize: number;
  maxGroupSize: number;
  minOverlapMinutes: number;
  window: Interval;
  creatorId: string | null;
  acceptedGroup: { ids: string[]; window: Interval } | null;
  maxNodes?: number;
  maxWallTimeMs?: number;
  maxProposals?: number;
  now?: () => number;
};
export type Score = {
  optionalCoverage: number;
  mutualBenefit: number;
  interestRelevance: number;
  preservedCommitments: number;
  teamSize: number;
  stableParticipantIds: string[];
};
export type MatchGroup = {
  participantIds: string[];
  commonWindow: Interval;
  score: Score;
  coverage: Record<string, string[]>;
};
export type MatchOutput = {
  feasibility: "FEASIBLE" | "NO_SOLUTION" | "SEARCH_LIMIT_REACHED";
  groups: MatchGroup[];
  uncoveredRequirementIds: string[];
  search: {
    visitedNodes: number;
    elapsedMs: number;
    complete: boolean;
    stoppedBecause: "EXHAUSTED" | "NODE_LIMIT" | "TIME_LIMIT";
  };
};

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a)
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (start < end) out.push({ start, end });
    }
  return out.sort((p, q) => p.start - q.start);
}
export function subtract(a: Interval[], busy: Interval[]): Interval[] {
  let current = a;
  for (const b of busy) {
    const next: Interval[] = [];
    for (const x of current) {
      if (b.end <= x.start || b.start >= x.end) next.push(x);
      else {
        if (b.start > x.start) next.push({ start: x.start, end: b.start });
        if (b.end < x.end) next.push({ start: b.end, end: x.end });
      }
    }
    current = next;
  }
  return current;
}

const holds = (c: MatchCandidate, r: MatchRequirement) =>
  c.capabilities.some(
    (cap) =>
      cap.skillId === r.skillId &&
      (r.minimumLevel === null || (cap.level !== null && cap.level >= r.minimumLevel)),
  );

// Descending components, then ascending team size and sorted UUID tuple.
export function compareScores(a: Score, b: Score): number {
  for (const k of ["optionalCoverage", "mutualBenefit", "interestRelevance", "preservedCommitments"] as const)
    if (a[k] !== b[k]) return b[k] - a[k];
  if (a.teamSize !== b.teamSize) return a.teamSize - b.teamSize;
  const n = Math.min(a.stableParticipantIds.length, b.stableParticipantIds.length);
  for (let i = 0; i < n; i++) {
    const c = byId(a.stableParticipantIds[i], b.stableParticipantIds[i]);
    if (c) return c;
  }
  return a.stableParticipantIds.length - b.stableParticipantIds.length;
}

export function match(input: MatchInput): MatchOutput {
  const maxNodes = input.maxNodes ?? 50_000;
  const maxWall = input.maxWallTimeMs ?? 1_500;
  const maxProposals = input.maxProposals ?? 5;
  const now = input.now ?? Date.now;
  const started = now();
  const minOverlap = input.minOverlapMinutes * 60_000;
  const human = input.requirements.filter((r) => r.kind === "HUMAN");
  const required = human.filter((r) => r.priority === "REQUIRED");
  const optional = human.filter((r) => r.priority === "OPTIONAL");
  const relevantSkills = new Set([...human.map((r) => r.skillId), ...input.preferences]);

  const free = new Map(
    input.candidates.map((c) => [c.id, subtract(intersect(c.availability, [input.window]), c.busy)]),
  );
  const pool = input.candidates
    .filter((c) => c.id !== input.creatorId && (free.get(c.id) ?? []).some((i) => i.end - i.start >= minOverlap))
    .sort((a, b) => byId(a.id, b.id));
  const creator = input.creatorId ? input.candidates.find((c) => c.id === input.creatorId) : undefined;

  const uncovered = required
    .filter((r) => ![...pool, ...(creator ? [creator] : [])].some((c) => holds(c, r)))
    .map((r) => r.id);

  const best: MatchGroup[] = [];
  let visited = 0;
  let stopped: "EXHAUSTED" | "NODE_LIMIT" | "TIME_LIMIT" = "EXHAUSTED";

  const evaluate = (members: MatchCandidate[], common: Interval[]) => {
    const window = common.find((i) => i.end - i.start >= minOverlap);
    if (!window) return;
    const coverage: Record<string, string[]> = {};
    for (const r of human) coverage[r.id] = members.filter((m) => holds(m, r)).map((m) => m.id).sort(byId);
    if (required.some((r) => coverage[r.id].length < r.minimumCoverage)) return;
    const ids = members.map((m) => m.id).sort(byId);
    let mutualBenefit = 0;
    for (const m of members)
      for (const need of new Set(m.needs))
        if (members.some((o) => o.id !== m.id && o.capabilities.some((c) => c.skillId === need))) mutualBenefit++;
    const accepted = input.acceptedGroup;
    const sameGroup =
      accepted !== null &&
      accepted.ids.length === ids.length &&
      [...accepted.ids].sort(byId).every((id, i) => id === ids[i]) &&
      accepted.window.start === window.start &&
      accepted.window.end === window.end;
    const score: Score = {
      optionalCoverage: optional.filter((r) => coverage[r.id].length >= r.minimumCoverage).length,
      mutualBenefit,
      interestRelevance: members.reduce(
        (sum, m) => sum + new Set(m.interests.filter((i) => relevantSkills.has(i))).size,
        0,
      ),
      preservedCommitments: sameGroup ? ids.length : 0,
      teamSize: ids.length,
      stableParticipantIds: ids,
    };
    best.push({ participantIds: ids, commonWindow: window, score, coverage });
    best.sort((a, b) => compareScores(a.score, b.score));
    if (best.length > maxProposals) best.pop();
  };

  // Stable depth-first subset enumeration; a node is one visited partial subset.
  const dfs = (startIndex: number, chosen: MatchCandidate[], common: Interval[]): boolean => {
    visited++;
    if (visited > maxNodes) {
      stopped = "NODE_LIMIT";
      return false;
    }
    if ((visited & 255) === 0 && now() - started > maxWall) {
      stopped = "TIME_LIMIT";
      return false;
    }
    if (chosen.length >= input.minGroupSize) evaluate(chosen, common);
    if (chosen.length >= input.maxGroupSize) return true;
    for (let i = startIndex; i < pool.length; i++) {
      if (chosen.length + (pool.length - i) < input.minGroupSize) break;
      const next = intersect(common, free.get(pool[i].id) ?? []);
      // Overlap only shrinks as members are added, so an infeasible prefix prunes its subtree.
      if (!next.some((w) => w.end - w.start >= minOverlap)) continue;
      if (!dfs(i + 1, [...chosen, pool[i]], next)) return false;
    }
    return true;
  };

  const initial = creator ? [creator] : [];
  const initialCommon = creator ? (free.get(creator.id) ?? []) : [input.window];
  if (input.maxGroupSize >= initial.length && initialCommon.some((w) => w.end - w.start >= minOverlap))
    dfs(0, initial, initialCommon);
  else visited = Math.max(visited, 1);

  const complete = stopped === "EXHAUSTED";
  return {
    feasibility: best.length ? "FEASIBLE" : complete ? "NO_SOLUTION" : "SEARCH_LIMIT_REACHED",
    groups: best,
    uncoveredRequirementIds: best.length ? [] : uncovered,
    search: {
      visitedNodes: Math.min(visited, maxNodes),
      elapsedMs: Math.max(0, now() - started),
      complete,
      stoppedBecause: stopped,
    },
  };
}
