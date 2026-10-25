// Explicit production acceptance: newly generated SHOWCASE scope only, no existing profile deletion/reset.
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
if(process.env.COHUE_PRIVACY_ACCEPTANCE!=='1')throw new Error('Explicit privacy acceptance flag required');
try { process.loadEnvFile('.env.local'); } catch {}
mkdirSync('artifacts',{recursive:true});
const {query,transaction,closeDb}=await import('../../src/server/db/client');
const {createSessionRecord,resolveSession}=await import('../../src/server/auth/sessions');
const {createParticipant,deleteParticipant}=await import('../../src/server/domain/participants');
const {createMission,startMission,selectProposal,respond,activate,room,snapshot}=await import('../../src/server/domain/missions/service');
const {reviewDetail}=await import('../../src/server/domain/invitations');
type MissionRow=import('../../src/server/domain/store').MissionRow;
type InvitationRow=import('../../src/server/domain/store').InvitationRow;
const scope={executionMode:'SHOWCASE',showcaseId:randomUUID()} as const;
const trace:unknown[]=[];
const record=(step:string,data:Record<string,unknown>={})=>{const entry={at:new Date().toISOString(),step,scope,...data};trace.push(entry);console.log(JSON.stringify(entry));writeFileSync('artifacts/privacy-smoke-trace.json',JSON.stringify(trace,null,2));};
const assert=(v:unknown,m:string)=>{if(!v)throw new Error(m)};
const window={start:'2026-10-26T14:00:00Z',end:'2026-10-26T16:00:00Z',timezone:'UTC'};
try{
 const create=async(skill:string,label:string)=>transaction(async tx=>{
  const result=await createSessionRecord(tx,{kind:'GUEST',principalId:randomUUID(),scope,invitationId:null,expiresAt:new Date(Date.now()+3600_000)});
  const profile=await createParticipant(tx,result.session,{displayName:'[SYNTHETIC PRIVACY ACCEPTANCE] '+label,language:'en',needs:[],interests:[],availability:[window],capabilities:[{normalizedSkillId:skill,category:'research',level:5,evidence:null,confirmedByUser:true,normalizationVersion:'taxonomy-1'}],visibility:{publicGraph:true,discoverable:true},participationOptIn:true});
  return {...result,profile};
 });
 const creator=await create('coordination','organizer'),guest=await create('research','participant');
 const mission=await transaction(async tx=>{
  const m=await createMission(tx,creator.session,{objective:'[SYNTHETIC PRIVACY ACCEPTANCE] Research coordination',expectedOutput:'Synthetic privacy check',language:'en',constraints:{minGroupSize:2,maxGroupSize:2,minOverlapMinutes:60,window,creatorParticipates:true,preferences:[]},requirements:[{kind:'HUMAN',normalizedSkillId:'research',category:'research',priority:'REQUIRED',minimumCoverage:1,minimumLevel:null,outcome:null}]},randomUUID());
  await startMission(tx,creator.session,m.id,m.version);return m;
 });
 record('isolated_scope_queued',{missionId:mission.id,noHttpOrAfter:true});
 // No runOne/drain/sweep: only the deployed persistent worker may progress.
 await new Promise(r=>setTimeout(r,35000));
 const [planned]=await query<MissionRow>("SELECT * FROM missions WHERE id=$1 AND scope_mode='SHOWCASE' AND showcase_id=$2",[mission.id,scope.showcaseId]);
 assert(planned.state==='PROPOSED','Worker did not propose');
 const [proposal]=await query<{id:string;revision:number}>('SELECT id,revision FROM group_proposals WHERE mission_id=$1 ORDER BY rank LIMIT 1',[mission.id]);
 await transaction(tx=>selectProposal(tx,creator.session,mission.id,proposal.id,planned.version,proposal.revision,randomUUID()));
 const [invite]=await query<InvitationRow>('SELECT * FROM invitations WHERE mission_id=$1 AND participant_id=$2',[mission.id,guest.profile.id]);
 const capability={...guest.session,kind:'INVITATION' as const,principalId:guest.profile.id,invitationId:invite.id};
 await transaction(tx=>respond(tx,capability,invite.id,{action:'ACCEPT',termsHash:invite.terms_hash,responseVersion:1,reason:'Explicit synthetic operator acceptance'},randomUUID()));
 const [ready]=await query<MissionRow>('SELECT * FROM missions WHERE id=$1',[mission.id]);
 await transaction(tx=>activate(tx,creator.session,mission.id,ready.version,proposal.revision,randomUUID()));
 const mediaId=randomUUID(),auditId=randomUUID();
 // Clearly synthetic expired fixture bytes, never claimed as ElevenLabs output.
 await query("INSERT INTO audio_artifacts(id,owner_principal_id,scope_mode,showcase_id,status,mime_type,bytes_base64,doc,expires_at) VALUES ($1,$2,'SHOWCASE',$3,'READY','audio/mpeg','AA==','{}',now()-interval '1 second')",[mediaId,creator.session.principalId,scope.showcaseId]);
 await query("INSERT INTO privacy_audit(id,scope_mode,showcase_id,subject_ref,source_ref,action,occurred_at,expires_at) VALUES ($1,'SHOWCASE',$2,$3,$4,'SYNTHETIC_RETENTION_PROBE',now()-interval '2 hours',now()-interval '1 hour')",[auditId,scope.showcaseId,guest.profile.id,randomUUID()]);
 await transaction(tx=>deleteParticipant(tx,guest.session,guest.profile.id,guest.profile.profileVersion,randomUUID()));
 assert(await resolveSession(guest.token)===null,'Deleted session remains authorized');
 const view=await room(creator.session,null,mission.id);
 assert(view.mission.state==='ACTIVATED'&&view.reviews.some(r=>r.status==='OPEN'),'Active review/state incorrect');
 assert(view.memberships.some(m=>m.participantId===guest.profile.id&&m.approvedRole==='Deleted participant'),'No tombstone');
 assert((await snapshot(creator.session,mission.id)).proposals.length===0,'Historical private terms still public');
 let denied=false;try{await reviewDetail(creator.session,invite.id)}catch{denied=true}assert(denied,'Deleted invitation still readable');
 const audit=await query<{terms_hash:string;action:string}>('SELECT terms_hash,action FROM privacy_audit WHERE scope_mode=$1 AND showcase_id=$2',['SHOWCASE',scope.showcaseId]);
 assert(audit.some(a=>a.terms_hash===invite.terms_hash&&a.action==='ACCEPT'),'Original consent hash/action not retained');
 record('deletion_committed',{missionId:mission.id,deletedParticipantId:guest.profile.id,activeReview:true,historicalTermsDenied:true,sourceDenied:true,originalHashRetained:true,syntheticDecisions:true});
 await new Promise(r=>setTimeout(r,10000));
 const [media]=await query<{bytes_base64:string|null;status:string}>('SELECT bytes_base64,status FROM audio_artifacts WHERE id=$1',[mediaId]);
 assert(!media||media.bytes_base64===null,'Expired bytes retained');
 assert((await query('SELECT id FROM privacy_audit WHERE id=$1',[auditId])).length===0,'Expired audit retained');
 const [counts]=await query<{n:number}>('SELECT count(*)::int AS n FROM reservations WHERE mission_id=$1 AND state=\'ACTIVATED\'',[mission.id]);assert(counts.n===2,'Active deletion silently released commitments');
 record('unattended_retention_verified',{expiredBytesRemoved:true,expiredAuditRemoved:true,activeCapacityPreserved:true});
 // Delete owned creator last. This scrubs its private text and revokes capability; leaves truthful active review/tombstones.
 await transaction(tx=>deleteParticipant(tx,creator.session,creator.profile.id,creator.profile.profileVersion,randomUUID()));
 assert(await resolveSession(creator.token)===null,'Deleted creator session usable');
 record('synthetic_creator_cleanup_complete',{missionId:mission.id});
}finally{await closeDb()}
