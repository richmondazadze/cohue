import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
const url=process.env.COHUE_TEST_DATABASE_URL;
process.env.DATABASE_URL=url??"";process.env.SESSION_SECRET??="test-secret-test-secret-test-secret";
describe.skipIf(!url)("persisted participant identity",()=>{
 let db:typeof import("@/server/db/client");
 afterAll(async()=>{await db?.closeDb()});
 it("normalizes, persists, rejects concurrent scoped duplicates and permits independent showcase identity",async()=>{
  db=await import("@/server/db/client");const {createParticipant,loadOwnedParticipant,updateParticipant}=await import("@/server/domain/participants");const {createSessionRecord}=await import("@/server/auth/sessions");
  const username=`u_${randomUUID().replaceAll('-','').slice(0,16)}`;
  const makeSession=async(scope:{executionMode:"LIVE";showcaseId:null}|{executionMode:"SHOWCASE";showcaseId:string})=>db.transaction(async tx=>(await createSessionRecord(tx,{kind:"GUEST",principalId:randomUUID(),scope,invitationId:null,expiresAt:new Date(Date.now()+3600000)})).session);
  const session=await makeSession({executionMode:"LIVE",showcaseId:null});
  const input={username:username.toUpperCase(),avatarId:"3d_3" as const,displayName:"Identity test",language:"en",needs:[],interests:[],availability:[],capabilities:[],visibility:{publicGraph:false,discoverable:false},participationOptIn:false};
  const results=await Promise.allSettled([1,2].map(()=>db.transaction(tx=>createParticipant(tx,session,input))));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  const person=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof createParticipant>>>).value;
  expect(person.username).toBe(username);expect(person.avatarId).toBe('3d_3');
  const stored=await loadOwnedParticipant(person.id,session);expect(stored.profile.username).toBe(username);
  const updated=await db.transaction(tx=>updateParticipant(tx,session,person.id,person.profileVersion,{...stored.profile,avatarId:'3d_5'},randomUUID()));expect(updated.avatarId).toBe('3d_5');
  const other=await makeSession({executionMode:"SHOWCASE",showcaseId:randomUUID()});const synthetic=await db.transaction(tx=>createParticipant(tx,other,input));expect(synthetic.username).toBe(username);
 });
});
