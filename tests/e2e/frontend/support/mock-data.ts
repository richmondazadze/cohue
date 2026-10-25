import { GroupProposalSchema, MissionSchema, ParticipantSchema } from "@/contracts";

// Labeled synthetic UI-test data (Playwright cannot load the JSON-importing shared fixtures module).
export const fixtureId = (n: number): string =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
export const scope = { executionMode: "LIVE", showcaseId: null } as const;
export const fixtureTime = "2026-10-25T14:00:00Z";
const window = { start: "2026-12-01T14:00:00Z", end: "2026-12-01T16:00:00Z", timezone: "America/Chicago" };
export const participants = [1, 2, 3, 4].map((n, i) =>
  ParticipantSchema.parse({
    id: fixtureId(n),
    profileVersion: 1,
    scope,
    createdAt: fixtureTime,
    displayName: `Synthetic ${n}`,
    language: ["en", "es", "fr", "en"][i],
    needs: [],
    interests: [],
    availability: [window],
    capabilities: [],
    visibility: { publicGraph: false, discoverable: true },
    participationOptIn: true,
  }),
);
export const mission = MissionSchema.parse({
  id: fixtureId(100),
  creatorId: fixtureId(1),
  objective: "Synthetic mission",
  expectedOutput: "Synthetic output",
  language: "en",
  state: "DRAFT",
  version: 1,
  constraintsVersion: 1,
  scope,
  constraints: { minGroupSize: 3, maxGroupSize: 3, minOverlapMinutes: 60, window, creatorParticipates: true, preferences: [] },
  requirements: [
    { id: fixtureId(101), missionId: fixtureId(100), version: 1, kind: "HUMAN", normalizedSkillId: "design", category: "product", priority: "REQUIRED", minimumCoverage: 1, minimumLevel: null, outcome: null },
    { id: fixtureId(102), missionId: fixtureId(100), version: 1, kind: "HUMAN", normalizedSkillId: "hardware", category: "engineering", priority: "REQUIRED", minimumCoverage: 1, minimumLevel: null, outcome: null },
  ],
  createdAt: fixtureTime,
  expiresAt: "2026-12-02T14:00:00Z",
});
const roles = ["Coordinator", "Designer", "Hardware engineer"];
const group = roles.map((role, i) => ({ participantId: fixtureId(i + 1), role }));
export const proposal = GroupProposalSchema.parse({
  id: fixtureId(150),
  missionId: mission.id,
  revision: 1,
  constraintsVersion: 1,
  scope,
  members: roles.map((role, i) => ({
    participantId: fixtureId(i + 1),
    profileVersion: 1,
    role,
    coveredRequirementIds: i === 0 ? [] : [fixtureId(100 + i)],
    terms: {
      participantId: fixtureId(i + 1),
      missionId: mission.id,
      role,
      responsibilities: [`Lead the ${role.toLowerCase()} work`, "Join the first planning session"],
      schedule: window,
      disclosedGroup: group,
      objective: mission.objective,
      expectedOutput: mission.expectedOutput,
    },
    termsHash: String(i + 1).repeat(64),
  })),
  commonWindow: window,
  score: { optionalCoverage: 0, mutualBenefit: 1, interestRelevance: 2, preservedCommitments: 0, teamSize: 3, stableParticipantIds: [fixtureId(1), fixtureId(2), fixtureId(3)] },
  search: { algorithmVersion: "bounded-lexicographic-1", taxonomyVersion: "taxonomy-1", visitedNodes: 20, maxNodes: 50000, maxWallTimeMs: 1500, elapsedMs: 1, complete: true, stoppedBecause: "EXHAUSTED" },
  rationale: "Covers design and hardware with a shared two-hour window (synthetic UI test data).",
  createdAt: fixtureTime,
});
