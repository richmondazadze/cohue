import "server-only";
import { randomUUID } from "node:crypto";
import { query, transaction } from "../db/client";
import { appendEvent, bumpMission, type InvitationRow, type MissionRow } from "../domain/store";
import { enqueueJob } from "./jobs";

// System expiry and retention, run by the worker/scheduler with clients closed. Not a public permission.
export async function sweep(): Promise<{ expiredInvitations: number; expiredMissions: number; purged: number; media: number }> {
  let expiredInvitations = 0;
  let expiredMissions = 0;
  const due = await query<{ id: string; mission_id: string }>(
    "SELECT id, mission_id FROM invitations WHERE status='PENDING' AND expires_at < now() LIMIT 50",
  );
  for (const d of due)
    await transaction(async (tx) => {
      const [mission] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1 FOR UPDATE", [d.mission_id], tx);
      const [row] = await query<InvitationRow>("UPDATE invitations SET status='EXPIRED', token_hash=NULL WHERE id=$1 AND status='PENDING' RETURNING *", [d.id], tx);
      if (!row || !mission) return;
      expiredInvitations++;
      const c = randomUUID();
      await appendEvent(tx, mission, "INVITATION_EXPIRED", { invitationId: row.id, participantId: row.participant_id, invitationStatus: "EXPIRED" }, { correlationId: c, proposalRevision: row.proposal_revision });
      // An expired invitation on the current team queues genuine repair, like a decline without exclusion.
      if (mission.state === "AWAITING_APPROVAL" && mission.selected_proposal_id === row.proposal_id && mission.expires_at > new Date()) {
        const next = await bumpMission(tx, mission, { state: "REPLANNING", excluded: [...new Set([...mission.excluded_participant_ids, row.participant_id])] });
        await appendEvent(tx, next, "REPLAN_STARTED", { uncoveredRequirementIds: [] }, { correlationId: c });
        await enqueueJob(tx, next, "STRATEGIST", "REPLAN", "REPLANNING");
      }
    });
  const stale = await query<{ id: string }>(
    "SELECT id FROM missions WHERE expires_at < now() AND state NOT IN ('ACTIVATED','CANCELLED','EXPIRED') LIMIT 50",
  );
  for (const s of stale)
    await transaction(async (tx) => {
      const [mission] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1 FOR UPDATE", [s.id], tx);
      if (!mission || ["ACTIVATED", "CANCELLED", "EXPIRED"].includes(mission.state)) return;
      expiredMissions++;
      await tx.query("UPDATE reservations SET state='RELEASED' WHERE mission_id=$1 AND state='ACCEPTED_HOLD'", [s.id]);
      await tx.query("UPDATE invitations SET status='EXPIRED', token_hash=NULL WHERE mission_id=$1 AND status IN ('PENDING','COUNTERPROPOSED')", [s.id]);
      await tx.query("UPDATE jobs SET status='CANCELLED' WHERE mission_id=$1 AND status IN ('QUEUED','LEASED','WAITING')", [s.id]);
      const next = await bumpMission(tx, mission, { state: "EXPIRED" });
      await appendEvent(tx, next, "MISSION_EXPIRED", { state: "EXPIRED" }, { correlationId: randomUUID() });
    });
  // Personal fields of deleted profiles are scrubbed by purge_by; the opaque row remains for referential integrity.
  const purged = await query(
    `UPDATE participants SET profile = jsonb_build_object('displayName','Deleted participant','language','en','needs','[]'::jsonb,
       'interests','[]'::jsonb,'availability','[]'::jsonb,'capabilities','[]'::jsonb,
       'visibility', jsonb_build_object('publicGraph',false,'discoverable',false),'participationOptIn',false),
       purge_by = NULL
     WHERE deleted_at IS NOT NULL AND purge_by IS NOT NULL AND purge_by < now() RETURNING id`,
  );
  if (purged.length) await query("DELETE FROM capabilities WHERE participant_id = ANY($1::uuid[])", [purged.map((p) => (p as { id: string }).id)]);
  const media = await query("UPDATE audio_artifacts SET bytes_base64=NULL, status='EXPIRED' WHERE expires_at < now() AND bytes_base64 IS NOT NULL RETURNING id");
  await query("DELETE FROM command_receipts WHERE expires_at < now()");
  await query("UPDATE sessions SET revoked_at=now() WHERE revoked_at IS NULL AND expires_at < now()");
  return { expiredInvitations, expiredMissions, purged: purged.length, media: media.length };
}
