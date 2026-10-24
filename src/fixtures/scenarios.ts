import {
  AgentEventSchema,
  CommitmentTermsSchema,
  GroupProposalSchema,
  InvitationSchema,
  MissionSchema,
  MissionSnapshotSchema,
  ParticipantSchema,
  ResponseCommandSchema,
  ScopeSchema,
  canonicalTermsJson,
} from "@/contracts";
import { taxonomy } from "./taxonomy";
import proposalMembers from "./proposal-members.json";

export const FIXTURE_NOTICE =
  "Synthetic showcase fixtures. No real participants, consent, provider executions or outcomes.";
export const fixtureId = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const scope = ScopeSchema.parse({
  executionMode: "SHOWCASE",
  showcaseId: fixtureId(900),
});
export const fixtureTime = "2026-10-25T14:00:00Z";
export const fixtureWindow = {
  start: "2026-10-25T14:00:00Z",
  end: "2026-10-25T16:00:00Z",
  timezone: "America/Chicago",
};
const skills = [
  "coordination",
  "design",
  "hardware",
  "hardware",
  "software",
  "accessibility",
  "research",
] as const;
export const participants = Array.from({ length: 30 }, (_, i) =>
  ParticipantSchema.parse({
    id: fixtureId(i + 1),
    profileVersion: 1,
    scope,
    createdAt: fixtureTime,
    displayName: `Synthetic Participant ${String(i + 1).padStart(2, "0")}`,
    language: ["en", "es", "fr"][i % 3],
    needs: [i === 2 ? "coordination" : skills[(i + 1) % skills.length]],
    interests: ["accessibility"],
    availability:
      i === 27
        ? []
        : [
            i === 26
              ? {
                  start: "2026-10-25T18:00:00Z",
                  end: "2026-10-25T19:00:00Z",
                  timezone: "America/Chicago",
                }
              : fixtureWindow,
          ],
    capabilities: [
      {
        normalizedSkillId: skills[i % skills.length],
        category: taxonomy.skills.find(
          (s) => s.id === skills[i % skills.length],
        )!.category,
        level: 3,
        evidence: null,
        confirmedByUser: true,
        normalizationVersion: "taxonomy-1",
      },
    ],
    visibility: { publicGraph: i < 25, discoverable: i !== 28 },
    participationOptIn: i !== 29,
  }),
);
export const regressionParticipants = participants.slice(0, 20);
export const mission = MissionSchema.parse({
  id: fixtureId(100),
  creatorId: participants[0].id,
  objective: "Build an accessible hardware prototype",
  expectedOutput: "An agreed prototype plan and assigned first tasks",
  language: "en",
  state: "DRAFT",
  version: 1,
  constraintsVersion: 1,
  scope,
  constraints: {
    minGroupSize: 3,
    maxGroupSize: 3,
    minOverlapMinutes: 60,
    window: fixtureWindow,
    creatorParticipates: true,
    preferences: ["accessibility"],
  },
  requirements: [
    {
      id: fixtureId(101),
      missionId: fixtureId(100),
      version: 1,
      kind: "HUMAN",
      normalizedSkillId: "design",
      category: "product",
      priority: "REQUIRED",
      minimumCoverage: 1,
      minimumLevel: 2,
      outcome: "Usable prototype interface",
    },
    {
      id: fixtureId(102),
      missionId: fixtureId(100),
      version: 1,
      kind: "HUMAN",
      normalizedSkillId: "hardware",
      category: "engineering",
      priority: "REQUIRED",
      minimumCoverage: 1,
      minimumLevel: 2,
      outcome: "Hardware prototype plan",
    },
  ],
  createdAt: fixtureTime,
  expiresAt: "2026-10-26T14:00:00Z",
});
export const terms = CommitmentTermsSchema.parse({
  participantId: participants[1].id,
  missionId: mission.id,
  role: "Designer",
  responsibilities: ["Design the accessible prototype interface"],
  schedule: fixtureWindow,
  disclosedGroup: [
    { participantId: participants[0].id, role: "Coordinator" },
    { participantId: participants[1].id, role: "Designer" },
    { participantId: participants[2].id, role: "Hardware engineer" },
  ],
  objective: mission.objective,
  expectedOutput: mission.expectedOutput,
});
// SHA-256 of canonicalTermsJson(terms), generated once; validated by contract tests.
export const termsHash =
  "9870b199265aacae5d99309f2022cfcd3c3ade807ea768235b601d34bdb0cb60";
export const invitation = InvitationSchema.parse({
  id: fixtureId(200),
  missionId: mission.id,
  proposalId: fixtureId(150),
  proposalRevision: 1,
  participantId: participants[1].id,
  scope,
  language: "es",
  status: "PENDING",
  terms,
  termsHash,
  responseVersion: 1,
  expiresAt: "2026-10-25T18:00:00Z",
  lineage: null,
});
export const acceptCommand = ResponseCommandSchema.parse({
  action: "ACCEPT",
  termsHash,
  responseVersion: 1,
});
export const declineCommand = ResponseCommandSchema.parse({
  action: "DECLINE",
  termsHash,
  responseVersion: 1,
  reason: "No longer available",
});
export const counterCommand = ResponseCommandSchema.parse({
  action: "COUNTER",
  termsHash,
  responseVersion: 1,
  availabilityProposal: [
    {
      start: "2026-10-25T15:00:00Z",
      end: "2026-10-25T16:00:00Z",
      timezone: "America/Chicago",
    },
  ],
});
export const searchStats = {
  algorithmVersion: "bounded-lexicographic-1" as const,
  taxonomyVersion: "taxonomy-1" as const,
  visitedNodes: 20,
  maxNodes: 50000 as const,
  maxWallTimeMs: 1500 as const,
  elapsedMs: 1,
  complete: true,
  stoppedBecause: "EXHAUSTED" as const,
};
export const proposal = GroupProposalSchema.parse({
  id: fixtureId(150),
  missionId: mission.id,
  revision: 1,
  constraintsVersion: 1,
  scope,
  members: proposalMembers,
  commonWindow: fixtureWindow,
  score: {
    optionalCoverage: 0,
    mutualBenefit: 1,
    interestRelevance: 3,
    preservedCommitments: 0,
    teamSize: 3,
    stableParticipantIds: [
      participants[0].id,
      participants[1].id,
      participants[2].id,
    ],
  },
  search: searchStats,
  rationale:
    "Synthetic structurally valid group; expected feasibility must be verified by the backend matcher",
  createdAt: fixtureTime,
});
const rawEvents = [
  { type: "MISSION_CREATED", payload: { state: "DRAFT" } },
  {
    type: "AGENT_STARTED",
    payload: { operation: "coordinate", evidenceIds: [] },
  },
  {
    type: "CANDIDATES_FOUND",
    payload: {
      candidateIds: [fixtureId(1), fixtureId(2), fixtureId(3), fixtureId(4)],
    },
  },
  { type: "PROPOSAL_CREATED", payload: { proposalId: fixtureId(150) } },
  {
    type: "INVITATION_SENT",
    payload: {
      invitationId: fixtureId(199),
      participantId: fixtureId(1),
      invitationStatus: "PENDING",
    },
  },
  {
    type: "INVITATION_SENT",
    payload: {
      invitationId: fixtureId(200),
      participantId: fixtureId(2),
      invitationStatus: "PENDING",
    },
  },
  {
    type: "INVITATION_SENT",
    payload: {
      invitationId: fixtureId(201),
      participantId: fixtureId(3),
      invitationStatus: "PENDING",
    },
  },
  {
    type: "INVITATION_ACCEPTED",
    payload: {
      invitationId: fixtureId(199),
      participantId: fixtureId(1),
      invitationStatus: "ACCEPTED",
    },
  },
  {
    type: "INVITATION_ACCEPTED",
    payload: {
      invitationId: fixtureId(200),
      participantId: fixtureId(2),
      invitationStatus: "ACCEPTED",
    },
  },
  {
    type: "INVITATION_DECLINED",
    payload: {
      invitationId: fixtureId(201),
      participantId: fixtureId(3),
      invitationStatus: "DECLINED",
    },
  },
  {
    type: "REPLAN_STARTED",
    payload: { uncoveredRequirementIds: [fixtureId(102)] },
  },
  { type: "PROPOSAL_CREATED", payload: { proposalId: fixtureId(151) } },
  { type: "REPLAN_COMPLETED", payload: { proposalId: fixtureId(151) } },
  {
    type: "INVITATION_REVOKED",
    payload: {
      invitationId: fixtureId(199),
      participantId: fixtureId(1),
      invitationStatus: "REVOKED",
    },
  },
  {
    type: "INVITATION_REVOKED",
    payload: {
      invitationId: fixtureId(200),
      participantId: fixtureId(2),
      invitationStatus: "REVOKED",
    },
  },
  {
    type: "INVITATION_SENT",
    payload: {
      invitationId: fixtureId(203),
      participantId: fixtureId(1),
      invitationStatus: "PENDING",
    },
  },
  {
    type: "INVITATION_SENT",
    payload: {
      invitationId: fixtureId(204),
      participantId: fixtureId(2),
      invitationStatus: "PENDING",
    },
  },
  {
    type: "INVITATION_SENT",
    payload: {
      invitationId: fixtureId(202),
      participantId: fixtureId(4),
      invitationStatus: "PENDING",
    },
  },
  {
    type: "INVITATION_ACCEPTED",
    payload: {
      invitationId: fixtureId(203),
      participantId: fixtureId(1),
      invitationStatus: "ACCEPTED",
    },
  },
  {
    type: "INVITATION_ACCEPTED",
    payload: {
      invitationId: fixtureId(204),
      participantId: fixtureId(2),
      invitationStatus: "ACCEPTED",
    },
  },
  {
    type: "INVITATION_ACCEPTED",
    payload: {
      invitationId: fixtureId(202),
      participantId: fixtureId(4),
      invitationStatus: "ACCEPTED",
    },
  },
  {
    type: "MISSION_ACTIVATED",
    payload: {
      membershipIds: [fixtureId(300), fixtureId(301), fixtureId(302)],
      taskIds: [fixtureId(400)],
    },
  },
  { type: "TASK_CREATED", payload: { taskId: fixtureId(400) } },
  {
    type: "AGENT_COMPLETED",
    payload: { operation: "coordinate", evidenceIds: [] },
  },
];
export const syntheticEvents = rawEvents.map((e, i) =>
  AgentEventSchema.parse({
    schemaVersion: 1,
    id: fixtureId(500 + i),
    missionId: mission.id,
    scope,
    runId: i === 0 ? null : fixtureId(700),
    agent: i === 0 ? null : "COORDINATOR",
    sequence: i + 1,
    missionVersion: i + 1,
    proposalRevision: i === 0 ? null : i < 11 ? 1 : 2,
    correlationId: fixtureId(800),
    causationId: i === 0 ? null : fixtureId(499 + i),
    occurredAt: new Date(Date.parse(fixtureTime) + i * 1000).toISOString(),
    status: e.type === "AGENT_STARTED" ? "STARTED" : "SUCCEEDED",
    durationMs: null,
    ...e,
  }),
);
export const draftSnapshot = MissionSnapshotSchema.parse({
  scope,
  snapshotSequence: 1,
  mission,
  graph: {
    snapshotSequence: 1,
    nodes: [
      {
        id: mission.id,
        kind: "mission",
        label: "Synthetic draft mission",
        status: "SUGGESTED",
        evidenceRefs: [],
      },
    ],
    edges: [],
  },
  proposals: [],
  opportunities: [],
  approvals: { required: 0, accepted: 0 },
  receivedAt: fixtureTime,
});
export const scenarios = [
  {
    id: "formation",
    description: "Creator, designer and hardware engineer share a common hour",
    participantIds: [fixtureId(1), fixtureId(2), fixtureId(3), fixtureId(4)],
    expected: "FEASIBLE",
  },
  {
    id: "missing-skill",
    description: "Designer only, required hardware unavailable",
    participantIds: [fixtureId(1), fixtureId(2)],
    expected: "NO_SOLUTION",
  },
  {
    id: "decline-repair",
    description:
      "Hardware participant 3 declines; seek participant 4, pending renewed group terms",
    participantIds: [fixtureId(1), fixtureId(2), fixtureId(3), fixtureId(4)],
    declineParticipantId: fixtureId(3),
    replacementParticipantId: fixtureId(4),
    expected: "REPLAN_WITH_RECONSENT_IF_GROUP_CHANGED",
  },
  {
    id: "changed-availability",
    description: "Counterproposal must not be counted as acceptance",
    participantIds: [fixtureId(1), fixtureId(2), fixtureId(3)],
    command: counterCommand,
    expected: "REPLANNING",
  },
  {
    id: "multilingual",
    description: "Reviewed English mission, Spanish acceptance, French decline",
    participantIds: [fixtureId(1), fixtureId(2), fixtureId(3), fixtureId(4)],
    expected: "EXPLICIT_HUMAN_COMMANDS",
  },
] as const;
export const recordedConsentCases = {
  unchanged: {
    termsHash,
    lineage: {
      sourceInvitationId: invitation.id,
      sourceResponseId: fixtureId(250),
      sourceProposalRevision: 1,
      carriedToProposalRevision: 2,
      termsHash,
      revalidatedAt: fixtureTime,
    },
  },
  changedTerms: {
    ...terms,
    role: "Researcher",
    disclosedGroup: terms.disclosedGroup.map((m) =>
      m.participantId === terms.participantId
        ? { ...m, role: "Researcher" }
        : m,
    ),
  },
  expiredAt: "2026-10-25T18:00:00Z",
  cancelledState: "CANCELLED",
} as const;
export const canonicalTermsFixture = canonicalTermsJson;

export const reciprocalCycleFixture = {
  participantIds: [fixtureId(1), fixtureId(2), fixtureId(3)],
  directedEdges: [
    { from: fixtureId(1), to: fixtureId(2), need: "design" },
    { from: fixtureId(2), to: fixtureId(3), need: "hardware" },
    { from: fixtureId(3), to: fixtureId(1), need: "coordination" },
  ],
} as const;
export const receiptReplayFixtures = [
  {
    name: "exact-replay-after-version-increment",
    key: "synthetic_accept_0001",
    first: acceptCommand,
    replay: acceptCommand,
    expected: "RETURN_STORED_SUCCESS",
  },
  {
    name: "changed-payload-same-key",
    key: "synthetic_accept_0001",
    first: acceptCommand,
    replay: declineCommand,
    expected: "IDEMPOTENCY_CONFLICT",
  },
  {
    name: "new-key-stale-response-version",
    key: "synthetic_accept_0002",
    replay: acceptCommand,
    expected: "STALE_VERSION",
  },
  {
    name: "expired-without-receipt",
    at: recordedConsentCases.expiredAt,
    expected: "INVITATION_EXPIRED",
  },
  {
    name: "cancelled-new-command",
    state: "CANCELLED",
    expected: "TERMINAL_MISSION",
  },
] as const;
