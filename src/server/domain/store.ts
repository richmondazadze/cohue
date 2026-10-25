import "server-only";
import { randomUUID } from "node:crypto";
import {
  AgentEventSchema,
  InvitationSchema,
  MissionSchema,
  ParticipantSchema,
  type AgentEvent,
  type EventPayloadSchemas,
  type Invitation,
  type Mission,
  type Participant,
  type Scope,
} from "@/contracts";
import type { z } from "zod";
import { query, type Tx } from "../db/client";
import { fail } from "../http/errors";
import { scopeColumns, scopeFromRow } from "../http/scope";
import { iso } from "../auth/sessions";

export type ParticipantRow = {
  id: string;
  owner_principal_id: string;
  scope_mode: string;
  showcase_id: string;
  profile: Omit<Participant, "id" | "profileVersion" | "scope" | "createdAt">;
  profile_version: number;
  discoverable: boolean;
  participation_opt_in: boolean;
  public_graph: boolean;
  created_at: Date;
  deleted_at: Date | null;
};
export type MissionRow = {
  id: string;
  scope_mode: string;
  showcase_id: string;
  creator_id: string;
  owner_principal_id: string;
  state: Mission["state"];
  version: number;
  constraints_version: number;
  doc: Pick<Mission, "objective" | "expectedOutput" | "language" | "constraints">;
  current_proposal_revision: number | null;
  selected_proposal_id: string | null;
  excluded_participant_ids: string[];
  counter_availability: Record<string, { start: string; end: string; timezone: string }[]>;
  created_at: Date;
  expires_at: Date;
};
export type InvitationRow = {
  id: string;
  mission_id: string;
  proposal_id: string;
  proposal_revision: number;
  participant_id: string;
  scope_mode: string;
  showcase_id: string;
  language: string;
  status: Invitation["status"];
  terms: Invitation["terms"];
  terms_hash: string;
  response_version: number;
  expires_at: Date;
  lineage: Invitation["lineage"];
  link_epoch: number;
  created_at: Date;
};

export const participantDto = (row: ParticipantRow): Participant =>
  ParticipantSchema.parse({
    ...row.profile,
    id: row.id,
    profileVersion: row.profile_version,
    scope: scopeFromRow(row),
    createdAt: iso(row.created_at),
  });

export async function missionDto(row: MissionRow, client: Tx | undefined = undefined): Promise<Mission> {
  const reqs = await query<{ id: string; version: number; doc: Record<string, unknown> }>(
    "SELECT id, version, doc FROM mission_requirements WHERE mission_id=$1 ORDER BY position",
    [row.id],
    client,
  );
  return MissionSchema.parse({
    id: row.id,
    creatorId: row.creator_id,
    objective: row.doc.objective,
    expectedOutput: row.doc.expectedOutput,
    language: row.doc.language,
    state: row.state,
    version: row.version,
    constraintsVersion: row.constraints_version,
    scope: scopeFromRow(row),
    constraints: row.doc.constraints,
    requirements: reqs.map((r) => ({ ...r.doc, id: r.id, missionId: row.id, version: r.version })),
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
  });
}

export const invitationDto = (row: InvitationRow): Invitation =>
  InvitationSchema.parse({
    id: row.id,
    missionId: row.mission_id,
    proposalId: row.proposal_id,
    proposalRevision: row.proposal_revision,
    participantId: row.participant_id,
    scope: scopeFromRow(row),
    language: row.language,
    status: row.status,
    terms: row.terms,
    termsHash: row.terms_hash,
    responseVersion: row.response_version,
    expiresAt: iso(row.expires_at),
    lineage: row.lineage,
  });

export async function loadMission(
  id: string,
  scope: Scope,
  client?: Tx,
  lock = false,
): Promise<MissionRow> {
  const [mode, showcase] = scopeColumns(scope);
  const [row] = await query<MissionRow>(
    `SELECT * FROM missions WHERE id=$1 AND scope_mode=$2 AND showcase_id=$3${lock ? " FOR UPDATE" : ""}`,
    [id, mode, showcase],
    client,
  );
  return row ?? fail("NOT_FOUND", "Mission not found.");
}

export async function principalParticipantIds(principalId: string, scope: Scope, client?: Tx): Promise<string[]> {
  const [mode, showcase] = scopeColumns(scope);
  return (
    await query<{ id: string }>(
      "SELECT id FROM participants WHERE owner_principal_id=$1 AND scope_mode=$2 AND showcase_id=$3 AND deleted_at IS NULL ORDER BY created_at, id",
      [principalId, mode, showcase],
      client,
    )
  ).map((r) => r.id);
}

type EventType = keyof typeof EventPayloadSchemas;
export async function appendEvent<T extends EventType>(
  tx: Tx,
  mission: { id: string; scope_mode: string; showcase_id: string; version: number },
  type: T,
  payload: z.input<(typeof EventPayloadSchemas)[T]>,
  opts: {
    correlationId: string;
    runId?: string | null;
    agent?: AgentEvent["agent"];
    status?: AgentEvent["status"];
    proposalRevision?: number | null;
    causationId?: string | null;
    durationMs?: number | null;
  },
): Promise<AgentEvent> {
  const [{ next }] = await query<{ next: number }>(
    "SELECT COALESCE(MAX(sequence),0)+1 AS next FROM agent_events WHERE mission_id=$1",
    [mission.id],
    tx,
  );
  const now = new Date();
  const event = AgentEventSchema.parse({
    schemaVersion: 1,
    id: randomUUID(),
    missionId: mission.id,
    scope: scopeFromRow(mission),
    runId: opts.runId ?? null,
    agent: opts.agent ?? null,
    sequence: next,
    missionVersion: mission.version,
    proposalRevision: opts.proposalRevision ?? null,
    correlationId: opts.correlationId,
    causationId: opts.causationId ?? null,
    occurredAt: iso(now),
    status: opts.status ?? "INFO",
    durationMs: opts.durationMs ?? null,
    type,
    payload,
  });
  await tx.query(
    `INSERT INTO agent_events(id, mission_id, scope_mode, showcase_id, sequence, type, doc, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [event.id, mission.id, mission.scope_mode, mission.showcase_id, next, type, JSON.stringify(event), now],
  );
  return event;
}

// Version bump + state change in the locked transaction; returns the updated row view.
export async function bumpMission(
  tx: Tx,
  mission: MissionRow,
  changes: Partial<Pick<MissionRow, "state" | "current_proposal_revision" | "selected_proposal_id">> & {
    excluded?: string[];
    counters?: MissionRow["counter_availability"];
  } = {},
): Promise<MissionRow> {
  const next: MissionRow = {
    ...mission,
    state: changes.state ?? mission.state,
    version: mission.version + 1,
    current_proposal_revision:
      changes.current_proposal_revision !== undefined ? changes.current_proposal_revision : mission.current_proposal_revision,
    selected_proposal_id:
      changes.selected_proposal_id !== undefined ? changes.selected_proposal_id : mission.selected_proposal_id,
    excluded_participant_ids: changes.excluded ?? mission.excluded_participant_ids,
    counter_availability: changes.counters ?? mission.counter_availability,
  };
  await recordHistory(tx, next);
  await tx.query(
    `UPDATE missions SET state=$2, version=$3, current_proposal_revision=$4, selected_proposal_id=$5,
       excluded_participant_ids=$6, counter_availability=$7 WHERE id=$1`,
    [
      mission.id,
      next.state,
      next.version,
      next.current_proposal_revision,
      next.selected_proposal_id,
      JSON.stringify(next.excluded_participant_ids),
      JSON.stringify(next.counter_availability),
    ],
  );
  return next;
}

export async function recordHistory(tx: Tx, m: Pick<MissionRow, "id" | "version" | "state" | "current_proposal_revision" | "selected_proposal_id">) {
  await tx.query(
    `INSERT INTO mission_history(mission_id, version, state, current_proposal_revision, selected_proposal_id, recorded_at)
     VALUES ($1,$2,$3,$4,$5,now())`,
    [m.id, m.version, m.state, m.current_proposal_revision, m.selected_proposal_id],
  );
}
