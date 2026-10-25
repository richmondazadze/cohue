import { z } from "zod";
import {
  HashSchema,
  IdListSchema,
  IdSchema,
  IntervalSchema,
  LabelSchema,
  LanguageSchema,
  PublicUrlSchema,
  ScopeSchema,
  SequenceSchema,
  TextSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";

export const AgentRoleSchema = z.enum([
  "DIRECTOR",
  "SCOUT",
  "STRATEGIST",
  "COORDINATOR",
]);
export const MissionStateSchema = z.enum([
  "DRAFT",
  "PLANNING",
  "DISCOVERING",
  "PROPOSED",
  "AWAITING_APPROVAL",
  "REPLANNING",
  "REPROPOSED",
  "ACTIVATED",
  "PAUSED_FOR_HUMAN",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);
export const InvitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "COUNTERPROPOSED",
  "EXPIRED",
  "REVOKED",
]);
export const SkillIdSchema = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/);
export const CapabilityInputSchema = z.strictObject({
  normalizedSkillId: SkillIdSchema,
  category: LabelSchema,
  level: z.number().int().min(1).max(5).nullable(),
  evidence: TextSchema.nullable(),
  confirmedByUser: z.literal(true),
  normalizationVersion: z.literal("taxonomy-1"),
});
export const CapabilitySchema = CapabilityInputSchema.extend({
  id: IdSchema,
  participantId: IdSchema,
});
export const UsernameSchema = z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{2,23}$/, "Use 3–24 letters, numbers or underscores, starting with a letter.");
export const AvatarIdSchema = z.enum(["3d_1", "3d_2", "3d_3", "3d_4", "3d_5"]);
export const ProfileInputSchema = z.strictObject({
  username: UsernameSchema.nullable().default(null),
  avatarId: AvatarIdSchema.nullable().default(null),
  displayName: LabelSchema,
  language: LanguageSchema,
  needs: z.array(SkillIdSchema).max(20),
  interests: z.array(SkillIdSchema).max(20),
  availability: z.array(IntervalSchema).max(30),
  capabilities: z.array(CapabilityInputSchema).max(30),
  visibility: z.strictObject({
    publicGraph: z.boolean(),
    discoverable: z.boolean(),
  }),
  participationOptIn: z.boolean(),
});
export const ParticipantSchema = ProfileInputSchema.extend({
  id: IdSchema,
  profileVersion: VersionSchema,
  scope: ScopeSchema,
  createdAt: TimestampSchema,
});
export const RequirementInputSchema = z.strictObject({
  kind: z.enum(["HUMAN", "RESOURCE"]),
  normalizedSkillId: SkillIdSchema,
  category: LabelSchema,
  priority: z.enum(["REQUIRED", "OPTIONAL"]),
  minimumCoverage: z.number().int().min(1).max(8),
  minimumLevel: z.number().int().min(1).max(5).nullable(),
  outcome: TextSchema.nullable(),
});
export const RequirementSchema = RequirementInputSchema.extend({
  id: IdSchema,
  missionId: IdSchema,
  version: VersionSchema,
});
export const MissionConstraintsSchema = z
  .strictObject({
    minGroupSize: z.number().int().min(1).max(8),
    maxGroupSize: z.number().int().min(1).max(8),
    minOverlapMinutes: z.number().int().min(1).max(1440),
    window: IntervalSchema,
    creatorParticipates: z.boolean(),
    preferences: z.array(SkillIdSchema).max(20),
  })
  .superRefine((v, ctx) => {
    if (v.minGroupSize > v.maxGroupSize)
      ctx.addIssue({
        code: "custom",
        message: "Minimum group size exceeds maximum",
        path: ["minGroupSize"],
      });
    if (
      Date.parse(v.window.end) - Date.parse(v.window.start) <
      v.minOverlapMinutes * 60000
    )
      ctx.addIssue({
        code: "custom",
        message: "Overlap exceeds mission window",
        path: ["minOverlapMinutes"],
      });
  });
export const MissionSchema = z
  .strictObject({
    id: IdSchema,
    creatorId: IdSchema,
    objective: TextSchema,
    expectedOutput: TextSchema,
    language: LanguageSchema,
    state: MissionStateSchema,
    version: VersionSchema,
    constraintsVersion: VersionSchema,
    scope: ScopeSchema,
    constraints: MissionConstraintsSchema,
    requirements: z.array(RequirementSchema).max(30),
    createdAt: TimestampSchema,
    expiresAt: TimestampSchema,
  })
  .refine(
    (v) =>
      v.requirements.every((r) => r.missionId === v.id) &&
      Date.parse(v.expiresAt) > Date.parse(v.createdAt),
    "Mission requirement scope or expiry mismatch",
  );
export const ScoreComponentsSchema = z.strictObject({
  optionalCoverage: z.number().int().nonnegative(),
  mutualBenefit: z.number().int().nonnegative(),
  interestRelevance: z.number().int().nonnegative(),
  preservedCommitments: z.number().int().nonnegative(),
  teamSize: z.number().int().min(1).max(8),
  stableParticipantIds: IdListSchema,
});
export const SearchStatsSchema = z
  .strictObject({
    algorithmVersion: z.literal("bounded-lexicographic-1"),
    taxonomyVersion: z.literal("taxonomy-1"),
    visitedNodes: SequenceSchema,
    maxNodes: z.literal(50000),
    maxWallTimeMs: z.literal(1500),
    elapsedMs: z.number().nonnegative(),
    complete: z.boolean(),
    stoppedBecause: z.enum(["EXHAUSTED", "NODE_LIMIT", "TIME_LIMIT"]),
  })
  .refine(
    (v) => v.complete === (v.stoppedBecause === "EXHAUSTED"),
    "Completion must match stop reason",
  );
export const CandidateMatchSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  participantId: IdSchema,
  profileVersion: VersionSchema,
  coveredRequirementIds: IdListSchema,
  score: ScoreComponentsSchema,
  reason: TextSchema,
  evidenceRefs: IdListSchema,
  exclusionReasons: z.array(LabelSchema).max(20),
});
export const CommitmentTermsSchema = z
  .strictObject({
    participantId: IdSchema,
    missionId: IdSchema,
    role: LabelSchema,
    responsibilities: z.array(TextSchema).min(1).max(20),
    schedule: IntervalSchema,
    disclosedGroup: z
      .array(z.strictObject({ participantId: IdSchema, role: LabelSchema }))
      .min(1)
      .max(8),
    objective: TextSchema,
    expectedOutput: TextSchema,
  })
  .refine(
    (v) =>
      new Set(v.disclosedGroup.map((m) => m.participantId)).size ===
        v.disclosedGroup.length &&
      v.disclosedGroup.some(
        (m) => m.participantId === v.participantId && m.role === v.role,
      ),
    "Group terms require distinct members and the current participant/role",
  );
export const ProposalMemberSchema = z
  .strictObject({
    participantId: IdSchema,
    profileVersion: VersionSchema,
    role: LabelSchema,
    coveredRequirementIds: IdListSchema,
    terms: CommitmentTermsSchema,
    termsHash: HashSchema,
  })
  .refine(
    (v) => v.participantId === v.terms.participantId && v.role === v.terms.role,
    "Member and terms must agree",
  );
export const GroupProposalSchema = z
  .strictObject({
    id: IdSchema,
    missionId: IdSchema,
    revision: VersionSchema,
    constraintsVersion: VersionSchema,
    scope: ScopeSchema,
    members: z.array(ProposalMemberSchema).min(1).max(8),
    commonWindow: IntervalSchema,
    score: ScoreComponentsSchema,
    search: SearchStatsSchema,
    rationale: TextSchema,
    createdAt: TimestampSchema,
  })
  .superRefine((v, ctx) => {
    if (
      new Set(v.members.map((m) => m.participantId)).size !== v.members.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Duplicate member",
        path: ["members"],
      });
    if (v.score.teamSize !== v.members.length)
      ctx.addIssue({
        code: "custom",
        message: "Score team size disagrees with members",
        path: ["score"],
      });
    if (v.members.some((m) => m.terms.missionId !== v.missionId))
      ctx.addIssue({
        code: "custom",
        message: "Terms belong to another mission",
        path: ["members"],
      });
  });
export const MatchResultSchema = z
  .strictObject({
    feasibility: z.enum(["FEASIBLE", "NO_SOLUTION", "SEARCH_LIMIT_REACHED"]),
    proposals: z.array(GroupProposalSchema).max(5),
    uncoveredRequirementIds: IdListSchema,
    search: SearchStatsSchema,
  })
  .superRefine((v, ctx) => {
    if ((v.feasibility === "FEASIBLE") !== v.proposals.length > 0)
      ctx.addIssue({
        code: "custom",
        message:
          "Feasible result requires proposals; other results forbid them",
        path: ["proposals"],
      });
    if (v.feasibility === "NO_SOLUTION" && !v.search.complete)
      ctx.addIssue({
        code: "custom",
        message: "No-solution requires exhausted search",
        path: ["search"],
      });
    if (v.feasibility === "SEARCH_LIMIT_REACHED" && v.search.complete)
      ctx.addIssue({
        code: "custom",
        message: "Search-limit cannot report complete",
        path: ["search"],
      });
  });
export const ConsentLineageSchema = z
  .strictObject({
    sourceInvitationId: IdSchema,
    sourceResponseId: IdSchema,
    sourceProposalRevision: VersionSchema,
    carriedToProposalRevision: VersionSchema,
    termsHash: HashSchema,
    revalidatedAt: TimestampSchema,
  })
  .refine(
    (v) => v.carriedToProposalRevision > v.sourceProposalRevision,
    "Carry-forward must target a newer revision",
  );
export const InvitationSchema = z
  .strictObject({
    id: IdSchema,
    missionId: IdSchema,
    proposalId: IdSchema,
    proposalRevision: VersionSchema,
    participantId: IdSchema,
    scope: ScopeSchema,
    language: LanguageSchema,
    status: InvitationStatusSchema,
    terms: CommitmentTermsSchema,
    termsHash: HashSchema,
    responseVersion: VersionSchema,
    expiresAt: TimestampSchema,
    lineage: ConsentLineageSchema.nullable(),
  })
  .refine(
    (v) =>
      v.participantId === v.terms.participantId &&
      v.missionId === v.terms.missionId &&
      (!v.lineage || v.lineage.termsHash === v.termsHash),
    "Invitation terms/lineage mismatch",
  );
export const ResponseActionSchema = z.enum(["ACCEPT", "DECLINE", "COUNTER"]);
export const ResponseCommandSchema = z
  .strictObject({
    action: ResponseActionSchema,
    termsHash: HashSchema,
    responseVersion: VersionSchema,
    reason: TextSchema.optional(),
    availabilityProposal: z.array(IntervalSchema).min(1).max(10).optional(),
  })
  .refine(
    (v) =>
      v.action === "COUNTER"
        ? v.availabilityProposal !== undefined
        : v.availabilityProposal === undefined,
    "Only counterproposals require availability",
  );
export const ParticipantResponseSchema = z.strictObject({
  id: IdSchema,
  invitationId: IdSchema,
  participantId: IdSchema,
  action: ResponseActionSchema,
  termsHash: HashSchema,
  responseVersion: VersionSchema,
  reason: TextSchema.nullable(),
  availabilityProposal: z.array(IntervalSchema).max(10).nullable(),
  createdAt: TimestampSchema,
});
export const MissionMembershipSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  participantId: IdSchema,
  approvedRole: LabelSchema,
  termsHash: HashSchema,
  invitationId: IdSchema,
  responseId: IdSchema,
  joinedAt: TimestampSchema,
});
export const MissionTaskSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  ownerMembershipId: IdSchema,
  description: TextSchema,
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  dueAt: TimestampSchema.nullable(),
  version: VersionSchema,
});
export const ExternalOpportunitySchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  scope: ScopeSchema,
  sourceURL: PublicUrlSchema,
  title: LabelSchema,
  retrievedAt: TimestampSchema,
  providerSearchId: z.string().min(1).max(200),
  relevanceEvidence: TextSchema,
  verificationStatus: z.literal("PUBLIC_UNVERIFIED"),
});
export const AgentRunSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  scope: ScopeSchema,
  agent: AgentRoleSchema,
  status: z.enum(["QUEUED", "RUNNING", "WAITING", "SUCCEEDED", "FAILED"]),
  startedAt: TimestampSchema.nullable(),
  endedAt: TimestampSchema.nullable(),
  resultRef: IdSchema.nullable(),
});
export const ReservationSchema = z.strictObject({
  id: IdSchema,
  participantId: IdSchema,
  missionId: IdSchema,
  scope: ScopeSchema,
  interval: IntervalSchema,
  state: z.enum(["ACCEPTED_HOLD", "ACTIVATED", "RELEASED"]),
  invitationId: IdSchema,
  expiresAt: TimestampSchema.nullable(),
});
export const ReviewRequestSchema = z.strictObject({
  id: IdSchema,
  missionId: IdSchema,
  requestedByParticipantId: IdSchema,
  kind: z.enum(["SCHEDULE_CHANGE", "WITHDRAWAL"]),
  reason: TextSchema,
  proposedAvailability: z.array(IntervalSchema).max(10),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
  version: VersionSchema,
});
export type Participant = z.infer<typeof ParticipantSchema>;
export type Mission = z.infer<typeof MissionSchema>;
export type MissionState = z.infer<typeof MissionStateSchema>;
export type GroupProposal = z.infer<typeof GroupProposalSchema>;
export type Invitation = z.infer<typeof InvitationSchema>;
export type CommitmentTerms = z.infer<typeof CommitmentTermsSchema>;
export type MatchResult = z.infer<typeof MatchResultSchema>;
