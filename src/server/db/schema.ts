import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Every scoped table stores scope as (scope_mode, showcase_id); LIVE rows use the nil UUID so unique keys stay scoped.
const scope = {
  scopeMode: text("scope_mode").notNull(),
  showcaseId: uuid("showcase_id").notNull(),
};
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    kind: text("kind").notNull(),
    principalId: uuid("principal_id").notNull(),
    ...scope,
    invitationId: uuid("invitation_id"),
    createdAt: ts("created_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
    revokedAt: ts("revoked_at"),
  },
  (t) => [uniqueIndex("sessions_token_hash").on(t.tokenHash)],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey(),
    ownerPrincipalId: uuid("owner_principal_id").notNull(),
    ...scope,
    profile: jsonb("profile").notNull(),
    profileVersion: integer("profile_version").notNull(),
    discoverable: boolean("discoverable").notNull(),
    publicGraph: boolean("public_graph").notNull(),
    participationOptIn: boolean("participation_opt_in").notNull(),
    createdAt: ts("created_at").notNull(),
    deletedAt: ts("deleted_at"),
    purgeBy: ts("purge_by"),
  },
  (t) => [
    index("participants_scope").on(t.scopeMode, t.showcaseId),
    index("participants_owner").on(t.ownerPrincipalId),
    uniqueIndex("participants_scoped_username").on(t.scopeMode,t.showcaseId,sql`lower(${t.profile}->>'username')`).where(sql`${t.deletedAt} IS NULL AND ${t.profile}->>'username' IS NOT NULL`),
  ],
);

export const capabilities = pgTable(
  "capabilities",
  {
    id: uuid("id").primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    skillId: text("skill_id").notNull(),
    level: integer("level"),
    doc: jsonb("doc").notNull(),
  },
  (t) => [index("capabilities_skill").on(t.skillId)],
);

export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey(),
    ...scope,
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => participants.id),
    ownerPrincipalId: uuid("owner_principal_id").notNull(),
    state: text("state").notNull(),
    version: integer("version").notNull(),
    constraintsVersion: integer("constraints_version").notNull(),
    eventSequence: integer("event_sequence").notNull().default(0),
    doc: jsonb("doc").notNull(),
    currentProposalRevision: integer("current_proposal_revision"),
    selectedProposalId: uuid("selected_proposal_id"),
    excludedParticipantIds: jsonb("excluded_participant_ids").notNull(),
    counterAvailability: jsonb("counter_availability").notNull(),
    createdAt: ts("created_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("missions_scope_state").on(t.scopeMode, t.showcaseId, t.state)],
);

export const requirements = pgTable(
  "mission_requirements",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    version: integer("version").notNull(),
    doc: jsonb("doc").notNull(),
  },
  (t) => [uniqueIndex("requirements_position").on(t.missionId, t.position)],
);

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey(),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  ...scope,
  agent: text("agent").notNull(),
  status: text("status").notNull(),
  startedAt: ts("started_at"),
  endedAt: ts("ended_at"),
  resultRef: uuid("result_ref"),
});

export const events = pgTable(
  "agent_events",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    ...scope,
    sequence: integer("sequence").notNull(),
    type: text("type").notNull(),
    doc: jsonb("doc").notNull(),
    occurredAt: ts("occurred_at").notNull(),
  },
  (t) => [uniqueIndex("events_mission_sequence").on(t.missionId, t.sequence)],
);

export const candidateMatches = pgTable(
  "candidate_matches",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
    constraintsVersion: integer("constraints_version").notNull(),
    doc: jsonb("doc").notNull(),
  },
  (t) => [index("candidates_mission").on(t.missionId)],
);

export const matchResults = pgTable(
  "match_results",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    doc: jsonb("doc").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("match_results_revision").on(t.missionId, t.revision)],
);

// Immutable proposal snapshots; members (with terms/hash) live inside doc.
export const proposals = pgTable(
  "group_proposals",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    ...scope,
    revision: integer("revision").notNull(),
    rank: integer("rank").notNull(),
    doc: jsonb("doc").notNull(),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [uniqueIndex("proposals_revision_rank").on(t.missionId, t.revision, t.rank)],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id),
    proposalRevision: integer("proposal_revision").notNull(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    ...scope,
    language: text("language").notNull(),
    status: text("status").notNull(),
    terms: jsonb("terms").notNull(),
    termsHash: text("terms_hash").notNull(),
    responseVersion: integer("response_version").notNull(),
    expiresAt: ts("expires_at").notNull(),
    lineage: jsonb("lineage"),
    linkEpoch: integer("link_epoch").notNull(),
    tokenHash: text("token_hash"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("invitations_proposal_participant").on(t.proposalId, t.participantId),
    uniqueIndex("invitations_token_hash").on(t.tokenHash),
    index("invitations_participant").on(t.participantId),
  ],
);

export const responses = pgTable("participant_responses", {
  id: uuid("id").primaryKey(),
  invitationId: uuid("invitation_id")
    .notNull()
    .references(() => invitations.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id").notNull(),
  doc: jsonb("doc").notNull(),
  createdAt: ts("created_at").notNull(),
});

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    ...scope,
    invitationId: uuid("invitation_id").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    timezone: text("timezone").notNull(),
    state: text("state").notNull(),
    expiresAt: ts("expires_at"),
  },
  (t) => [index("reservations_participant").on(t.participantId, t.state)],
);

export const memberships = pgTable(
  "mission_memberships",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull(),
    doc: jsonb("doc").notNull(),
  },
  (t) => [uniqueIndex("memberships_unique").on(t.missionId, t.participantId)],
);

export const tasks = pgTable("mission_tasks", {
  id: uuid("id").primaryKey(),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  ownerMembershipId: uuid("owner_membership_id")
    .notNull()
    .references(() => memberships.id),
  status: text("status").notNull(),
  version: integer("version").notNull(),
  doc: jsonb("doc").notNull(),
});

export const reviewRequests = pgTable("review_requests", {
  id: uuid("id").primaryKey(),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  version: integer("version").notNull(),
  doc: jsonb("doc").notNull(),
});

export const opportunities = pgTable("external_opportunities", {
  id: uuid("id").primaryKey(),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id, { onDelete: "cascade" }),
  ...scope,
  doc: jsonb("doc").notNull(),
});

export const audioArtifacts = pgTable("audio_artifacts", {
  id: uuid("id").primaryKey(),
  ownerPrincipalId: uuid("owner_principal_id").notNull(),
  ...scope,
  status: text("status").notNull(),
  mimeType: text("mime_type"),
  bytes: text("bytes_base64"),
  doc: jsonb("doc").notNull(),
  expiresAt: ts("expires_at").notNull(),
});

export const localizations = pgTable("localizations", {
  id: uuid("id").primaryKey(),
  sourceId: uuid("source_id").notNull(),
  ...scope,
  version: integer("version").notNull(),
  doc: jsonb("doc").notNull(),
});

export const commandReceipts = pgTable(
  "command_receipts",
  {
    id: uuid("id").primaryKey(),
    ...scope,
    principalId: uuid("principal_id").notNull(),
    operation: text("operation").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadDigest: text("payload_digest").notNull(),
    httpStatus: integer("http_status").notNull(),
    result: jsonb("result").notNull(),
    createdAt: ts("created_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("receipts_key").on(
      t.scopeMode,
      t.showcaseId,
      t.principalId,
      t.operation,
      t.idempotencyKey,
    ),
  ],
);

// Durable leased jobs: progress never depends on an open client or in-memory timer.
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey(),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    ...scope,
    agent: text("agent").notNull(),
    checkpoint: jsonb("checkpoint").notNull(),
    inputVersion: integer("input_version").notNull(),
    status: text("status").notNull(),
    leaseOwner: uuid("lease_owner"),
    leaseExpiresAt: ts("lease_expires_at"),
    fence: bigint("fence", { mode: "number" }).notNull(),
    attempts: integer("attempts").notNull(),
    nextAttemptAt: ts("next_attempt_at").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    lastError: text("last_error"),
    createdAt: ts("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("jobs_dedupe").on(t.dedupeKey),
    index("jobs_ready").on(t.status, t.nextAttemptAt),
  ],
);

export const outbox = pgTable("notification_outbox", {
  id: uuid("id").primaryKey(),
  missionId: uuid("mission_id").notNull(),
  invitationId: uuid("invitation_id"),
  kind: text("kind").notNull(),
  createdAt: ts("created_at").notNull(),
  deliveredAt: ts("delivered_at"),
});

export const accessEpochs = pgTable("access_epochs", {
  principalId: uuid("principal_id").primaryKey(),
  epoch: integer("epoch").notNull(),
});

// Per-version mission state history so read-only replay is exact, not inferred from event names.
export const missionHistory = pgTable(
  "mission_history",
  {
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    state: text("state").notNull(),
    currentProposalRevision: integer("current_proposal_revision"),
    selectedProposalId: uuid("selected_proposal_id"),
    recordedAt: ts("recorded_at").notNull(),
  },
  (t) => [uniqueIndex("mission_history_version").on(t.missionId, t.version)],
);

// Restricted opaque audit only; never exposed through DTOs, max 30 days.
export const privacyAudit = pgTable("privacy_audit", {
  id: uuid("id").primaryKey(),
  ...scope,
  subjectRef: uuid("subject_ref").notNull(),
  sourceRef: uuid("source_ref").notNull(),
  termsHash: text("terms_hash"),
  action: text("action").notNull(),
  occurredAt: ts("occurred_at").notNull(),
  expiresAt: ts("expires_at").notNull(),
}, (t) => [index("privacy_audit_expiry").on(t.expiresAt), uniqueIndex("privacy_audit_source_action").on(t.scopeMode,t.showcaseId,t.sourceRef,t.action)]);
