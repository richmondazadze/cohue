import "server-only";
import { randomUUID } from "node:crypto";
import { EXECUTION_POLICY } from "@/contracts";
import { query, transaction, type Tx } from "../db/client";
import type { MissionRow } from "../domain/store";

export type Agent = "DIRECTOR" | "SCOUT" | "STRATEGIST" | "COORDINATOR";
export type CheckpointKind = "DIRECTOR" | "SCOUT" | "STRATEGIST" | "COORDINATOR" | "WAIT_FOR_APPROVAL" | "REPLAN";
export type JobRow = {
  id: string;
  mission_id: string;
  scope_mode: string;
  showcase_id: string;
  agent: Agent;
  checkpoint: { kind: CheckpointKind; resumeState: string; runId: string };
  input_version: number;
  status: string;
  lease_owner: string | null;
  fence: number;
  attempts: number;
};

// Enqueued inside the caller's transaction so state, event and next job commit together.
export async function enqueueJob(
  tx: Tx,
  mission: MissionRow,
  agent: Agent,
  kind: CheckpointKind,
  resumeState: string,
): Promise<string> {
  const runId = randomUUID();
  await tx.query(
    `INSERT INTO agent_runs(id, mission_id, scope_mode, showcase_id, agent, status) VALUES ($1,$2,$3,$4,$5,'QUEUED')`,
    [runId, mission.id, mission.scope_mode, mission.showcase_id, agent],
  );
  await tx.query(
    `INSERT INTO jobs(id, mission_id, scope_mode, showcase_id, agent, checkpoint, input_version, status, fence, attempts, next_attempt_at, dedupe_key, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'QUEUED',0,0,now(),$8,now())
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [
      randomUUID(),
      mission.id,
      mission.scope_mode,
      mission.showcase_id,
      agent,
      JSON.stringify({ kind, resumeState, runId }),
      mission.version,
      `${mission.id}:v${mission.version}:${kind}`,
    ],
  );
  return runId;
}

// Lease one ready (or lease-expired) job; the fence increments so a stale holder cannot commit.
export async function leaseJob(owner: string): Promise<JobRow | null> {
  const [job] = await query<JobRow>(
    `UPDATE jobs SET status='LEASED', lease_owner=$1, lease_expires_at=now() + make_interval(secs => $2),
       fence=fence+1, attempts=attempts+1
     WHERE id = (
       SELECT id FROM jobs
       WHERE (status='QUEUED' AND next_attempt_at <= now()) OR (status='LEASED' AND lease_expires_at < now())
       ORDER BY next_attempt_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id, mission_id, scope_mode, showcase_id, agent, checkpoint, input_version, status, lease_owner, fence, attempts`,
    [owner, EXECUTION_POLICY.leaseSeconds],
  );
  return job ?? null;
}

// Within the commit transaction: succeed only if this holder still owns the current fence.
export async function claimCommit(tx: Tx, job: JobRow, status: "SUCCEEDED" | "CANCELLED"): Promise<boolean> {
  const rows = await query(
    `UPDATE jobs SET status=$4, lease_owner=NULL, lease_expires_at=NULL
     WHERE id=$1 AND fence=$2 AND lease_owner=$3 AND status='LEASED' RETURNING id`,
    [job.id, job.fence, job.lease_owner, status],
    tx,
  );
  return rows.length === 1;
}

export async function recordFailure(job: JobRow, message: string): Promise<"RETRY" | "EXHAUSTED"> {
  return transaction(async (tx) => {
    const exhausted = job.attempts >= EXECUTION_POLICY.maxAttempts;
    const delay = EXECUTION_POLICY.retryDelaysSeconds[Math.min(job.attempts - 1, 1)] ?? 10;
    const rows = await query(
      `UPDATE jobs SET status=$4, lease_owner=NULL, lease_expires_at=NULL, last_error=$5,
         next_attempt_at=now() + make_interval(secs => $6)
       WHERE id=$1 AND fence=$2 AND lease_owner=$3 RETURNING id`,
      [job.id, job.fence, job.lease_owner, exhausted ? "FAILED" : "QUEUED", message.slice(0, 300), delay],
      tx,
    );
    return rows.length && exhausted ? "EXHAUSTED" : "RETRY";
  });
}

// Conservatively reserve before network I/O, including attempts that fail, return no hits or crash.
// Counters live in the existing private checkpoint JSON; the mission lock serializes all its jobs.
export async function reserveSearchAttempt(job: JobRow): Promise<boolean> {
  return transaction(async (tx) => {
    const [mission] = await query<{ version: number; state: string }>(
      "SELECT version, state FROM missions WHERE id=$1 AND scope_mode=$2 AND showcase_id=$3 FOR UPDATE",
      [job.mission_id, job.scope_mode, job.showcase_id], tx,
    );
    if (!mission || mission.version !== job.input_version || mission.state !== "DISCOVERING") return false;
    const [current] = await query(
      "SELECT id FROM jobs WHERE id=$1 AND fence=$2 AND lease_owner=$3 AND status='LEASED' FOR UPDATE",
      [job.id, job.fence, job.lease_owner], tx,
    );
    if (!current) return false;
    const [budget] = await query<{ used: number }>(
      "SELECT COALESCE(SUM(COALESCE((checkpoint->>'searchAttempts')::int,0)),0)::int AS used FROM jobs WHERE mission_id=$1 AND scope_mode=$2 AND showcase_id=$3",
      [job.mission_id, job.scope_mode, job.showcase_id], tx,
    );
    if (budget.used >= 3) return false;
    await tx.query(
      "UPDATE jobs SET checkpoint=jsonb_set(checkpoint,'{searchAttempts}',to_jsonb(COALESCE((checkpoint->>'searchAttempts')::int,0)+1)) WHERE id=$1",
      [job.id],
    );
    return true;
  });
}
