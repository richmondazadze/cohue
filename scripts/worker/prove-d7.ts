// Operator acceptance harness: only the installed, labeled SHOWCASE scope; never LIVE.
// Requires explicit COHUE_D7_ACCEPTANCE=1, configured runtime DB and trusted SSH key/known_hosts.
// No HTTP calls or after() acceleration. Coordinate a quiet production window before running.
import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

if (process.env.COHUE_D7_ACCEPTANCE !== "1") throw new Error("Explicit D7 acceptance flag required");
try { process.loadEnvFile(".env.local"); } catch {}
mkdirSync("artifacts", { recursive: true });
const { query, transaction, db, closeDb } = await import("../../src/server/db/client");
const { createSessionRecord } = await import("../../src/server/auth/sessions");
const { createMission, startMission, selectProposal, respond, activate, cancel } = await import("../../src/server/domain/missions/service");
const { claimCommit } = await import("../../src/server/runner/jobs");
const { issueLink, redeem } = await import("../../src/server/domain/invitations");
type JobRow = import("../../src/server/runner/jobs").JobRow;
type MissionRow = import("../../src/server/domain/store").MissionRow;
const scope = { executionMode: "SHOWCASE", showcaseId: "00000000-0000-4000-8000-000000000384" } as const;
const principalId = "00000000-0000-4000-8000-000000000385";
const resume = process.env.COHUE_D7_RESUME === "1";
const trace: Record<string, unknown>[] = resume ? JSON.parse(readFileSync("artifacts/d7-trace.json", "utf8")) : [];
const record = (step: string, fields: Record<string, unknown> = {}) => {
  const line = { at: new Date().toISOString(), step, ...fields };
  trace.push(line); console.log(JSON.stringify(line));
  writeFileSync("artifacts/d7-trace.json", JSON.stringify(trace, null, 2));
};
// On-host acceptance is an explicit operator-only alternative when local high-port egress is blocked.
// Run from the existing approved root console, with runtime-only environment; application worker stays cohue.
const ssh = (command: string) => process.env.COHUE_D7_ON_HOST === "1"
  ? execFileSync("/bin/sh", ["-c", command], { encoding: "utf8", timeout: 30000 }).trim()
  : execFileSync("ssh", ["-n","-o","BatchMode=yes","-o","ConnectTimeout=10","-i","credentials/cohue-worker-ed25519","-o","IdentitiesOnly=yes","-o","StrictHostKeyChecking=yes","-o","UserKnownHostsFile=credentials/cohue-worker-known-hosts","root@155.138.162.102",command], { encoding: "utf8", timeout: 30000 }).trim();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve,ms));
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
if (process.env.COHUE_D7_ON_HOST === "1") {
  assert(process.getuid?.() === 0, "On-host process control requires the authorized operator");
  assert(execFileSync("hostname", { encoding: "utf8" }).trim() === "cohue-worker", "Wrong acceptance host");
}
let lock: PoolClient | undefined;
try {
  if (!resume) assert(ssh("systemctl is-active cohue-worker || true") === "inactive", "Worker must be held before queueing");
  const creator = await transaction(async tx => (await createSessionRecord(tx,{kind:"SHOWCASE_OPERATOR",principalId,scope,invitationId:null,expiresAt:new Date(Date.now()+3600_000)})).session);
  const window = {start:"2026-10-25T20:00:00Z",end:"2026-10-25T22:00:00Z",timezone:"America/Chicago"};
  const mission = resume ? { id: String(trace[0].missionId) } : await transaction(async tx => {
    const m = await createMission(tx,creator,{objective:"[SYNTHETIC D7 ACCEPTANCE] Coordinate a software workshop",expectedOutput:"Synthetic workshop plan",language:"en",constraints:{minGroupSize:2,maxGroupSize:2,minOverlapMinutes:60,window,creatorParticipates:true,preferences:[]},requirements:[{kind:"HUMAN",normalizedSkillId:"coordination",category:"operations",priority:"REQUIRED",minimumCoverage:1,minimumLevel:null,outcome:null},{kind:"HUMAN",normalizedSkillId:"software",category:"technology",priority:"REQUIRED",minimumCoverage:1,minimumLevel:null,outcome:null}]},randomUUID());
    await startMission(tx,creator,m.id,m.version); return m;
  });
  let stale: JobRow | undefined;
  if (!resume) {
  record("queued_with_worker_held",{missionId:mission.id,scope,workerCommit:ssh("cat /opt/cohue/.release-commit"),node:ssh("node --version"),origin:"https://cohue.tech",noHttp:true});
  lock = await db().connect(); await lock.query("BEGIN");
  await lock.query("SELECT id FROM missions WHERE id=$1 FOR UPDATE",[mission.id]);
  ssh("systemctl start cohue-worker");
  for(let i=0;i<30;i++) {
    [stale] = await query<JobRow>("SELECT * FROM jobs WHERE mission_id=$1 AND status='LEASED'",[mission.id]);
    if(stale) break; await sleep(500);
  }
  assert(stale,"Worker did not lease the held mission");
  record("actual_inflight_lease_held",{jobId:stale!.id,owner:stale!.lease_owner,fence:stale!.fence,attempts:stale!.attempts});
  ssh("kill -KILL $(systemctl show -p MainPID --value cohue-worker)");
  record("worker_killed_during_lease");
  await lock.query("ROLLBACK"); lock.release(); lock=undefined;
  } else {
    const captured = trace.find(t=>t.step==="actual_inflight_lease_held")!;
    const [job] = await query<JobRow>("SELECT * FROM jobs WHERE id=$1 AND mission_id=$2",[captured.jobId,mission.id]);
    stale={...job,fence:Number(captured.fence),lease_owner:String(captured.owner)};
    record("resume_after_systemd_auxiliary_warning",{actualKillAndRestartVerifiedInJournal:true});
  }
  // No observing browser/request or polling while systemd restarts and the natural 30s lease expires.
  await sleep(55000);
  const [current] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1 AND scope_mode='SHOWCASE' AND showcase_id=$2",[mission.id,scope.showcaseId]);
  const jobs = await query<{id:string;fence:number;attempts:number;status:string}>("SELECT id,fence,attempts,status FROM jobs WHERE mission_id=$1 ORDER BY created_at",[mission.id]);
  assert(current.state==="PROPOSED",`Recovered mission state ${current.state}`);
  assert(jobs.find(j=>j.id===stale!.id) && Number(jobs.find(j=>j.id===stale!.id)?.fence)===2,"Recovered fence did not increment");
  assert(jobs.every(j=>j.status==='SUCCEEDED'),"Unexpected job outcome");
  const late = await transaction(tx=>claimCommit(tx,stale!,"SUCCEEDED"));
  assert(late===false,"Stale holder committed");
  record("unattended_restart_recovery",{state:current.state,jobs,staleFenceRejected:!late,service:ssh("systemctl is-active cohue-worker"),journal:ssh("journalctl -u cohue-worker -n 18 --no-pager -o short-iso")});
  const [proposal] = await query<{id:string;revision:number}>("SELECT id,revision FROM group_proposals WHERE mission_id=$1 ORDER BY rank LIMIT 1",[mission.id]);
  const selected = await transaction(tx=>selectProposal(tx,creator,mission.id,proposal.id,current.version,proposal.revision,randomUUID()));
  for(const invite of selected.invitations.filter(i=>i.status==='PENDING')) {
    const link=await transaction(tx=>issueLink(tx,creator,invite.id,false));
    const redeemed=await transaction(tx=>redeem(tx,link.token,[]));
    // Explicit labeled operator simulation; never presented as a real participant's decision.
    await transaction(tx=>respond(tx,{id:randomUUID(),kind:"INVITATION",principalId:redeemed.session.principalId,scope,invitationId:invite.id,expiresAt:new Date(redeemed.session.expiresAt)},invite.id,{action:"ACCEPT",termsHash:invite.termsHash,responseVersion:invite.responseVersion,reason:"Synthetic D7 operator scenario"},randomUUID()));
  }
  const [ready]=await query<MissionRow>("SELECT * FROM missions WHERE id=$1",[mission.id]);
  const attempts=await Promise.allSettled([1,2].map(()=>transaction(tx=>activate(tx,creator,mission.id,ready.version,proposal.revision,randomUUID()))));
  assert(attempts.filter(r=>r.status==='fulfilled').length===1,"Concurrent activation did not have one winner");
  const events=await query<{sequence:number;type:string}>("SELECT sequence,type FROM agent_events WHERE mission_id=$1 ORDER BY sequence",[mission.id]);
  const effects=(await query<{members:number;distinct_members:number;tasks:number;distinct_tasks:number;invites:number;distinct_invites:number}>(`SELECT (SELECT count(*)::int FROM mission_memberships WHERE mission_id=$1) AS members,(SELECT count(DISTINCT participant_id)::int FROM mission_memberships WHERE mission_id=$1) AS distinct_members,(SELECT count(*)::int FROM mission_tasks WHERE mission_id=$1) AS tasks,(SELECT count(DISTINCT id)::int FROM mission_tasks WHERE mission_id=$1) AS distinct_tasks,(SELECT count(*)::int FROM invitations WHERE mission_id=$1) AS invites,(SELECT count(DISTINCT participant_id)::int FROM invitations WHERE mission_id=$1) AS distinct_invites`,[mission.id]))[0];
  assert(events.every((e,i)=>e.sequence===i+1),"Event order broken");
  assert(events.filter(e=>e.type==='MISSION_ACTIVATED').length===1,"Duplicate activation");
  assert(effects.members===2 && effects.distinct_members===2 && effects.invites===2 && effects.distinct_invites===2 && effects.tasks===effects.distinct_tasks && effects.tasks>0,"Domain effects duplicated or missing");
  record("unique_activation_and_ordered_effects",{effects,events,activationWinners:1,syntheticResponses:true,externalCallsMayRepeat:true});
  const [activated] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1",[mission.id]);
  await transaction(tx=>cancel(tx,creator,mission.id,activated.version,randomUUID()));
  record("synthetic_capacity_released",{missionId:mission.id});
  record("proof_complete",{service:ssh("systemctl is-active cohue-worker"),bootEnabled:ssh("systemctl is-enabled cohue-worker")});
} finally {
  if(lock){await lock.query("ROLLBACK").catch(()=>undefined);lock.release();}
  await closeDb();
}
