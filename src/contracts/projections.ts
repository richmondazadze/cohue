import { z } from "zod";
import {
  GroupProposalSchema,
  InvitationSchema,
  MissionMembershipSchema,
  MissionSchema,
  MissionTaskSchema,
  ReviewRequestSchema,
  ExternalOpportunitySchema,
} from "./domain";
import { LocalizedTextSchema } from "./media";
import { AgentEventSchema } from "./events";
import {
  IdListSchema,
  IdSchema,
  LabelSchema,
  ScopeSchema,
  SequenceSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";
export const GraphNodeSchema = z.strictObject({
  id: IdSchema,
  kind: z.enum(["participant", "mission", "requirement", "opportunity"]),
  label: LabelSchema,
  status: z.enum([
    "SUGGESTED",
    "PENDING",
    "ACCEPTED",
    "DECLINED",
    "EXCLUDED",
    "ACTIVATED",
    "PUBLIC_UNVERIFIED",
    "UNCOVERED",
  ]),
  evidenceRefs: IdListSchema,
});
export const GraphEdgeSchema = z.strictObject({
  id: IdSchema,
  source: IdSchema,
  target: IdSchema,
  kind: z.enum([
    "COVERAGE",
    "CANDIDATE",
    "INVITATION",
    "MEMBERSHIP",
    "EVIDENCE",
    "RECIPROCAL",
  ]),
  status: z.enum([
    "SUGGESTED",
    "PENDING",
    "ACCEPTED",
    "DECLINED",
    "EXCLUDED",
    "ACTIVATED",
    "PUBLIC_UNVERIFIED",
  ]),
  proposalRevision: VersionSchema.nullable(),
  eventId: IdSchema.nullable(),
});
export const GraphSchema = z
  .strictObject({
    snapshotSequence: SequenceSchema,
    nodes: z.array(GraphNodeSchema).max(500),
    edges: z.array(GraphEdgeSchema).max(2000),
  })
  .superRefine((v, ctx) => {
    const ids = new Set(v.nodes.map((n) => n.id));
    if (ids.size !== v.nodes.length)
      ctx.addIssue({ code: "custom", message: "Duplicate node IDs" });
    if (new Set(v.edges.map((e) => e.id)).size !== v.edges.length)
      ctx.addIssue({ code: "custom", message: "Duplicate edge IDs" });
    if (v.edges.some((e) => !ids.has(e.source) || !ids.has(e.target)))
      ctx.addIssue({ code: "custom", message: "Dangling graph edge" });
    if (
      v.nodes.some(
        (n) => n.kind === "opportunity" && n.status !== "PUBLIC_UNVERIFIED",
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "External evidence is never an approved participant",
      });
  });
export const MissionSnapshotSchema = z
  .strictObject({
    scope: ScopeSchema,
    snapshotSequence: SequenceSchema,
    mission: MissionSchema,
    graph: GraphSchema,
    proposals: z.array(GroupProposalSchema).max(5),
    opportunities: z.array(ExternalOpportunitySchema).max(30),
    approvals: z.strictObject({
      required: z.number().int().nonnegative(),
      accepted: z.number().int().nonnegative(),
    }),
    receivedAt: TimestampSchema,
  })
  .refine(
    (v) =>
      v.snapshotSequence === v.graph.snapshotSequence &&
      JSON.stringify(v.scope) === JSON.stringify(v.mission.scope),
    "Snapshot scope/cursor mismatch",
  );
export const EventPageSchema = z
  .strictObject({
    scope: ScopeSchema,
    events: z.array(AgentEventSchema).max(100),
    nextSequence: SequenceSchema,
    hasMore: z.boolean(),
    accessEpoch: VersionSchema,
  })
  .superRefine((v, ctx) => {
    if (
      v.events.some(
        (e, i) =>
          JSON.stringify(e.scope) !== JSON.stringify(v.scope) ||
          (i > 0 && e.sequence <= v.events[i - 1].sequence),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Event page must be scoped and strictly increasing",
      });
    if (
      v.events.length &&
      v.nextSequence !== v.events[v.events.length - 1].sequence
    )
      ctx.addIssue({
        code: "custom",
        message: "Cursor must equal final delivered sequence",
      });
  });
export const NetworkPageSchema = z.strictObject({
  scope: ScopeSchema,
  graph: GraphSchema,
  nextCursor: z.string().max(512).nullable(),
  accessEpoch: VersionSchema,
});
export const InboxPageSchema = z.strictObject({
  scope: ScopeSchema,
  invitations: z.array(InvitationSchema).max(100),
  nextCursor: z.string().max(512).nullable(),
});
export const RoomSchema = z
  .strictObject({
    mission: MissionSchema,
    memberships: z.array(MissionMembershipSchema).min(1).max(8),
    tasks: z.array(MissionTaskSchema).max(100),
    opportunities: z.array(ExternalOpportunitySchema).max(30),
    briefs: z.array(LocalizedTextSchema).max(20),
    reviews: z.array(ReviewRequestSchema).max(100),
  })
  .superRefine((v, ctx) => {
    if (v.mission.state !== "ACTIVATED")
      ctx.addIssue({
        code: "custom",
        message: "Room requires activated mission",
      });
    const ids = new Set(v.memberships.map((m) => m.id));
    if (
      ids.size !== v.memberships.length ||
      new Set(v.memberships.map((m) => m.participantId)).size !==
        v.memberships.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate room membership" });
    if (
      v.memberships.some((m) => m.missionId !== v.mission.id) ||
      v.tasks.some(
        (t) => t.missionId !== v.mission.id || !ids.has(t.ownerMembershipId),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Room membership/task ownership mismatch",
      });
  });
export type MissionSnapshot = z.infer<typeof MissionSnapshotSchema>;
