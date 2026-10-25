import "server-only";
import type { AgentEvent } from "@/contracts";
import { query, transaction } from "../../db/client";
import { fail } from "../../http/errors";
import type { InvitationRow, MissionRow } from "../store";
import { buildSnapshot, loadOwnedMission } from "./service";

// Read-only historical snapshot at a committed sequence: exact mission version from history, invitation
// statuses folded from committed events. It never issues commands.
export async function replay(session: Parameters<typeof loadOwnedMission>[1], id: string, atSequence: number) {
  return transaction(async (tx) => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const mission = await loadOwnedMission(id, session, tx);
    const rows = await query<{ doc: AgentEvent }>(
      "SELECT doc FROM agent_events WHERE mission_id=$1 AND sequence <= $2 ORDER BY sequence",
      [id, atSequence],
      tx,
    );
    if (!rows.length) fail("NOT_FOUND", "No committed events at or before that sequence.");
    const last = rows[rows.length - 1].doc;
    const [history] = await query<{ version: number; state: MissionRow["state"]; current_proposal_revision: number | null; selected_proposal_id: string | null }>(
      "SELECT version, state, current_proposal_revision, selected_proposal_id FROM mission_history WHERE mission_id=$1 AND version <= $2 ORDER BY version DESC LIMIT 1",
      [id, last.missionVersion],
      tx,
    );
    const statuses = new Map<string, InvitationRow["status"]>();
    const selectedRevision = history?.selected_proposal_id
      ? (await query<{ revision: number }>("SELECT revision FROM group_proposals WHERE id=$1", [history.selected_proposal_id], tx))[0]?.revision
      : undefined;
    for (const { doc } of rows)
      if ("invitationStatus" in doc.payload && doc.proposalRevision === selectedRevision)
        statuses.set(doc.payload.participantId, doc.payload.invitationStatus);
    const view: MissionRow = {
      ...mission,
      version: history?.version ?? last.missionVersion,
      state: history?.state ?? mission.state,
      current_proposal_revision: history?.current_proposal_revision ?? null,
      selected_proposal_id: history?.selected_proposal_id ?? null,
    };
    return buildSnapshot(view, tx, { sequence: last.sequence, statuses });
  });
}
