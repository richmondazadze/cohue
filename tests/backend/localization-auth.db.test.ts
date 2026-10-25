import { readFileSync } from "node:fs";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { SessionRecord } from "@/server/auth/sessions";
import type { InvitationRow } from "@/server/domain/store";

const url = process.env.COHUE_TEST_DATABASE_URL;
const schema = `localization_${randomUUID().replaceAll("-", "")}`;
const scopedUrl = url ? new URL(url) : null;
scopedUrl?.searchParams.set("options", `-c search_path=${schema}`);
process.env.DATABASE_URL = scopedUrl?.toString() ?? "";
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret";

describe.skipIf(!url)("current-source localization authority on isolated PostgreSQL", () => {
  let db: typeof import("@/server/db/client");
  let media: typeof import("@/server/domain/media");
  let invites: typeof import("@/server/domain/invitations");
  let creator: SessionRecord;
  let invitee: SessionRecord;
  let invitation: InvitationRow;
  let localization: Awaited<ReturnType<typeof import("@/server/domain/media").localizeInvitation>>[number];
  let audioId: string;

  beforeAll(async () => {
    // The runner regression leases globally within its DB. Give this suite its own real schema,
    // so parallel tests cannot lease/strand one another's jobs.
    const admin = new pg.Client({connectionString:url});
    await admin.connect();
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.query(`SET search_path TO ${schema}`);
    for (const file of ["drizzle/0000_init.sql", "drizzle/0001_mission_history.sql", "drizzle/0002_privacy_retention.sql"])
      await admin.query(readFileSync(file,"utf8").replaceAll("--> statement-breakpoint", "").replaceAll('"public".', `"${schema}".`));
    await admin.end();
    db = await import("@/server/db/client");
    media = await import("@/server/domain/media");
    invites = await import("@/server/domain/invitations");
    const sessions = await import("@/server/auth/sessions");
    const participants = await import("@/server/domain/participants");
    const missions = await import("@/server/domain/missions/service");
    const steps = await import("@/server/runner/steps");
    const scope = { executionMode: "SHOWCASE", showcaseId: randomUUID() } as const;
    const window = { start: "2026-10-26T10:00:00Z", end: "2026-10-26T12:00:00Z", timezone: "UTC" };
    const mission = await db.transaction(async tx => {
      creator = (await sessions.createSessionRecord(tx, {kind:"SHOWCASE_OPERATOR",principalId:randomUUID(),scope,invitationId:null,expiresAt:new Date(Date.now()+3600_000)})).session;
      await participants.createParticipant(tx, creator, {displayName:"Synthetic localization test",language:"en",needs:[],interests:[],availability:[window],capabilities:[{normalizedSkillId:"research",category:"research",level:5,evidence:null,confirmedByUser:true,normalizationVersion:"taxonomy-1"}],visibility:{publicGraph:false,discoverable:false},participationOptIn:false});
      const m = await missions.createMission(tx, creator, {objective:"Synthetic localization authority",expectedOutput:"Scoped source",language:"en",constraints:{minGroupSize:1,maxGroupSize:1,minOverlapMinutes:60,window,creatorParticipates:true,preferences:[]},requirements:[{kind:"HUMAN",normalizedSkillId:"research",category:"research",priority:"REQUIRED",minimumCoverage:1,minimumLevel:null,outcome:null}]},randomUUID());
      await missions.startMission(tx, creator, m.id, m.version);
      return m;
    });
    await steps.drain(randomUUID(),20,10_000);
    const [m] = await db.query<{version:number;current_proposal_revision:number}>("SELECT version,current_proposal_revision FROM missions WHERE id=$1",[mission.id]);
    const [p] = await db.query<{id:string}>("SELECT id FROM group_proposals WHERE mission_id=$1 ORDER BY rank LIMIT 1",[mission.id]);
    await db.transaction(tx=>missions.selectProposal(tx,creator,mission.id,p.id,m.version,m.current_proposal_revision,randomUUID()));
    [invitation] = await db.query<InvitationRow>("SELECT * FROM invitations WHERE mission_id=$1",[mission.id]);
    invitee = {...creator,kind:"INVITATION",principalId:invitation.participant_id,invitationId:invitation.id};
    const [original] = await media.localizeInvitation(invitation,"en");
    localization = {...original,id:randomUUID(),status:"REVIEW_REQUIRED"};
    await db.query("INSERT INTO localizations(id,source_id,scope_mode,showcase_id,version,doc) VALUES ($1,$2,'SHOWCASE',$3,1,$4)",[localization.id,invitation.id,scope.showcaseId,JSON.stringify(localization)]);
    audioId = randomUUID();
    const doc = {id:audioId,ownerId:creator.principalId,scope,purpose:"INVITATION",language:"en",canonicalTextHash:original.canonicalTextHash,status:"READY",expiresAt:new Date(Date.now()+3600_000).toISOString(),accessPath:`/api/media/${audioId}`,sourceInvitationId:invitation.id};
    await db.query("INSERT INTO audio_artifacts(id,owner_principal_id,scope_mode,showcase_id,status,mime_type,bytes_base64,doc,expires_at) VALUES ($1,$2,'SHOWCASE',$3,'READY','audio/mpeg','AA==',$4,now()+interval '1 hour')",[audioId,creator.principalId,scope.showcaseId,JSON.stringify(doc)]);
  });
  afterEach(async () => {
    await db.query("UPDATE invitations SET status='ACCEPTED',expires_at=now()+interval '1 hour' WHERE id=$1",[invitation.id]);
    await db.query("UPDATE missions SET state='AWAITING_APPROVAL',selected_proposal_id=$2 WHERE id=$1",[invitation.mission_id,invitation.proposal_id]);
    await db.query("UPDATE participants SET deleted_at=NULL WHERE id=$1",[invitation.participant_id]);
    await db.query("UPDATE localizations SET version=1,doc=$2 WHERE id=$1",[localization.id,JSON.stringify(localization)]);
  });
  afterAll(async()=>{
    await db?.closeDb();
    const admin = new pg.Client({connectionString:url}); await admin.connect();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end();
  });

  it("allows creator review and bound invite detail, denies foreign principals and showcase scopes",async()=>{
    expect((await invites.reviewDetail(creator,invitation.id)).invitation.id).toBe(invitation.id);
    expect((await invites.detail(invitee,invitation.id)).invitation.id).toBe(invitation.id);
    await expect(invites.reviewDetail({...creator,principalId:randomUUID()},invitation.id)).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(invites.reviewDetail(invitee,invitation.id)).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(invites.reviewDetail({...creator,scope:{executionMode:"SHOWCASE",showcaseId:randomUUID()}},invitation.id)).rejects.toMatchObject({code:"NOT_FOUND"});
  });
  it("checks source versions and canonical hashes before creator approval",async()=>{
    const input={expectedVersion:1,canonicalTextHash:localization.canonicalTextHash,text:localization.text};
    await expect(db.transaction(tx=>media.approveLocalization(tx,{...creator,scope:{executionMode:"LIVE",showcaseId:null}},localization.id,input))).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(db.transaction(tx=>media.approveLocalization(tx,creator,localization.id,{...input,expectedVersion:2}))).rejects.toMatchObject({code:"STALE_VERSION"});
    await db.query("UPDATE localizations SET doc=jsonb_set(doc,'{sourceVersion}','2') WHERE id=$1",[localization.id]);
    await expect(db.transaction(tx=>media.approveLocalization(tx,creator,localization.id,input))).rejects.toMatchObject({code:"STALE_VERSION"});
  });
  it("approves current reviewed text and increments localization version",async()=>{
    const result=await db.transaction(tx=>media.approveLocalization(tx,creator,localization.id,{expectedVersion:1,canonicalTextHash:localization.canonicalTextHash,text:localization.text}));
    expect(result.status).toBe("APPROVED"); expect(result.version).toBe(2);
  });
  it("revokes reads, approval, synthesis and existing media on source revocation",async()=>{
    await db.query("UPDATE invitations SET status='REVOKED' WHERE id=$1",[invitation.id]);
    await expect(invites.reviewDetail(creator,invitation.id)).rejects.toMatchObject({code:"INVITATION_REVOKED"});
    await expect(db.transaction(tx=>media.approveLocalization(tx,creator,localization.id,{expectedVersion:1,canonicalTextHash:localization.canonicalTextHash,text:localization.text}))).rejects.toMatchObject({code:"INVITATION_REVOKED"});
    await expect(db.transaction(tx=>media.synthesize(tx,creator,{sourceKind:"INVITATION",sourceId:invitation.id,sourceVersion:1,canonicalTextHash:localization.canonicalTextHash,language:"en"}))).rejects.toMatchObject({code:"INVITATION_REVOKED"});
    await expect(media.mediaFor(creator,audioId)).rejects.toMatchObject({code:"INVITATION_REVOKED"});
  });
  it("rejects expired, replaced, cancelled and deleted sources",async()=>{
    await db.query("UPDATE invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[invitation.id]);
    await expect(invites.reviewDetail(creator,invitation.id)).rejects.toMatchObject({code:"INVITATION_EXPIRED"});
    await db.query("UPDATE invitations SET expires_at=now()+interval '1 hour' WHERE id=$1",[invitation.id]);
    await db.query("UPDATE missions SET selected_proposal_id=NULL WHERE id=$1",[invitation.mission_id]);
    await expect(invites.reviewDetail(creator,invitation.id)).rejects.toMatchObject({code:"STALE_VERSION"});
    await db.query("UPDATE missions SET state='CANCELLED' WHERE id=$1",[invitation.mission_id]);
    await expect(invites.reviewDetail(creator,invitation.id)).rejects.toMatchObject({code:"TERMINAL_MISSION"});
    await db.query("UPDATE participants SET deleted_at=now() WHERE id=$1",[invitation.participant_id]);
    await expect(invites.reviewDetail(creator,invitation.id)).rejects.toMatchObject({code:"NOT_FOUND"});
  });
  it("keeps source identity private and denies cross-scope media",async()=>{
    const result=await media.mediaFor(creator,audioId);
    expect(result.doc).not.toHaveProperty("sourceInvitationId");
    await expect(media.mediaFor({...creator,scope:{executionMode:"SHOWCASE",showcaseId:randomUUID()}},audioId)).rejects.toMatchObject({code:"NOT_FOUND"});
  });
});
