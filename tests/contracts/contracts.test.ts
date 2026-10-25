import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  AgentEventSchema,
  AudioArtifactSchema,
  EventPageSchema,
  InvitationSchema,
  CommandHeadersSchema,
  CommitmentTermsSchema,
  ConsentLineageSchema,
  GraphSchema,
  GroupProposalSchema,
  IntervalSchema,
  MatchResultSchema,
  MissionConstraintsSchema,
  ProfileInputSchema,
  ResponseCommandSchema,
  ScopeSchema,
  TranscriptionMetadataSchema,
  canonicalTermsJson,
  apiContracts,
} from "@/contracts";
import {
  acceptCommand,
  counterCommand,
  declineCommand,
  draftSnapshot,
  fixtureId,
  fixtureTime,
  fixtureWindow,
  invitation,
  mission,
  participants,
  proposal,
  recordedConsentCases,
  reciprocalCycleFixture,
  regressionParticipants,
  scope,
  searchStats,
  syntheticEvents,
  terms,
  termsHash,
} from "@/fixtures/scenarios";
import manifest from "../../docs/API_OPERATIONS.json";
import { taxonomy } from "@/fixtures/taxonomy";
const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

describe("time, explicit constraints and isolated scope", () => {
  it("rejects zero/reversed availability and invalid timezone", () => {
    for (const value of [
      { ...fixtureWindow, end: fixtureWindow.start },
      { ...fixtureWindow, end: "2026-10-25T13:00:00Z" },
      { ...fixtureWindow, timezone: "Mars/Orbit" },
    ])
      expect(IntervalSchema.safeParse(value).success).toBe(false);
  });
  it("rejects impossible group bounds and overlap without silently defaulting", () => {
    expect(
      MissionConstraintsSchema.safeParse({
        ...mission.constraints,
        minGroupSize: 4,
        maxGroupSize: 3,
      }).success,
    ).toBe(false);
    expect(
      MissionConstraintsSchema.safeParse({
        ...mission.constraints,
        minOverlapMinutes: 121,
      }).success,
    ).toBe(false);
    expect(
      MissionConstraintsSchema.safeParse({
        ...mission.constraints,
        minOverlapMinutes: undefined,
      }).success,
    ).toBe(false);
  });
  it("requires showcase identity and forbids a live scope carrying one", () => {
    expect(
      ScopeSchema.safeParse({
        executionMode: "LIVE",
        showcaseId: fixtureId(900),
      }).success,
    ).toBe(false);
    expect(
      ScopeSchema.safeParse({ executionMode: "SHOWCASE", showcaseId: null })
        .success,
    ).toBe(false);
    expect(
      ScopeSchema.parse({ executionMode: "LIVE", showcaseId: null })
        .executionMode,
    ).toBe("LIVE");
  });
});
describe("consent boundary and canonical identity", () => {
  it("forbids caller-provided authority or an implicit counter acceptance", () => {
    expect(
      ResponseCommandSchema.safeParse({
        ...acceptCommand,
        participantId: fixtureId(20),
      }).success,
    ).toBe(false);
    expect(
      ResponseCommandSchema.safeParse({
        ...counterCommand,
        availabilityProposal: undefined,
      }).success,
    ).toBe(false);
    expect(
      ResponseCommandSchema.safeParse({
        ...acceptCommand,
        availabilityProposal: [fixtureWindow],
      }).success,
    ).toBe(false);
    expect(ResponseCommandSchema.parse(counterCommand).action).toBe("COUNTER");
    expect(ResponseCommandSchema.parse(declineCommand).action).toBe("DECLINE");
  });
  it("binds exact terms but ignores object/group ordering and Unicode composition", () => {
    expect(hash(canonicalTermsJson(terms))).toBe(termsHash);
    expect(
      canonicalTermsJson({
        ...terms,
        disclosedGroup: [...terms.disclosedGroup].reverse(),
      }),
    ).toBe(canonicalTermsJson(terms));
    expect(canonicalTermsJson({ ...terms, objective: "Caf\u00e9" })).toBe(
      canonicalTermsJson({ ...terms, objective: "Cafe\u0301" }),
    );
    for (const changed of [
      {
        ...terms,
        role: "Researcher",
        disclosedGroup: terms.disclosedGroup.map((m) =>
          m.participantId === terms.participantId
            ? { ...m, role: "Researcher" }
            : m,
        ),
      },
      { ...terms, schedule: { ...fixtureWindow, end: "2026-10-25T15:00:00Z" } },
      { ...terms, disclosedGroup: terms.disclosedGroup.slice(0, 2) },
    ])
      expect(hash(canonicalTermsJson(changed))).not.toBe(termsHash);
  });
  it("requires carry-forward to a newer revision with unchanged hash", () => {
    expect(
      ConsentLineageSchema.parse(recordedConsentCases.unchanged.lineage)
        .termsHash,
    ).toBe(termsHash);
    expect(
      hash(canonicalTermsJson(recordedConsentCases.changedTerms)),
    ).not.toBe(termsHash);
    expect(
      ConsentLineageSchema.safeParse({
        ...recordedConsentCases.unchanged.lineage,
        carriedToProposalRevision: 1,
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate proposal membership and cross-mission terms", () => {
    expect(
      GroupProposalSchema.safeParse({
        ...proposal,
        members: [proposal.members[0], proposal.members[0]],
      }).success,
    ).toBe(false);
    expect(
      GroupProposalSchema.safeParse({ ...proposal, missionId: fixtureId(999) })
        .success,
    ).toBe(false);
  });
  it("rejects arbitrary idempotency header material", () => {
    expect(
      CommandHeadersSchema.safeParse({ "idempotency-key": "short" }).success,
    ).toBe(false);
    expect(
      CommandHeadersSchema.safeParse({
        "idempotency-key": "a".repeat(20),
        authorization: "unexpected",
      }).success,
    ).toBe(false);
  });
});
describe("truthful events, graph and media projections", () => {
  it("supports mission creation before a real agent run exists", () => {
    expect(AgentEventSchema.parse(syntheticEvents[0]).runId).toBe(null);
    expect(
      AgentEventSchema.safeParse({
        ...syntheticEvents[0],
        runId: fixtureId(999),
      }).success,
    ).toBe(false);
    expect(
      AgentEventSchema.safeParse({ ...syntheticEvents[1], runId: null })
        .success,
    ).toBe(false);
  });
  it("rejects unreviewed payload fields and inconsistent invitation status", () => {
    expect(
      AgentEventSchema.safeParse({
        ...syntheticEvents[0],
        payload: { state: "DRAFT", token: "secret" },
      }).success,
    ).toBe(false);
    expect(
      AgentEventSchema.safeParse({
        ...syntheticEvents[4],
        payload: {
          ...syntheticEvents[4].payload,
          invitationStatus: "ACCEPTED",
        },
      }).success,
    ).toBe(false);
  });
  it("forbids external opportunities shown as accepted people and dangling relations", () => {
    expect(
      GraphSchema.safeParse({
        ...draftSnapshot.graph,
        nodes: [
          {
            id: fixtureId(900),
            kind: "opportunity",
            label: "Public opportunity",
            status: "ACCEPTED",
            evidenceRefs: [],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      GraphSchema.safeParse({
        ...draftSnapshot.graph,
        edges: [
          {
            id: fixtureId(900),
            source: mission.id,
            target: fixtureId(999),
            kind: "CANDIDATE",
            status: "SUGGESTED",
            proposalRevision: null,
            eventId: null,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects mixed-scope, reversed and skipped-cursor event pages", () => {
    const page = {
      scope,
      events: syntheticEvents.slice(0, 2),
      nextSequence: 2,
      hasMore: false,
      accessEpoch: 1,
    };
    expect(EventPageSchema.parse(page).events).toHaveLength(2);
    expect(
      EventPageSchema.safeParse({
        ...page,
        scope: { executionMode: "LIVE", showcaseId: null },
      }).success,
    ).toBe(false);
    expect(
      EventPageSchema.safeParse({ ...page, events: [...page.events].reverse() })
        .success,
    ).toBe(false);
    expect(
      EventPageSchema.safeParse({ ...page, nextSequence: 99 }).success,
    ).toBe(false);
  });
  it("rejects bearer material or mismatched consent hashes in invitation DTOs", () => {
    expect(
      InvitationSchema.safeParse({ ...invitation, hashedToken: "private" })
        .success,
    ).toBe(false);
    expect(
      InvitationSchema.safeParse({
        ...invitation,
        lineage: {
          ...recordedConsentCases.unchanged.lineage,
          termsHash: "b".repeat(64),
        },
      }).success,
    ).toBe(false);
  });
  it("bounds media and only exposes local authenticated ready-audio paths", () => {
    expect(
      TranscriptionMetadataSchema.safeParse({
        purpose: "MISSION",
        language: "en",
        mimeType: "audio/webm",
        sizeBytes: 3000001,
        durationMs: 1000,
      }).success,
    ).toBe(false);
    expect(
      TranscriptionMetadataSchema.safeParse({
        purpose: "MISSION",
        language: "en",
        mimeType: "text/html",
        sizeBytes: 100,
        durationMs: 1000,
      }).success,
    ).toBe(false);
    expect(
      AudioArtifactSchema.safeParse({
        id: fixtureId(1),
        ownerId: fixtureId(2),
        scope,
        purpose: "MISSION",
        language: "en",
        canonicalTextHash: null,
        status: "READY",
        expiresAt: fixtureTime,
        accessPath: "https://unsafe.example/audio",
      }).success,
    ).toBe(false);
  });
});
describe("matching evidence and fixture integrity", () => {
  it("never labels an incomplete search as proven no-solution", () => {
    const limited = {
      ...searchStats,
      complete: false,
      stoppedBecause: "NODE_LIMIT",
    };
    expect(
      MatchResultSchema.safeParse({
        feasibility: "NO_SOLUTION",
        proposals: [],
        uncoveredRequirementIds: [],
        search: limited,
      }).success,
    ).toBe(false);
    expect(
      MatchResultSchema.parse({
        feasibility: "SEARCH_LIMIT_REACHED",
        proposals: [],
        uncoveredRequirementIds: [fixtureId(102)],
        search: limited,
      }).feasibility,
    ).toBe("SEARCH_LIMIT_REACHED");
    expect(
      MatchResultSchema.safeParse({
        feasibility: "FEASIBLE",
        proposals: [],
        uncoveredRequirementIds: [],
        search: searchStats,
      }).success,
    ).toBe(false);
  });
  it("has 30 synthetic isolated people, a 20-person subset and known eligibility failures", () => {
    expect(participants).toHaveLength(30);
    expect(regressionParticipants).toHaveLength(20);
    expect(new Set(participants.map((p) => p.id)).size).toBe(30);
    expect(
      participants.every(
        (p) =>
          p.displayName.startsWith("Synthetic ") &&
          p.scope.executionMode === "SHOWCASE",
      ),
    ).toBe(true);
    expect(participants[27].availability).toEqual([]);
    expect(participants[28].visibility.discoverable).toBe(false);
    expect(participants[29].participationOptIn).toBe(false);
    expect(new Set(participants.map((p) => p.language))).toEqual(
      new Set(["en", "es", "fr"]),
    );
  });
  it("fixtures use known normalized skills, distinct memberships and correctly hashed terms", () => {
    const skills = new Set(taxonomy.skills.map((s) => s.id));
    expect(
      participants.every((p) =>
        p.capabilities.every((c) => skills.has(c.normalizedSkillId)),
      ),
    ).toBe(true);
    expect(proposal.members).toHaveLength(3);
    for (const member of proposal.members)
      expect(hash(canonicalTermsJson(member.terms))).toBe(member.termsHash);
    expect(CommitmentTermsSchema.parse(invitation.terms).participantId).toBe(
      invitation.participantId,
    );
  });
  it("supplies an actual directed three-person capability/need cycle for backend regression", () => {
    expect(reciprocalCycleFixture.directedEdges).toHaveLength(3);
    for (const edge of reciprocalCycleFixture.directedEdges) {
      const from = participants.find((p) => p.id === edge.from)!;
      const to = participants.find((p) => p.id === edge.to)!;
      expect(from.needs).toContain(edge.need);
      expect(to.capabilities.map((c) => c.normalizedSkillId)).toContain(
        edge.need,
      );
    }
  });
  it("fixtures have strictly ordered scoped events and versioned snapshots", () => {
    expect(syntheticEvents.map((e) => e.sequence)).toEqual(
      Array.from({ length: 24 }, (_, i) => i + 1),
    );
    expect(
      syntheticEvents.every((e) => e.scope.executionMode === "SHOWCASE"),
    ).toBe(true);
    expect(draftSnapshot.snapshotSequence).toBe(
      draftSnapshot.graph.snapshotSequence,
    );
  });
});
describe("consumer-facing API contracts", () => {
  it("binds create and scoped response operations to the published schemas", () => {
    expect(
      apiContracts.createParticipant.input.safeParse({
        ...participants[0],
        id: undefined,
      }).success,
    ).toBe(false);
    expect(
      ProfileInputSchema.safeParse({
        displayName: "Synthetic",
        language: "en",
        needs: [],
        interests: [],
        availability: [],
        capabilities: [],
        visibility: { publicGraph: false, discoverable: false },
        participationOptIn: false,
      }).success,
    ).toBe(true);
    expect(apiContracts.respondInvitation.input.parse(acceptCommand)).toEqual(
      acceptCommand,
    );
    expect(apiContracts.respondInvitation.auth).toBe("INVITATION");
    expect(apiContracts.startMission.status).toBe(202);
    expect(
      apiContracts.respondInvitation.params.safeParse({ id: "not-a-uuid" })
        .success,
    ).toBe(false);
    expect(
      apiContracts.previewInvitation.params.safeParse({ token: "short" })
        .success,
    ).toBe(false);
  });
  it("keeps the exported API operation manifest synchronized with executable contracts", () => {
    expect(manifest.contractVersion).toBe("1.1.0");
    expect(manifest.operations).toEqual(
      Object.entries(apiContracts).map(
        ([name, { method, path, auth, status, idempotentCommand }]) => ({
          name,
          method,
          path,
          auth,
          status,
          idempotentCommand,
        }),
      ),
    );
  });
  it("publishes snapshot/network/inbox, recovery, review, delete and media boundaries", () => {
    for (const key of [
      "snapshot",
      "network",
      "inbox",
      "cancelMission",
      "retryMission",
      "resumeMission",
      "requestReview",
      "updateReview",
      "deleteParticipant",
      "transcribe",
      "synthesize",
      "replay",
    ] as const)
      expect(apiContracts[key]).toBeDefined();
    expect(
      apiContracts.previewInvitation.response.safeParse({
        data: { ...invitation },
        correlationId: fixtureId(900),
      }).success,
    ).toBe(false);
  });
});

describe("review-only extraction before persistence", () => {
  it("never lets profile extraction claim visibility or participation consent", () => {
    expect(
      apiContracts.parseProfile.response.safeParse({
        data: {
          profile: { visibility: { publicGraph: true, discoverable: true } },
          capabilities: [],
          unknowns: [],
          requiresConfirmation: true,
        },
        correlationId: fixtureId(900),
      }).success,
    ).toBe(false);
    expect(
      apiContracts.parseProfile.response.parse({
        data: {
          profile: { language: "es" },
          capabilities: [],
          unknowns: ["Availability is missing"],
          requiresConfirmation: true,
        },
        correlationId: fixtureId(900),
      }).data.requiresConfirmation,
    ).toBe(true);
  });
  it("represents unknown mission constraints without claiming a valid launch", () => {
    const extracted = {
      objective: "Build a prototype",
      expectedOutput: null,
      requirements: [],
      constraintsDraft: {},
      unknowns: ["Choose time and team bounds"],
      requiresConfirmation: true,
    };
    expect(
      apiContracts.extractMission.response.safeParse({
        data: extracted,
        correlationId: fixtureId(900),
      }).success,
    ).toBe(true);
    expect(apiContracts.createMission.input.safeParse(extracted).success).toBe(
      false,
    );
  });
});

describe("invitation share-link disclosure (contract 1.1.0)", () => {
  const token = "a".repeat(43);
  it("issues a bearer link only through the owner command, never in invitation DTOs", () => {
    const op = apiContracts.issueInvitationLink;
    expect([
      op.method,
      op.path,
      op.auth,
      op.status,
      op.idempotentCommand,
    ]).toEqual(["POST", "/api/invitations/:id/link", "OWNER", 200, true]);
    expect(op.params.safeParse({ id: invitation.id }).success).toBe(true);
    expect(op.params.safeParse({ id: token }).success).toBe(false);
    expect(op.input.safeParse({}).success).toBe(false);
    expect(
      op.response.safeParse({
        data: {
          invitationId: invitation.id,
          token,
          linkEpoch: 1,
          expiresAt: invitation.expiresAt,
        },
        correlationId: fixtureId(900),
      }).success,
    ).toBe(true);
    expect(InvitationSchema.safeParse({ ...invitation, token }).success).toBe(
      false,
    );
  });
  it("rejects short or non-url-safe tokens", () => {
    for (const bad of ["short", `${"a".repeat(40)}/+=`])
      expect(
        apiContracts.issueInvitationLink.response.safeParse({
          data: {
            invitationId: invitation.id,
            token: bad,
            linkEpoch: 1,
            expiresAt: invitation.expiresAt,
          },
          correlationId: fixtureId(900),
        }).success,
      ).toBe(false);
  });
});

describe("replay query coercion", () => {
  it("accepts the query-string sequence a GET request carries", () => {
    expect(apiContracts.replay.input.parse({ atSequence: "7" })).toEqual({
      atSequence: 7,
    });
    expect(
      apiContracts.replay.input.safeParse({ atSequence: "-1" }).success,
    ).toBe(false);
  });
});


describe("creator invitation translation review", () => {
  it("adds a narrow owner read without widening invite-session detail", () => {
    expect(apiContracts.getInvitationForReview.method).toBe("GET");
    expect(apiContracts.getInvitationForReview.path).toBe("/api/invitations/:id/review");
    expect(apiContracts.getInvitationForReview.auth).toBe("OWNER");
    expect(apiContracts.getInvitation.auth).toBe("INVITATION");
    expect(apiContracts.getInvitationForReview.input.safeParse({ token: "unexpected" }).success).toBe(false);
    expect(apiContracts.getInvitationForReview.params.safeParse({ id: "invalid" }).success).toBe(false);
  });
});
