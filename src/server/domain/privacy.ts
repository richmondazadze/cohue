import "server-only";
import { randomUUID } from "node:crypto";
import { query, type Tx } from "../db/client";
import { scopeColumns } from "../http/scope";
import type { ParticipantRow } from "./store";

export const deletedProfile = {
  displayName: "Deleted participant", language: "en", needs: [], interests: [], availability: [], capabilities: [],
  visibility: { publicGraph: false, discoverable: false }, participationOptIn: false,
};

// Runs in the deletion transaction. Preserve original hashes/actions, never manufacture replacement terms.
export async function scrubDeletedParticipant(tx: Tx, participant: ParticipantRow) {
  const [mode, showcase] = scopeColumns(participant.scope_mode === "LIVE" ? {executionMode:"LIVE",showcaseId:null} : {executionMode:"SHOWCASE",showcaseId:participant.showcase_id});
  const affected = await query<{id:string}>(
    `SELECT id FROM missions WHERE scope_mode=$1 AND showcase_id=$2 AND
     (creator_id=$3 OR id IN (SELECT mission_id FROM invitations WHERE participant_id=$3 AND scope_mode=$1 AND showcase_id=$2)
      OR id IN (SELECT mission_id FROM group_proposals WHERE scope_mode=$1 AND showcase_id=$2 AND doc::text LIKE $4)) ORDER BY id FOR UPDATE`,
    [mode,showcase,participant.id,`%${participant.id}%`],tx,
  );
  const missionIds=affected.map(m=>m.id);
  const sources=await query<{id:string;terms_hash:string;status:string;created_at:Date}>(
    "SELECT id,terms_hash,status,created_at FROM invitations WHERE scope_mode=$1 AND showcase_id=$2 AND mission_id=ANY($3::uuid[])",[mode,showcase,missionIds],tx,
  );
  for(const source of sources) {
    const actions=await query<{id:string;action:string;created_at:Date}>("SELECT id,doc->>'action' AS action,created_at FROM participant_responses WHERE invitation_id=$1",[source.id],tx);
    for(const action of actions.length?actions:[{id:source.id,action:source.status,created_at:source.created_at}])
      await tx.query(`INSERT INTO privacy_audit(id,scope_mode,showcase_id,subject_ref,source_ref,terms_hash,action,occurred_at,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,LEAST($8::timestamptz+interval '720 hours',now()+interval '720 hours')) ON CONFLICT DO NOTHING`,
      [randomUUID(),mode,showcase,participant.id,action.id,source.terms_hash,action.action ?? source.status,action.created_at]);
  }
  const sourceIds=sources.map(s=>s.id);
  await tx.query("DELETE FROM localizations WHERE scope_mode=$1 AND showcase_id=$2 AND source_id=ANY($3::uuid[])",[mode,showcase,sourceIds]);
  await tx.query("DELETE FROM audio_artifacts WHERE scope_mode=$1 AND showcase_id=$2 AND (owner_principal_id=$3 OR doc->>'sourceInvitationId'=ANY($4::text[]))",[mode,showcase,participant.owner_principal_id,sourceIds]);
  const refs=[participant.id,...missionIds,...sourceIds];
  await tx.query(`DELETE FROM command_receipts WHERE scope_mode=$1 AND showcase_id=$2 AND
    (principal_id=$3 OR EXISTS(SELECT 1 FROM unnest($4::text[]) r WHERE position(r IN result::text)>0))`,[mode,showcase,participant.owner_principal_id,refs]);
  // Docs marked private cannot be parsed as public terms/proposals and every consumer excludes them.
  await tx.query("UPDATE invitations SET terms='{\"privacyRedacted\":true}',token_hash=NULL WHERE scope_mode=$1 AND showcase_id=$2 AND mission_id=ANY($3::uuid[])",[mode,showcase,missionIds]);
  await tx.query("UPDATE participant_responses SET doc=jsonb_build_object('privacyRedacted',true) WHERE invitation_id=ANY($1::uuid[])",[sourceIds]);
  await tx.query("UPDATE group_proposals SET doc='{\"privacyRedacted\":true}' WHERE scope_mode=$1 AND showcase_id=$2 AND mission_id=ANY($3::uuid[])",[mode,showcase,missionIds]);
  await tx.query("DELETE FROM match_results WHERE mission_id=ANY($1::uuid[])",[missionIds]);
  await tx.query("DELETE FROM candidate_matches WHERE mission_id=ANY($1::uuid[])",[missionIds]);
  await tx.query("DELETE FROM external_opportunities WHERE scope_mode=$1 AND showcase_id=$2 AND mission_id=ANY($3::uuid[])",[mode,showcase,missionIds]);
  await tx.query("UPDATE jobs SET checkpoint=checkpoint-'searchQuery'-'providerOutput',last_error=NULL WHERE scope_mode=$1 AND showcase_id=$2 AND mission_id=ANY($3::uuid[])",[mode,showcase,missionIds]);
  await tx.query("UPDATE review_requests SET doc=(doc - 'resolution') || jsonb_build_object('reason','Privacy review required','proposedAvailability','[]'::jsonb) WHERE mission_id=ANY($1::uuid[])",[missionIds]);
  // Shared tasks may mention a deleted member anywhere; redact their free text conservatively.
  await tx.query("UPDATE mission_tasks SET doc=doc || jsonb_build_object('description','Task details removed for privacy review','dueAt',NULL) WHERE mission_id=ANY($1::uuid[])",[missionIds]);
  await tx.query("UPDATE mission_memberships SET doc=doc || jsonb_build_object('approvedRole','Deleted participant') WHERE participant_id=$1 AND mission_id=ANY($2::uuid[])",[participant.id,missionIds]);
  await tx.query("DELETE FROM capabilities WHERE participant_id=$1",[participant.id]);
  await tx.query("UPDATE participants SET profile=$2,purge_by=NULL WHERE id=$1 AND scope_mode=$3 AND showcase_id=$4",[participant.id,JSON.stringify(deletedProfile),mode,showcase]);
  // Creator-authored free text is also personal data. Typed reads reject deleted creators.
  await tx.query("UPDATE missions SET doc=jsonb_set(jsonb_set(doc,'{objective}','\"Deleted mission\"'),'{expectedOutput}','\"Removed for privacy\"') WHERE creator_id=$1 AND scope_mode=$2 AND showcase_id=$3",[participant.id,mode,showcase]);
  await tx.query("UPDATE mission_requirements SET doc=jsonb_set(doc,'{outcome}','null') WHERE mission_id IN (SELECT id FROM missions WHERE creator_id=$1 AND scope_mode=$2 AND showcase_id=$3)",[participant.id,mode,showcase]);
  await tx.query("UPDATE missions SET counter_availability=counter_availability-$1 WHERE scope_mode=$2 AND showcase_id=$3",[participant.id,mode,showcase]);
}

// No public route reads restricted audit. Prune even if a former subject has no session/browser.
export async function pruneRetention(tx: Tx, pruneEvents = false) {
  await tx.query("DELETE FROM privacy_audit WHERE expires_at<=now()");
  // Redacted source rows are not permanent shadow audit stores. Active room membership/reservation
  // rows remain operational records; they carry no reconstructed personal terms.
  await tx.query("DELETE FROM invitations WHERE terms ? 'privacyRedacted' AND created_at<now()-interval '720 hours'");
  await tx.query("DELETE FROM group_proposals p WHERE p.doc ? 'privacyRedacted' AND p.created_at<now()-interval '720 hours' AND NOT EXISTS(SELECT 1 FROM invitations i WHERE i.proposal_id=p.id)");
  if (pruneEvents) await tx.query("DELETE FROM agent_events WHERE occurred_at<now()-interval '720 hours'");
  await tx.query("DELETE FROM sessions WHERE expires_at<now()-interval '720 hours'");
  // Terminal mission payloads and all cascading private history have a bounded lifetime.
  await tx.query("DELETE FROM missions WHERE state IN ('CANCELLED','EXPIRED','FAILED') AND COALESCE((SELECT MAX(recorded_at) FROM mission_history h WHERE h.mission_id=missions.id),created_at)<now()-interval '720 hours'");
  await tx.query("DELETE FROM mission_history WHERE recorded_at<now()-interval '720 hours'");
  await tx.query("DELETE FROM localizations l WHERE NOT EXISTS(SELECT 1 FROM invitations i WHERE i.id=l.source_id AND i.scope_mode=l.scope_mode AND i.showcase_id=l.showcase_id)");
  await tx.query("DELETE FROM audio_artifacts a WHERE a.doc ? 'sourceInvitationId' AND NOT EXISTS(SELECT 1 FROM invitations i WHERE i.id::text=a.doc->>'sourceInvitationId' AND i.scope_mode=a.scope_mode AND i.showcase_id=a.showcase_id)");
}
