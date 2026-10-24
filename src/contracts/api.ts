import { z } from "zod";
import {
  CapabilityInputSchema,
  GroupProposalSchema,
  InvitationSchema,
  MatchResultSchema,
  MissionConstraintsSchema,
  MissionSchema,
  MissionStateSchema,
  MissionTaskSchema,
  ParticipantResponseSchema,
  ParticipantSchema,
  ProfileInputSchema,
  RequirementInputSchema,
  ResponseCommandSchema,
  ReviewRequestSchema,
} from "./domain";
import { TaxonomySchema } from "./taxonomy";
import { DirectorOutputSchema } from "./agents";
import {
  AudioArtifactSchema,
  LocalizedTextSchema,
  TranscriptionMetadataSchema,
  TranscriptionResultSchema,
} from "./media";
import {
  EventPageSchema,
  InboxPageSchema,
  MissionSnapshotSchema,
  NetworkPageSchema,
  RoomSchema,
} from "./projections";
import {
  HashSchema,
  IdSchema,
  LabelSchema,
  LanguageSchema,
  PageQuerySchema,
  ScopeSchema,
  SequenceSchema,
  TextSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";

export const ErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "STALE_VERSION",
  "IDEMPOTENCY_CONFLICT",
  "INVITATION_EXPIRED",
  "INVITATION_REVOKED",
  "TERMINAL_MISSION",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "CAPACITY_CONFLICT",
  "SCOPE_MISMATCH",
  "INTERNAL_ERROR",
]);
export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: ErrorCodeSchema,
    message: TextSchema,
    retryable: z.boolean(),
    fieldErrors: z
      .record(z.string().max(100), z.array(LabelSchema).max(10))
      .optional(),
  }),
  correlationId: IdSchema,
});
export const successSchema = <T extends z.ZodType>(data: T) =>
  z.strictObject({ data, correlationId: IdSchema });
export const CommandHeadersSchema = z.strictObject({
  "idempotency-key": z
    .string()
    .min(16)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});
export const VersionCommandSchema = z.strictObject({
  expectedVersion: VersionSchema,
});
export const CreateMissionSchema = z.strictObject({
  objective: TextSchema,
  expectedOutput: TextSchema,
  language: LanguageSchema,
  constraints: MissionConstraintsSchema,
  requirements: z.array(RequirementInputSchema).max(30),
});
export const UpdateMissionSchema = CreateMissionSchema.extend({
  expectedVersion: VersionSchema,
});
export const ParticipantPatchSchema = z.strictObject({
  expectedVersion: VersionSchema,
  profile: ProfileInputSchema,
});
export const EventQuerySchema = z.strictObject({
  after: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .default(0),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  format: z.enum(["json", "sse"]).default("json"),
});
export const PreviewSchema = z.strictObject({
  invitationId: IdSchema,
  language: LanguageSchema,
  expiresAt: TimestampSchema,
  accessNotice: z.literal("BEARER_LINK_ONE_INVITATION"),
  available: z.boolean(),
});
export const SessionSchema = z.strictObject({
  principalId: IdSchema,
  kind: z.enum(["GUEST", "INVITATION", "SHOWCASE_OPERATOR"]),
  scope: ScopeSchema,
  invitationId: IdSchema.nullable(),
  expiresAt: TimestampSchema,
});
export const RunAcceptedSchema = z.strictObject({
  missionId: IdSchema,
  runId: IdSchema,
  state: MissionStateSchema,
  version: VersionSchema,
});
export const EffectSchema = z.strictObject({
  missionId: IdSchema,
  version: VersionSchema,
  state: MissionStateSchema,
});
export const ResponseResultSchema = z.strictObject({
  response: ParticipantResponseSchema,
  invitation: InvitationSchema,
  missionState: MissionStateSchema,
  missionVersion: VersionSchema,
});
export const RecoveryCommandSchema = z.strictObject({
  expectedVersion: VersionSchema,
  checkpointId: IdSchema,
});
export const DeleteResultSchema = z.strictObject({
  deletionId: IdSchema,
  status: z.literal("ACCEPTED"),
  revokedAt: TimestampSchema,
  purgeBy: TimestampSchema,
});
export const SynthesisCommandSchema = z.strictObject({
  sourceId: IdSchema,
  sourceKind: z.enum(["INVITATION", "BRIEF"]),
  sourceVersion: VersionSchema,
  canonicalTextHash: HashSchema,
  language: LanguageSchema,
});
export const ProviderHealthSchema = z.strictObject({
  database: z.enum(["UNCONFIGURED", "READY", "DEGRADED"]),
  dispatcher: z.enum(["UNCONFIGURED", "UNVERIFIED", "VERIFIED", "DEGRADED"]),
  gemini: z.enum(["UNCONFIGURED", "READY", "DEGRADED"]),
  elevenlabs: z.enum(["UNCONFIGURED", "READY", "DEGRADED"]),
  serpapi: z.enum(["UNCONFIGURED", "READY", "DEGRADED"]),
});
const empty = z.strictObject({});
export const BearerTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,256}$/);
// Share-link disclosure for one invitation; the token appears only in this response body (see CONTRACT_RESOLUTIONS).
export const InvitationLinkSchema = z.strictObject({
  invitationId: IdSchema,
  token: BearerTokenSchema,
  linkEpoch: VersionSchema,
  expiresAt: TimestampSchema,
});
const pathSchema = (path: string) =>
  z.strictObject(
    Object.fromEntries(
      [...path.matchAll(/:([A-Za-z]+)/g)].map((m) => [
        m[1],
        m[1] === "token" ? BearerTokenSchema : IdSchema,
      ]),
    ),
  );
const route = <
  const P extends string,
  I extends z.ZodType,
  O extends z.ZodType,
>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: P,
  auth: "PUBLIC" | "SESSION" | "OWNER" | "INVITATION" | "MEMBER" | "OPERATOR",
  input: I,
  output: O,
  status: number,
  idempotentCommand = false,
) => ({
  method,
  path,
  auth,
  params: pathSchema(path),
  input,
  response: successSchema(output),
  status,
  idempotentCommand,
  error: ApiErrorSchema,
});

// input is JSON body for mutations and decoded query for GET; path UUIDs use IdSchema.
// Every SESSION/OWNER/INVITATION/MEMBER operation derives scope and principal from the server session.
export const ProfileExtractionSchema = z.strictObject({
  profile: ProfileInputSchema.omit({
    capabilities: true,
    visibility: true,
    participationOptIn: true,
  }).partial(),
  capabilities: z
    .array(CapabilityInputSchema.omit({ confirmedByUser: true }))
    .max(30),
  unknowns: z.array(TextSchema).max(20),
  requiresConfirmation: z.literal(true),
});
export const MissionExtractionSchema = z.strictObject({
  objective: TextSchema,
  expectedOutput: TextSchema.nullable(),
  requirements: z.array(RequirementInputSchema).max(30),
  constraintsDraft: z.strictObject(MissionConstraintsSchema.shape).partial(),
  unknowns: z.array(TextSchema).max(20),
  requiresConfirmation: z.literal(true),
});
export const apiContracts = {
  taxonomy: route("GET", "/api/taxonomy", "PUBLIC", empty, TaxonomySchema, 200),
  parseProfile: route(
    "POST",
    "/api/participants/parse",
    "SESSION",
    z.strictObject({ text: TextSchema, language: LanguageSchema }),
    ProfileExtractionSchema,
    200,
    true,
  ),
  extractMission: route(
    "POST",
    "/api/missions/parse",
    "SESSION",
    z.strictObject({ text: TextSchema, language: LanguageSchema }),
    MissionExtractionSchema,
    200,
    true,
  ),
  approveLocalization: route(
    "POST",
    "/api/localizations/:id/approve",
    "SESSION",
    z.strictObject({
      expectedVersion: VersionSchema,
      canonicalTextHash: HashSchema,
      text: TextSchema,
    }),
    LocalizedTextSchema,
    200,
    true,
  ),
  createSession: route(
    "POST",
    "/api/sessions",
    "PUBLIC",
    ScopeSchema,
    SessionSchema,
    201,
    true,
  ),
  getSession: route(
    "GET",
    "/api/session",
    "SESSION",
    empty,
    SessionSchema,
    200,
  ),
  createParticipant: route(
    "POST",
    "/api/participants",
    "SESSION",
    ProfileInputSchema,
    ParticipantSchema,
    201,
    true,
  ),
  getParticipant: route(
    "GET",
    "/api/participants/:id",
    "OWNER",
    empty,
    ParticipantSchema,
    200,
  ),
  updateParticipant: route(
    "PATCH",
    "/api/participants/:id",
    "OWNER",
    ParticipantPatchSchema,
    ParticipantSchema,
    200,
    true,
  ),
  deleteParticipant: route(
    "DELETE",
    "/api/participants/:id",
    "OWNER",
    VersionCommandSchema,
    DeleteResultSchema,
    202,
    true,
  ),
  network: route(
    "GET",
    "/api/network",
    "PUBLIC",
    PageQuerySchema,
    NetworkPageSchema,
    200,
  ),
  inbox: route(
    "GET",
    "/api/participants/:id/invitations",
    "OWNER",
    PageQuerySchema,
    InboxPageSchema,
    200,
  ),
  createMission: route(
    "POST",
    "/api/missions",
    "SESSION",
    CreateMissionSchema,
    MissionSchema,
    201,
    true,
  ),
  updateMission: route(
    "PATCH",
    "/api/missions/:id",
    "OWNER",
    UpdateMissionSchema,
    MissionSchema,
    200,
    true,
  ),
  parseMission: route(
    "POST",
    "/api/missions/:id/parse",
    "OWNER",
    z.strictObject({
      expectedVersion: VersionSchema,
      text: TextSchema,
      language: LanguageSchema,
    }),
    DirectorOutputSchema,
    200,
    true,
  ),
  startMission: route(
    "POST",
    "/api/missions/:id/start",
    "OWNER",
    VersionCommandSchema,
    RunAcceptedSchema,
    202,
    true,
  ),
  snapshot: route(
    "GET",
    "/api/missions/:id/snapshot",
    "OWNER",
    empty,
    MissionSnapshotSchema,
    200,
  ),
  events: route(
    "GET",
    "/api/missions/:id/events",
    "OWNER",
    EventQuerySchema,
    EventPageSchema,
    200,
  ),
  proposals: route(
    "GET",
    "/api/missions/:id/proposals",
    "OWNER",
    empty,
    MatchResultSchema,
    200,
  ),
  selectProposal: route(
    "POST",
    "/api/missions/:id/proposals/:proposalId/select",
    "OWNER",
    z.strictObject({
      expectedVersion: VersionSchema,
      proposalRevision: VersionSchema,
    }),
    z.strictObject({
      mission: MissionSchema,
      proposal: GroupProposalSchema,
      invitations: z.array(InvitationSchema).max(8),
    }),
    201,
    true,
  ),
  issueInvitationLink: route(
    "POST",
    "/api/invitations/:id/link",
    "OWNER",
    z.strictObject({ rotate: z.boolean() }),
    InvitationLinkSchema,
    200,
    true,
  ),
  previewInvitation: route(
    "GET",
    "/api/invitations/:token",
    "PUBLIC",
    empty,
    PreviewSchema,
    200,
  ),
  redeemInvitation: route(
    "POST",
    "/api/invitations/:token/redeem",
    "PUBLIC",
    empty,
    z.strictObject({ session: SessionSchema, invitation: InvitationSchema }),
    200,
    true,
  ),
  getInvitation: route(
    "GET",
    "/api/invitations/:id/detail",
    "INVITATION",
    empty,
    z.strictObject({
      invitation: InvitationSchema,
      localized: z.array(LocalizedTextSchema).max(20),
    }),
    200,
  ),
  respondInvitation: route(
    "POST",
    "/api/invitations/:id/respond",
    "INVITATION",
    ResponseCommandSchema,
    ResponseResultSchema,
    200,
    true,
  ),
  activateMission: route(
    "POST",
    "/api/missions/:id/activate",
    "OWNER",
    z.strictObject({
      expectedVersion: VersionSchema,
      proposalRevision: VersionSchema,
    }),
    RoomSchema,
    200,
    true,
  ),
  room: route(
    "GET",
    "/api/missions/:id/room",
    "MEMBER",
    empty,
    RoomSchema,
    200,
  ),
  updateTask: route(
    "PATCH",
    "/api/missions/:id/tasks/:taskId",
    "MEMBER",
    z.strictObject({
      expectedVersion: VersionSchema,
      status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
    }),
    MissionTaskSchema,
    200,
    true,
  ),
  requestReview: route(
    "POST",
    "/api/missions/:id/reviews",
    "MEMBER",
    z.strictObject({
      expectedVersion: VersionSchema,
      kind: z.enum(["SCHEDULE_CHANGE", "WITHDRAWAL"]),
      reason: TextSchema,
      proposedAvailability: ProfileInputSchema.shape.availability,
    }),
    ReviewRequestSchema,
    201,
    true,
  ),
  updateReview: route(
    "PATCH",
    "/api/missions/:id/reviews/:reviewId",
    "OWNER",
    z.strictObject({
      expectedVersion: VersionSchema,
      status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
      resolution: TextSchema,
    }),
    ReviewRequestSchema,
    200,
    true,
  ),
  cancelMission: route(
    "POST",
    "/api/missions/:id/cancel",
    "OWNER",
    z.strictObject({ expectedVersion: VersionSchema, reason: TextSchema }),
    EffectSchema,
    200,
    true,
  ),
  retryMission: route(
    "POST",
    "/api/missions/:id/retry",
    "OWNER",
    RecoveryCommandSchema,
    RunAcceptedSchema,
    202,
    true,
  ),
  resumeMission: route(
    "POST",
    "/api/missions/:id/resume",
    "OWNER",
    RecoveryCommandSchema,
    RunAcceptedSchema,
    202,
    true,
  ),
  transcribe: route(
    "POST",
    "/api/voice/transcribe",
    "SESSION",
    TranscriptionMetadataSchema,
    TranscriptionResultSchema,
    200,
    true,
  ),
  synthesize: route(
    "POST",
    "/api/voice/synthesize",
    "SESSION",
    SynthesisCommandSchema,
    AudioArtifactSchema,
    202,
    true,
  ),
  media: route(
    "GET",
    "/api/media/:id",
    "SESSION",
    empty,
    AudioArtifactSchema,
    200,
  ),
  replay: route(
    "GET",
    "/api/missions/:id/replay",
    "OWNER",
    z.strictObject({ atSequence: SequenceSchema }),
    MissionSnapshotSchema,
    200,
  ),
  health: route(
    "GET",
    "/api/providers/health",
    "OPERATOR",
    empty,
    ProviderHealthSchema,
    200,
  ),
} as const;
export type ApiOperation = keyof typeof apiContracts;
export type ApiInput<K extends ApiOperation> = z.input<
  (typeof apiContracts)[K]["input"]
>;
export type ApiOutput<K extends ApiOperation> = z.output<
  (typeof apiContracts)[K]["response"]
>;

type ExtractParams<P extends string> =
  P extends `${string}:${infer Key}/${infer Rest}`
    ? Key | ExtractParams<Rest>
    : P extends `${string}:${infer Key}`
      ? Key
      : never;
export type ApiParams<K extends ApiOperation> = Record<
  ExtractParams<(typeof apiContracts)[K]["path"]>,
  string
>;
