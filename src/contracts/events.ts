import { z } from "zod";
import {
  AgentRoleSchema,
  InvitationStatusSchema,
  MissionStateSchema,
} from "./domain";
import {
  IdListSchema,
  IdSchema,
  LabelSchema,
  ScopeSchema,
  SequenceSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";

// Public projections only: never emit raw tool arguments, tokens, transcripts or model reasoning.
const base = z.strictObject({
  schemaVersion: z.literal(1),
  id: IdSchema,
  missionId: IdSchema,
  scope: ScopeSchema,
  runId: IdSchema.nullable(),
  agent: AgentRoleSchema.nullable(),
  sequence: SequenceSchema.min(1),
  missionVersion: VersionSchema,
  proposalRevision: VersionSchema.nullable(),
  correlationId: IdSchema,
  causationId: IdSchema.nullable(),
  occurredAt: TimestampSchema,
  status: z.enum(["STARTED", "SUCCEEDED", "FAILED", "WAITING", "INFO"]),
  durationMs: z.number().int().nonnegative().nullable(),
});
const statePayload = z.strictObject({ state: MissionStateSchema });
const invitationPayload = z.strictObject({
  invitationId: IdSchema,
  participantId: IdSchema,
  invitationStatus: InvitationStatusSchema,
});
const executionPayload = z.strictObject({
  operation: LabelSchema,
  evidenceIds: IdListSchema,
});
const failurePayload = z.strictObject({
  code: z.enum([
    "TIMEOUT",
    "QUOTA_EXCEEDED",
    "INVALID_OUTPUT",
    "UNAVAILABLE",
    "RETRY_EXHAUSTED",
  ]),
  retryable: z.boolean(),
});
export const EventPayloadSchemas = {
  MISSION_CREATED: statePayload,
  EXTRACTION_STARTED: executionPayload,
  EXTRACTION_COMPLETED: executionPayload,
  REQUIREMENT_CREATED: z.strictObject({ requirementId: IdSchema }),
  REQUIREMENT_CONFIRMED: z.strictObject({ requirementId: IdSchema }),
  AGENT_STARTED: executionPayload,
  AGENT_COMPLETED: executionPayload,
  AGENT_FAILED: failurePayload,
  TOOL_STARTED: executionPayload,
  TOOL_COMPLETED: executionPayload,
  TOOL_FAILED: failurePayload,
  SCOUT_SEARCH_STARTED: executionPayload,
  CANDIDATES_FOUND: z.strictObject({ candidateIds: IdListSchema }),
  OPPORTUNITIES_FOUND: z.strictObject({ opportunityIds: IdListSchema }),
  PROPOSAL_CREATED: z.strictObject({ proposalId: IdSchema }),
  INVITATION_SENT: invitationPayload,
  INVITATION_ACCEPTED: invitationPayload,
  INVITATION_DECLINED: invitationPayload,
  INVITATION_COUNTERPROPOSED: invitationPayload,
  INVITATION_EXPIRED: invitationPayload,
  INVITATION_REVOKED: invitationPayload,
  REPLAN_STARTED: z.strictObject({ uncoveredRequirementIds: IdListSchema }),
  REPLAN_COMPLETED: z.strictObject({ proposalId: IdSchema }),
  PAUSED_FOR_HUMAN: z.strictObject({
    reason: z.enum([
      "MISSING_INPUT",
      "NO_SOLUTION",
      "SEARCH_LIMIT_REACHED",
      "TERMS_REVIEW_REQUIRED",
    ]),
    checkpoint: LabelSchema,
  }),
  MISSION_ACTIVATED: z.strictObject({
    membershipIds: IdListSchema,
    taskIds: IdListSchema,
  }),
  TASK_CREATED: z.strictObject({ taskId: IdSchema }),
  TASK_UPDATED: z.strictObject({ taskId: IdSchema }),
  PROVIDER_FAILED: failurePayload,
  MISSION_CANCELLED: statePayload,
  MISSION_EXPIRED: statePayload,
  MISSION_RETRIED: z.strictObject({ checkpoint: LabelSchema }),
  MISSION_RESUMED: z.strictObject({ checkpoint: LabelSchema }),
  PROFILE_CHANGED: z.strictObject({
    participantId: IdSchema,
    profileVersion: VersionSchema,
  }),
  REVIEW_REQUESTED: z.strictObject({ reviewRequestId: IdSchema }),
  REVIEW_UPDATED: z.strictObject({ reviewRequestId: IdSchema }),
  ACCESS_REVOKED: z.strictObject({
    reason: z.enum([
      "OPT_OUT",
      "DELETION",
      "SESSION_EXPIRED",
      "PERMISSION_CHANGED",
    ]),
  }),
} as const;
type EventName = keyof typeof EventPayloadSchemas;
// The mapped type retains the discriminated payload union for TypeScript consumers.
type EventVariant<K extends EventName> = z.ZodObject<
  typeof base.shape & {
    type: z.ZodLiteral<K>;
    payload: (typeof EventPayloadSchemas)[K];
  }
>;
const variants = (Object.keys(EventPayloadSchemas) as EventName[]).map((type) =>
  base.extend({ type: z.literal(type), payload: EventPayloadSchemas[type] }),
) as [EventVariant<EventName>, ...EventVariant<EventName>[]];
const eventSchema = z
  .discriminatedUnion("type", variants)
  .superRefine((event, ctx) => {
    if (
      /^(AGENT_|TOOL_|SCOUT_|EXTRACTION_)/.test(event.type) &&
      (!event.runId || !event.agent)
    )
      ctx.addIssue({
        code: "custom",
        message: "Execution events require a real run and agent",
        path: ["runId"],
      });
    if (
      event.type === "MISSION_CREATED" &&
      (event.runId !== null ||
        event.agent !== null ||
        !("state" in event.payload) ||
        event.payload.state !== "DRAFT")
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Mission creation has no fabricated agent run and starts DRAFT",
      });
    const invitationStates: Partial<
      Record<EventName, z.infer<typeof InvitationStatusSchema>>
    > = {
      INVITATION_SENT: "PENDING",
      INVITATION_ACCEPTED: "ACCEPTED",
      INVITATION_DECLINED: "DECLINED",
      INVITATION_COUNTERPROPOSED: "COUNTERPROPOSED",
      INVITATION_EXPIRED: "EXPIRED",
      INVITATION_REVOKED: "REVOKED",
    };
    const expected = invitationStates[event.type];
    if (
      expected &&
      "invitationStatus" in event.payload &&
      event.payload.invitationStatus !== expected
    )
      ctx.addIssue({
        code: "custom",
        message: "Invitation event/status mismatch",
      });
  });
export type AgentEvent = {
  [K in EventName]: z.infer<typeof base> & {
    type: K;
    payload: z.infer<(typeof EventPayloadSchemas)[K]>;
  };
}[EventName];

export const AgentEventSchema = eventSchema as z.ZodType<AgentEvent>;
