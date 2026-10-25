import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

// Real PostgreSQL (isolated test database). Skips with a reason when COHUE_TEST_DATABASE_URL is absent.
const url = process.env.COHUE_TEST_DATABASE_URL;
process.env.DATABASE_URL = url ?? "";
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret";

describe.skipIf(!url)("leased runner on PostgreSQL", () => {
  let mod: {
    db: typeof import("@/server/db/client");
    jobs: typeof import("@/server/runner/jobs");
    steps: typeof import("@/server/runner/steps");
    sessions: typeof import("@/server/auth/sessions");
    participants: typeof import("@/server/domain/participants");
    missions: typeof import("@/server/domain/missions/service");
  };
  beforeAll(async () => {
    mod = {
      db: await import("@/server/db/client"),
      jobs: await import("@/server/runner/jobs"),
      steps: await import("@/server/runner/steps"),
      sessions: await import("@/server/auth/sessions"),
      participants: await import("@/server/domain/participants"),
      missions: await import("@/server/domain/missions/service"),
    };
  });
  afterAll(async () => mod?.db.closeDb());

  it("recovers an expired lease, fences the stale holder and commits ordered events once", async () => {
    const { db, jobs, steps, sessions, participants, missions } = mod;
    const scope = { executionMode: "LIVE", showcaseId: null } as const;
    const start = new Date(Date.now() + 2 * 3600_000);
    start.setUTCMinutes(0, 0, 0);
    const window = { start: start.toISOString().replace(".000Z", "Z"), end: new Date(start.getTime() + 2 * 3600_000).toISOString().replace(".000Z", "Z"), timezone: "UTC" };
    const missionId = await db.transaction(async (tx) => {
      const { session } = await sessions.createSessionRecord(tx, { kind: "GUEST", principalId: randomUUID(), scope, invitationId: null, expiresAt: new Date(Date.now() + 3600_000) });
      await participants.createParticipant(tx, session, {
        displayName: "runner-test creator",
        language: "en",
        needs: [],
        interests: [],
        availability: [window],
        capabilities: [{ normalizedSkillId: "research", category: "research", level: 5, evidence: null, confirmedByUser: true, normalizationVersion: "taxonomy-1" }],
        visibility: { publicGraph: false, discoverable: false },
        participationOptIn: false,
      });
      const m = await missions.createMission(tx, session, {
        objective: "Runner fencing test",
        expectedOutput: "One ordered proposal",
        language: "en",
        constraints: { minGroupSize: 1, maxGroupSize: 1, minOverlapMinutes: 60, window, creatorParticipates: true, preferences: [] },
        requirements: [{ kind: "HUMAN", normalizedSkillId: "research", category: "research", priority: "REQUIRED", minimumCoverage: 1, minimumLevel: 4, outcome: null }],
      }, randomUUID());
      await missions.startMission(tx, session, m.id, m.version);
      return m.id;
    });

    // Holder A leases the first job and "crashes" before committing.
    let stale = await jobs.leaseJob("00000000-0000-4000-8000-00000000000a");
    while (stale && stale.mission_id !== missionId) stale = await jobs.leaseJob("00000000-0000-4000-8000-00000000000a");
    expect(stale?.mission_id).toBe(missionId);
    await db.query("UPDATE jobs SET lease_expires_at = now() - interval '1 second' WHERE id=$1", [stale!.id]);

    // Holder B takes over the expired lease and drives the mission to a proposal with no client attached.
    for (let i = 0; i < 20; i++) {
      const [m] = await db.query<{ state: string }>("SELECT state FROM missions WHERE id=$1", [missionId]);
      if (m.state === "PROPOSED") break;
      await steps.runOne("00000000-0000-4000-8000-00000000000b");
    }
    const [mission] = await db.query<{ state: string }>("SELECT state FROM missions WHERE id=$1", [missionId]);
    expect(mission.state).toBe("PROPOSED");

    // The stale holder's late commit is rejected by the fence.
    const late = await db.transaction((tx) => jobs.claimCommit(tx, stale!, "SUCCEEDED"));
    expect(late).toBe(false);

    const events = await db.query<{ sequence: number; type: string }>("SELECT sequence, type FROM agent_events WHERE mission_id=$1 ORDER BY sequence", [missionId]);
    expect(events.map((e) => e.sequence)).toEqual(events.map((_, i) => i + 1));
    expect(events.filter((e) => e.type === "AGENT_STARTED" && events.length)).toHaveLength(1);
    expect(events.filter((e) => e.type === "PROPOSAL_CREATED").length).toBeGreaterThanOrEqual(1);
    const succeeded = await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM jobs WHERE mission_id=$1 AND status='SUCCEEDED'", [missionId]);
    expect(succeeded[0].n).toBe(3);
  });
});
