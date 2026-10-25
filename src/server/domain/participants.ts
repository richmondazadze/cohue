import "server-only";
import { randomUUID } from "node:crypto";
import {
  EXECUTION_POLICY,
  INITIAL_TAXONOMY,
  type ProfileInputSchema,
  type Scope,
} from "@/contracts";
import type { z } from "zod";
import { query, type Tx } from "../db/client";
import { fail } from "../http/errors";
import { scopeColumns } from "../http/scope";
import { iso, type SessionRecord } from "../auth/sessions";
import {
  appendEvent,
  bumpMission,
  invitationDto,
  participantDto,
  type InvitationRow,
  type MissionRow,
  type ParticipantRow,
} from "./store";
import { enqueueJob } from "../runner/jobs";

type ProfileInput = z.output<typeof ProfileInputSchema>;
const SKILLS = new Map(INITIAL_TAXONOMY.skills.map((s) => [s.id, s]));

// Confirmed capabilities must use taxonomy-1 IDs; unknown skills need a reviewed taxonomy extension.
function validateProfile(profile: ProfileInput): void {
  const errors: Record<string, string[]> = {};
  profile.capabilities.forEach((c, i) => {
    if (!SKILLS.has(c.normalizedSkillId)) errors[`capabilities.${i}.normalizedSkillId`] = ["Unknown taxonomy-1 skill"];
  });
  [...profile.needs, ...profile.interests].forEach((s) => {
    if (!SKILLS.has(s)) errors[s.slice(0, 100)] = ["Unknown taxonomy-1 skill"];
  });
  if (Object.keys(errors).length) fail("INVALID_INPUT", "Profile references unknown skills.", errors);
}

export async function createParticipant(tx: Tx, session: SessionRecord, profile: ProfileInput) {
  validateProfile(profile);
  const id = randomUUID();
  const [mode, showcase] = scopeColumns(session.scope);
  const [row] = await query<ParticipantRow>(
    `INSERT INTO participants(id, owner_principal_id, scope_mode, showcase_id, profile, profile_version, discoverable, public_graph, participation_opt_in, created_at)
     VALUES ($1,$2,$3,$4,$5,1,$6,$7,$8,now()) RETURNING *`,
    [id, session.principalId, mode, showcase, JSON.stringify(profile), profile.visibility.discoverable, profile.visibility.publicGraph, profile.participationOptIn],
    tx,
  );
  for (const c of profile.capabilities)
    await tx.query(
      "INSERT INTO capabilities(id, participant_id, skill_id, level, doc) VALUES ($1,$2,$3,$4,$5)",
      [randomUUID(), id, c.normalizedSkillId, c.level, JSON.stringify(c)],
    );
  return participantDto(row);
}

export async function loadOwnedParticipant(
  id: string,
  session: SessionRecord,
  client?: Tx,
  lock = false,
): Promise<ParticipantRow> {
  const [mode, showcase] = scopeColumns(session.scope);
  const [row] = await query<ParticipantRow>(
    `SELECT * FROM participants WHERE id=$1 AND scope_mode=$2 AND showcase_id=$3 AND deleted_at IS NULL${lock ? " FOR UPDATE" : ""}`,
    [id, mode, showcase],
    client,
  );
  if (!row || row.owner_principal_id !== session.principalId) fail("NOT_FOUND", "Participant not found.");
  return row as ParticipantRow;
}

// Before activation, edits invalidate affected plans and queue a replan; after activation they only open a review notice (D9).
export async function updateParticipant(
  tx: Tx,
  session: SessionRecord,
  id: string,
  expectedVersion: number,
  profile: ProfileInput,
  correlationId: string,
) {
  validateProfile(profile);
  const row = await loadOwnedParticipant(id, session, tx, true);
  if (row.profile_version !== expectedVersion) fail("STALE_VERSION", "Profile changed since you loaded it.");
  const [updated] = await query<ParticipantRow>(
    `UPDATE participants SET profile=$2, profile_version=profile_version+1, discoverable=$3, public_graph=$4, participation_opt_in=$5
     WHERE id=$1 RETURNING *`,
    [id, JSON.stringify(profile), profile.visibility.discoverable, profile.visibility.publicGraph, profile.participationOptIn],
    tx,
  );
  await tx.query("DELETE FROM capabilities WHERE participant_id=$1", [id]);
  for (const c of profile.capabilities)
    await tx.query("INSERT INTO capabilities(id, participant_id, skill_id, level, doc) VALUES ($1,$2,$3,$4,$5)", [
      randomUUID(),
      id,
      c.normalizedSkillId,
      c.level,
      JSON.stringify(c),
    ]);
  await notifyAffectedMissions(tx, id, updated.profile_version, correlationId);
  return participantDto(updated);
}

async function notifyAffectedMissions(tx: Tx, participantId: string, profileVersion: number, correlationId: string) {
  const missions = await query<MissionRow>(
    `SELECT * FROM missions WHERE id IN (SELECT mission_id FROM invitations WHERE participant_id=$1)
       AND state NOT IN ('CANCELLED','EXPIRED','FAILED') ORDER BY id FOR UPDATE`,
    [participantId],
    tx,
  );
  for (const mission of missions) {
    if (mission.state === "ACTIVATED") {
      await appendEvent(tx, mission, "PROFILE_CHANGED", { participantId, profileVersion }, { correlationId });
      continue;
    }
    if (!["AWAITING_APPROVAL", "PROPOSED", "REPROPOSED"].includes(mission.state)) continue;
    const next = await bumpMission(tx, mission, { state: "REPLANNING" });
    await appendEvent(tx, next, "PROFILE_CHANGED", { participantId, profileVersion }, { correlationId });
    await appendEvent(tx, next, "REPLAN_STARTED", { uncoveredRequirementIds: [] }, { correlationId });
    await enqueueJob(tx, next, "STRATEGIST", "REPLAN", "REPLANNING");
  }
}

// Deletion immediately revokes sessions, invitations and discovery; personal fields are purged by the sweeper within 24h.
export async function deleteParticipant(tx: Tx, session: SessionRecord, id: string, expectedVersion: number, correlationId: string) {
  const row = await loadOwnedParticipant(id, session, tx, true);
  if (row.profile_version !== expectedVersion) fail("STALE_VERSION", "Profile changed since you loaded it.");
  const now = new Date();
  const purgeBy = new Date(now.getTime() + EXECUTION_POLICY.deletedDataPurgeHours * 3600_000);
  await tx.query(
    "UPDATE participants SET deleted_at=$2, purge_by=$3, discoverable=false, public_graph=false, participation_opt_in=false WHERE id=$1",
    [id, now, purgeBy],
  );
  const invites = await query<InvitationRow & { mission_state: string }>(
    `UPDATE invitations SET status='REVOKED', token_hash=NULL WHERE participant_id=$1 AND status IN ('PENDING','COUNTERPROPOSED') RETURNING *`,
    [id],
    tx,
  );
  await tx.query("UPDATE sessions SET revoked_at=now() WHERE kind='INVITATION' AND principal_id=$1", [id]);
  await tx.query("UPDATE reservations SET state='RELEASED' WHERE participant_id=$1 AND state='ACCEPTED_HOLD'", [id]);
  for (const invite of invites) {
    const [mission] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1 FOR UPDATE", [invite.mission_id], tx);
    await appendEvent(tx, mission, "INVITATION_REVOKED", { invitationId: invite.id, participantId: id, invitationStatus: "REVOKED" }, { correlationId, proposalRevision: invite.proposal_revision });
    await appendEvent(tx, mission, "ACCESS_REVOKED", { reason: "DELETION" }, { correlationId });
  }
  await notifyAffectedMissions(tx, id, row.profile_version, correlationId);
  return { deletionId: randomUUID(), status: "ACCEPTED" as const, revokedAt: iso(now), purgeBy: iso(purgeBy) };
}

export async function inbox(session: SessionRecord, participantId: string, limit: number, cursor?: string) {
  await loadOwnedParticipant(participantId, session);
  const offset = cursor && /^\d{1,6}$/.test(cursor) ? Number(cursor) : 0;
  const rows = await query<InvitationRow>(
    "SELECT * FROM invitations WHERE participant_id=$1 ORDER BY created_at DESC, id LIMIT $2 OFFSET $3",
    [participantId, limit + 1, offset],
  );
  return {
    scope: session.scope,
    invitations: rows.slice(0, limit).map(invitationDto),
    nextCursor: rows.length > limit ? String(offset + limit) : null,
  };
}

export async function network(scope: Scope, limit: number) {
  const [mode, showcase] = scopeColumns(scope);
  const rows = await query<ParticipantRow>(
    `SELECT * FROM participants WHERE scope_mode=$1 AND showcase_id=$2 AND deleted_at IS NULL AND public_graph AND participation_opt_in
     ORDER BY created_at, id LIMIT $3`,
    [mode, showcase, limit],
  );
  return {
    scope,
    graph: {
      snapshotSequence: 0,
      nodes: rows.map((r) => ({
        id: r.id,
        kind: "participant" as const,
        label: r.profile.displayName,
        status: "SUGGESTED" as const,
        evidenceRefs: [],
      })),
      edges: [],
    },
    nextCursor: null,
    accessEpoch: 1,
  };
}
