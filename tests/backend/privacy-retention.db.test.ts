import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionRecord } from "@/server/auth/sessions";
import type { InvitationRow, MissionRow } from "@/server/domain/store";

const url=process.env.COHUE_TEST_DATABASE_URL;
const schema=`privacy_${randomUUID().replaceAll("-","")}`;
const scoped=url?new URL(url):null; scoped?.searchParams.set("options",`-c search_path=${schema}`);
process.env.DATABASE_URL=scoped?.toString()??"";
process.env.SESSION_SECRET??="privacy-test-secret-privacy-test-secret";

describe.skipIf(!url)("scoped deletion and bounded retention on actual PostgreSQL",()=>{
  let db:typeof import("@/server/db/client");
  let participants:typeof import("@/server/domain/participants");
  let missions:typeof import("@/server/domain/missions/service");
  let sessions:typeof import("@/server/auth/sessions");
  let media:typeof import("@/server/domain/media");
  let privacy:typeof import("@/server/domain/privacy");
  let steps:typeof import("@/server/runner/steps");
  const window={start:"2026-10-26T10:00:00Z",end:"2026-10-26T12:00:00Z",timezone:"UTC"};
  beforeAll(async()=>{
    const admin=new pg.Client({connectionString:url});await admin.connect();
    await admin.query(`CREATE SCHEMA ${schema}`);await admin.query(`SET search_path TO ${schema}`);
    for(const file of ["0000_init.sql","0001_mission_history.sql","0002_privacy_retention.sql"])
      await admin.query(readFileSync(`drizzle/${file}`,"utf8").replaceAll("--> statement-breakpoint","").replaceAll('"public".',`"${schema}".`));
    await admin.end();
    db=await import("@/server/db/client"); participants=await import("@/server/domain/participants");
    missions=await import("@/server/domain/missions/service");sessions=await import("@/server/auth/sessions");
    media=await import("@/server/domain/media");privacy=await import("@/server/domain/privacy");steps=await import("@/server/runner/steps");
  });
  afterAll(async()=>{await db?.closeDb();const admin=new pg.Client({connectionString:url});await admin.connect();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();});

  async function formation(active=false){
    const scope={executionMode:"SHOWCASE",showcaseId:randomUUID()} as const;
    const make=async(skill:string,name:string)=>db.transaction(async tx=>{
      const result=await sessions.createSessionRecord(tx,{kind:"GUEST",principalId:randomUUID(),scope,invitationId:null,expiresAt:new Date(Date.now()+3600_000)});
      const profile=await participants.createParticipant(tx,result.session,{displayName:name,language:"en",needs:[],interests:[],availability:[window],capabilities:[{normalizedSkillId:skill,category:"research",level:5,evidence:"private-marker",confirmedByUser:true,normalizationVersion:"taxonomy-1"}],visibility:{publicGraph:true,discoverable:true},participationOptIn:true});
      return {...result,profile};
    });
    const creator=await make("coordination","Private creator marker");const guest=await make("research","Private invitee marker");
    const mission=await db.transaction(async tx=>{
      const m=await missions.createMission(tx,creator.session,{objective:"Private creator objective",expectedOutput:"private output",language:"en",constraints:{minGroupSize:2,maxGroupSize:2,minOverlapMinutes:60,window,creatorParticipates:true,preferences:[]},requirements:[{kind:"HUMAN",normalizedSkillId:"research",category:"research",priority:"REQUIRED",minimumCoverage:1,minimumLevel:null,outcome:"private outcome"}]},randomUUID());
      await missions.startMission(tx,creator.session,m.id,m.version);return m;
    });
    await steps.drain(randomUUID(),20,10_000);
    const [m]=await db.query<MissionRow>("SELECT * FROM missions WHERE id=$1",[mission.id]);
    const [p]=await db.query<{id:string;revision:number}>("SELECT id,revision FROM group_proposals WHERE mission_id=$1 ORDER BY rank LIMIT 1",[m.id]);
    await db.transaction(tx=>missions.selectProposal(tx,creator.session,m.id,p.id,m.version,p.revision,randomUUID()));
    const [invite]=await db.query<InvitationRow>("SELECT * FROM invitations WHERE mission_id=$1 AND participant_id=$2",[m.id,guest.profile.id]);
    const inviteSession:SessionRecord={...guest.session,kind:"INVITATION",principalId:guest.profile.id,invitationId:invite.id};
    await db.transaction(tx=>missions.respond(tx,inviteSession,invite.id,{action:"ACCEPT",termsHash:invite.terms_hash,responseVersion:1},randomUUID()));
    if(active){const [ready]=await db.query<MissionRow>("SELECT * FROM missions WHERE id=$1",[m.id]);await db.transaction(tx=>missions.activate(tx,creator.session,m.id,ready.version,p.revision,randomUUID()));}
    const [original]=await media.localizeInvitation(invite,"en");
    const localization={...original,id:randomUUID(),text:"private translation marker",status:"REVIEW_REQUIRED"};
    await db.query("INSERT INTO localizations(id,source_id,scope_mode,showcase_id,version,doc) VALUES ($1,$2,'SHOWCASE',$3,1,$4)",[localization.id,invite.id,scope.showcaseId,JSON.stringify(localization)]);
    const receiptId=randomUUID();
    await db.query("INSERT INTO command_receipts(id,scope_mode,showcase_id,principal_id,operation,idempotency_key,payload_digest,http_status,result,created_at,expires_at) VALUES ($1::uuid,'SHOWCASE',$2,$3,'selectProposal',$1::text,'test',200,$4,now(),now()+interval '1 day')",[receiptId,scope.showcaseId,creator.session.principalId,JSON.stringify({missionId:m.id,privateText:"private receipt marker"})]);
    return {creator,guest,missionId:m.id,invite,scope,localization,receiptId};
  }

  it("immediately scrubs a deleted invitee and replans inactive mission without cross-scope collateral",async()=>{
    const f=await formation();
    // Same owner principal in a different scenario must remain usable.
    const otherScope={executionMode:"SHOWCASE",showcaseId:randomUUID()} as const;
    const other=await db.transaction(tx=>sessions.createSessionRecord(tx,{kind:"GUEST",principalId:f.guest.session.principalId,scope:otherScope,invitationId:null,expiresAt:new Date(Date.now()+3600_000)}));
    await db.transaction(tx=>participants.deleteParticipant(tx,f.guest.session,f.guest.profile.id,1,randomUUID()));
    expect(await sessions.resolveSession(f.guest.token)).toBeNull();
    expect(await sessions.resolveSession(other.token)).not.toBeNull();
    const [person]=await db.query<{profile:unknown;purge_by:Date|null}>("SELECT profile,purge_by FROM participants WHERE id=$1",[f.guest.profile.id]);
    expect(person.profile).toEqual(privacy.deletedProfile);expect(person.purge_by).toBeNull();
    expect(await db.query("SELECT id FROM localizations WHERE id=$1",[f.localization.id])).toHaveLength(0);
    expect(await db.query("SELECT id FROM command_receipts WHERE id=$1",[f.receiptId])).toHaveLength(0);
    const [m]=await db.query<MissionRow>("SELECT * FROM missions WHERE id=$1",[f.missionId]);expect(m.state).toBe("REPLANNING");
    const snapshot=await missions.snapshot(f.creator.session,m.id);
    expect(snapshot.proposals).toHaveLength(0);expect(JSON.stringify(snapshot)).not.toContain("Private invitee marker");
    await expect((await import("@/server/domain/missions/replay")).replay(f.creator.session,m.id,100)).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(media.assertLocalizationSource(f.creator.session,f.localization.id)).rejects.toMatchObject({code:"NOT_FOUND"});
    const audit=await db.query<{terms_hash:string;action:string;expires_at:Date;occurred_at:Date}>("SELECT * FROM privacy_audit WHERE scope_mode='SHOWCASE' AND showcase_id=$1",[f.scope.showcaseId]);
    expect(audit.some(a=>a.terms_hash===f.invite.terms_hash&&a.action==='ACCEPT')).toBe(true);
    expect(audit.every(a=>a.expires_at.getTime()-a.occurred_at.getTime()<=30*86400_000)).toBe(true);
    expect(JSON.stringify(audit)).not.toContain("private-marker");
    // Repair consumes safe candidates rather than trying to parse redacted terms.
    await steps.drain(randomUUID(),20,10_000);
    const [repaired]=await db.query<{state:string}>("SELECT state FROM missions WHERE id=$1",[m.id]);expect(repaired.state).toBe("PAUSED_FOR_HUMAN");
  });

  it("keeps active commitments and capacity, presents tombstone plus explicit review",async()=>{
    const f=await formation(true);
    await db.transaction(tx=>participants.deleteParticipant(tx,f.guest.session,f.guest.profile.id,1,randomUUID()));
    const [m]=await db.query<MissionRow>("SELECT * FROM missions WHERE id=$1",[f.missionId]);expect(m.state).toBe("ACTIVATED");
    const room=await missions.room(f.creator.session,null,m.id);
    expect(room.memberships.find(p=>p.participantId===f.guest.profile.id)?.approvedRole).toBe("Deleted participant");
    expect(room.reviews.some(r=>r.status==='OPEN')).toBe(true);
    expect(JSON.stringify(room)).not.toContain("private-marker");
    const holds=await db.query("SELECT id FROM reservations WHERE mission_id=$1 AND participant_id=$2 AND state='ACTIVATED'",[m.id,f.guest.profile.id]);expect(holds).toHaveLength(1);
    const before=JSON.stringify(room);
    await db.transaction(tx=>privacy.scrubDeletedParticipant(tx,{...(f.guest.profile as unknown as import("@/server/domain/store").ParticipantRow),id:f.guest.profile.id,owner_principal_id:f.guest.session.principalId,scope_mode:'SHOWCASE',showcase_id:f.scope.showcaseId}));
    expect(JSON.stringify(await missions.room(f.creator.session,null,m.id))).toBe(before);
  });

  it("revokes deleted creator and scrubs creator text while preserving other member access",async()=>{
    const f=await formation(true);
    await db.transaction(tx=>participants.deleteParticipant(tx,f.creator.session,f.creator.profile.id,1,randomUUID()));
    expect(await sessions.resolveSession(f.creator.token)).toBeNull();
    await expect(missions.snapshot(f.creator.session,f.missionId)).rejects.toMatchObject({code:"NOT_FOUND"});
    const room=await missions.room(f.guest.session,null,f.missionId);
    expect(room.mission.objective).toBe("Deleted mission");expect(JSON.stringify(room)).not.toContain("Private creator");
    expect(room.mission.state).toBe("ACTIVATED");
  });

  it("serializes deletion against source publication and rejects stale capabilities after commit",async()=>{
    const f=await formation();
    const source=await import("@/server/domain/invitations");
    const inviteSession:SessionRecord={...f.guest.session,kind:"INVITATION",principalId:f.guest.profile.id,invitationId:f.invite.id};
    await Promise.allSettled([
      source.detail(inviteSession,f.invite.id),
      db.transaction(tx=>participants.deleteParticipant(tx,f.guest.session,f.guest.profile.id,1,randomUUID())),
    ]);
    await expect(source.detail(inviteSession,f.invite.id)).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(media.assertLocalizationSource(f.creator.session,f.localization.id)).rejects.toMatchObject({code:"NOT_FOUND"});
    const sweeper=await import("@/server/runner/sweeper");
    await sweeper.sweep();await sweeper.sweep();
    expect(await db.query("SELECT id FROM localizations WHERE source_id=$1",[f.invite.id])).toHaveLength(0);
  });

  it("prunes expired restricted audit and old events idempotently without resetting sequence",async()=>{
    const f=await formation();
    const store=await import("@/server/domain/store");
    // Simulate an old writer that still allocates via MAX; bridge keeps the counter current.
    await db.query(`INSERT INTO agent_events(id,mission_id,scope_mode,showcase_id,sequence,type,doc,occurred_at)
      SELECT gen_random_uuid(),mission_id,scope_mode,showcase_id,sequence+1,type,
      jsonb_set(doc,'{sequence}',to_jsonb(sequence+1)),now() FROM agent_events WHERE mission_id=$1 ORDER BY sequence DESC LIMIT 1`,[f.missionId]);
    const [before]=await db.query<{event_sequence:number}>("SELECT event_sequence FROM missions WHERE id=$1",[f.missionId]);
    await db.query("UPDATE agent_events SET occurred_at=now()-interval '31 days' WHERE mission_id=$1",[f.missionId]);
    await db.query("INSERT INTO privacy_audit(id,scope_mode,showcase_id,subject_ref,source_ref,terms_hash,action,occurred_at,expires_at) VALUES ($1,'SHOWCASE',$2,$3,$4,$5,'ACCEPT',now()-interval '31 days',now()-interval '1 day')",[randomUUID(),f.scope.showcaseId,f.guest.profile.id,randomUUID(),f.invite.terms_hash]);
    await db.transaction(tx=>privacy.pruneRetention(tx,true));await db.transaction(tx=>privacy.pruneRetention(tx,true));
    expect(await db.query("SELECT id FROM privacy_audit WHERE expires_at<=now()")).toHaveLength(0);
    expect(before.event_sequence).toBeGreaterThan(0);
    expect(await db.query("SELECT id FROM agent_events WHERE mission_id=$1",[f.missionId])).toHaveLength(0);
    const event=await db.transaction(async tx=>{const [m]=await db.query<MissionRow>("SELECT * FROM missions WHERE id=$1 FOR UPDATE",[f.missionId],tx);return store.appendEvent(tx,m,'ACCESS_REVOKED',{reason:'PERMISSION_CHANGED'},{correlationId:randomUUID()});});
    expect(event.sequence).toBe(before.event_sequence+1);
    const snapshot=await missions.snapshot(f.creator.session,f.missionId);expect(snapshot.snapshotSequence).toBe(event.sequence);
    // Old creation alone must not prune a recently transitioned terminal mission.
    await db.query("UPDATE missions SET state='CANCELLED',created_at=now()-interval '31 days' WHERE id=$1",[f.missionId]);
    await db.transaction(tx=>privacy.pruneRetention(tx,true));
    expect(await db.query("SELECT id FROM missions WHERE id=$1",[f.missionId])).toHaveLength(1);
  });
});
