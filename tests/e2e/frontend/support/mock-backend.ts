import type { Page, Route } from "@playwright/test";
import {
  INITIAL_TAXONOMY,
  apiContracts,
  type ApiOperation,
  type AgentEvent,
  type Invitation,
  type ApiOutput,
} from "@/contracts";
import {
  fixtureId,
  fixtureTime,
  mission as fixtureMission,
  participants,
  proposal,
  scope,
} from "./mock-data";

// UI-only harness: a contract-validated, in-memory stand-in for the backend, clearly fixture data.
// It proves the frontend loop renders and sends registry-correct commands. It is NOT integration evidence.

type Json = Record<string, unknown>;
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const TOKEN = "T".repeat(20) + "mockShareToken_abcdefghijk";

export class MockBackend {
  session: Json | null = null;
  mission = { ...fixtureMission };
  events: AgentEvent[] = [];
  invitations: Invitation[] = [];
  localizations: ApiOutput<"getInvitation">["data"]["localized"] = [];
  approvals = { required: 0, accepted: 0 };
  taskVersion = 1;
  taskStatus: "TODO" | "IN_PROGRESS" | "DONE" = "TODO";
  staleOnce = true;
  commands: { op: ApiOperation; key: string | null; body: unknown }[] = [];
  names = new Map(participants.slice(0, 4).map((p, i) => [p.id, ["Maya Chen", "Sofía Ruiz", "Luc Martin", "Ada Obi"][i]]));

  private event(type: AgentEvent["type"], payload: Json, extra: Json = {}) {
    const seq = this.events.length + 1;
    this.events.push({
      schemaVersion: 1,
      id: fixtureId(5000 + seq),
      missionId: this.mission.id,
      scope,
      runId: null,
      agent: null,
      sequence: seq,
      missionVersion: this.mission.version,
      proposalRevision: null,
      correlationId: fixtureId(800),
      causationId: null,
      occurredAt: now(),
      status: "SUCCEEDED",
      durationMs: null,
      type,
      payload,
      ...extra,
    } as AgentEvent);
  }

  private bump(state: typeof fixtureMission.state) {
    this.mission = { ...this.mission, state, version: this.mission.version + 1 };
  }

  snapshot() {
    const seq = this.events.length;
    const proposed = this.mission.state !== "DRAFT" && this.mission.state !== "PLANNING";
    const statusOf = (pid: string) =>
      this.invitations.find((i) => i.participantId === pid)?.status ?? "SUGGESTED";
    const nodes = [
      { id: this.mission.id, kind: "mission", label: "Repair café", status: this.mission.state === "ACTIVATED" ? "ACTIVATED" : "SUGGESTED", evidenceRefs: [] },
      ...this.mission.requirements.map((r) => ({ id: r.id, kind: "requirement", label: r.normalizedSkillId, status: proposed ? "SUGGESTED" : "UNCOVERED", evidenceRefs: [] })),
      ...(proposed
        ? proposal.members.map((m) => ({ id: m.participantId, kind: "participant", label: this.names.get(m.participantId) ?? "Person", status: statusOf(m.participantId) === "SUGGESTED" ? "SUGGESTED" : statusOf(m.participantId), evidenceRefs: [] }))
        : []),
    ];
    const edges = proposed
      ? proposal.members.map((m, i) => ({ id: fixtureId(6000 + i), source: this.mission.id, target: m.participantId, kind: "CANDIDATE", status: statusOf(m.participantId) === "SUGGESTED" ? "SUGGESTED" : statusOf(m.participantId), proposalRevision: 1, eventId: null }))
      : [];
    return {
      scope,
      snapshotSequence: seq,
      mission: this.mission,
      graph: { snapshotSequence: seq, nodes, edges },
      proposals: proposed ? [proposal] : [],
      opportunities: [],
      approvals: this.approvals,
      receivedAt: now(),
    };
  }

  private handle(op: ApiOperation, params: Record<string, string>, body: Json, query: URLSearchParams): [number, unknown] {
    switch (op) {
      case "taxonomy":
        return [200, INITIAL_TAXONOMY];
      case "getSession":
        return this.session ? [200, this.session] : [401, err("UNAUTHENTICATED")];
      case "createSession":
        this.session = { principalId: fixtureId(990), kind: "GUEST", scope, invitationId: null, expiresAt: "2026-12-01T00:00:00Z" };
        return [201, this.session];
      case "createParticipant":
        return [201, { ...participants[0], ...body, id: participants[0].id, profileVersion: 1, scope, createdAt: fixtureTime }];
      case "getParticipant":
        return [200, participants[0]];
      case "inbox":
        return [200, { scope, invitations: this.invitations.filter((i) => i.participantId === participants[0].id), nextCursor: null }];
      case "createMission":
        this.mission = { ...fixtureMission, objective: String(body.objective), expectedOutput: String(body.expectedOutput) };
        this.event("MISSION_CREATED", { state: "DRAFT" });
        return [201, this.mission];
      case "startMission":
        if (body.expectedVersion !== this.mission.version) return [409, err("STALE_VERSION")];
        this.bump("PLANNING");
        this.event("AGENT_STARTED", { operation: "search opted-in people", evidenceIds: [] }, { runId: fixtureId(700), agent: "SCOUT", status: "STARTED" });
        return [202, { missionId: this.mission.id, runId: fixtureId(700), state: "PLANNING", version: this.mission.version }];
      case "snapshot":
        return [200, this.snapshot()];
      case "events": {
        const after = Number(query.get("after") ?? 0);
        const evs = this.events.filter((e) => e.sequence > after);
        return [200, { scope, events: evs, nextSequence: evs.length ? evs[evs.length - 1].sequence : after, hasMore: false, accessEpoch: 1 }];
      }
      case "proposals":
        return [200, { feasibility: "FEASIBLE", proposals: [proposal], uncoveredRequirementIds: [], search: proposal.search }];
      case "selectProposal": {
        this.bump("AWAITING_APPROVAL");
        this.invitations = proposal.members.map((m, i) => ({
          id: fixtureId(200 + i), missionId: this.mission.id, proposalId: proposal.id, proposalRevision: 1, participantId: m.participantId,
          scope, language: ["en", "es", "fr"][i], status: "PENDING", terms: m.terms, termsHash: m.termsHash, responseVersion: 1,
          expiresAt: "2026-12-01T00:00:00Z", lineage: null,
        }));
        this.approvals = { required: 3, accepted: 0 };
        for (const inv of this.invitations)
          this.event("INVITATION_SENT", { invitationId: inv.id, participantId: inv.participantId, invitationStatus: "PENDING" }, { proposalRevision: 1 });
        return [201, { mission: this.mission, proposal, invitations: this.invitations }];
      }
      case "issueInvitationLink":
        return [200, { invitationId: params.id, token: TOKEN + params.id.slice(-2), linkEpoch: 1, expiresAt: "2026-12-01T00:00:00Z" }];
      case "previewInvitation":
        return [200, { invitationId: this.invitations[1].id, language: "es", expiresAt: "2026-12-01T00:00:00Z", accessNotice: "BEARER_LINK_ONE_INVITATION", available: true }];
      case "redeemInvitation": {
        const inv = this.invitations[1];
        this.session = { principalId: fixtureId(991), kind: "INVITATION", scope, invitationId: inv.id, expiresAt: "2026-12-01T00:00:00Z" };
        return [200, { session: this.session, invitation: inv }];
      }
      case "getInvitationForReview": {
        const inv = this.invitations.find((i) => i.id === params.id);
        return inv ? [200, { invitation: inv, localized: this.localizations.filter((l) => l.sourceId === inv.id) }] : [404, err("NOT_FOUND")];
      }
      case "approveLocalization": {
        const item = this.localizations.find((l) => l.id === params.id);
        if (!item) return [404, err("NOT_FOUND")];
        if (item.version !== body.expectedVersion) return [409, err("STALE_VERSION")];
        item.text = String(body.text);
        item.status = "APPROVED";
        item.version++;
        return [200, item];
      }
      case "synthesize":
        return [503, err("PROVIDER_UNAVAILABLE")];
      case "getInvitation": {
        const inv = this.invitations.find((i) => i.id === params.id);
        return inv ? [200, { invitation: inv, localized: [] }] : [404, err("NOT_FOUND")];
      }
      case "respondInvitation": {
        const idx = this.invitations.findIndex((i) => i.id === params.id);
        const inv = this.invitations[idx];
        const status = body.action === "ACCEPT" ? "ACCEPTED" : body.action === "DECLINE" ? "DECLINED" : "COUNTERPROPOSED";
        const updated = { ...inv, status, responseVersion: inv.responseVersion + 1 } as Invitation;
        this.invitations[idx] = updated;
        if (status === "ACCEPTED") this.approvals = { ...this.approvals, accepted: this.approvals.accepted + 1 };
        this.event(`INVITATION_${status}` as AgentEvent["type"], { invitationId: inv.id, participantId: inv.participantId, invitationStatus: status }, { proposalRevision: 1 });
        return [200, {
          response: { id: fixtureId(250 + idx), invitationId: inv.id, participantId: inv.participantId, action: body.action, termsHash: inv.termsHash, responseVersion: inv.responseVersion, reason: (body.reason as string) ?? null, availabilityProposal: (body.availabilityProposal as never) ?? null, createdAt: now() },
          invitation: updated, missionState: this.mission.state, missionVersion: this.mission.version,
        }];
      }
      case "activateMission":
        if (this.approvals.accepted !== this.approvals.required) return [409, err("STALE_VERSION")];
        this.bump("ACTIVATED");
        this.event("MISSION_ACTIVATED", { membershipIds: [fixtureId(300), fixtureId(301), fixtureId(302)], taskIds: [fixtureId(400)] });
        return [200, this.room()];
      case "room":
        return this.mission.state === "ACTIVATED" ? [200, this.room()] : [403, err("FORBIDDEN")];
      case "kickoffPlan": {
        if (this.mission.state !== "ACTIVATED") return [403, err("FORBIDDEN")];
        const roles = this.room().memberships.map((m) => m.approvedRole);
        return [200, {
          language: query.get("language") ?? "en",
          steps: roles.map((role) => ({ role, action: `Share your first idea for ${role.toLowerCase()} (fixture plan).` })),
          checkIn: "Start with a five-minute round of introductions (fixture plan).",
          drafter: "GEMINI",
        }];
      }
      case "updateTask":
        if (this.staleOnce) {
          this.staleOnce = false;
          this.taskVersion++;
          this.taskStatus = "IN_PROGRESS";
          return [409, err("STALE_VERSION")];
        }
        if (body.expectedVersion !== this.taskVersion) return [409, err("STALE_VERSION")];
        this.taskVersion++;
        this.taskStatus = body.status as typeof this.taskStatus;
        return [200, this.room().tasks[0]];
      default:
        return [404, err("NOT_FOUND")];
    }
  }

  room(): ApiOutput<"room">["data"] {
    const memberships = proposal.members.map((m, i) => ({
      id: fixtureId(300 + i), missionId: this.mission.id, participantId: m.participantId, approvedRole: m.role,
      termsHash: m.termsHash, invitationId: fixtureId(200 + i), responseId: fixtureId(250 + i), joinedAt: fixtureTime,
    }));
    return {
      mission: this.mission,
      memberships,
      tasks: [{ id: fixtureId(400), missionId: this.mission.id, ownerMembershipId: fixtureId(301), description: "Sketch the accessible interface", status: this.taskStatus, dueAt: null, version: this.taskVersion }],
      opportunities: [], briefs: this.localizations.filter((l) => l.sourceId === this.mission.id), reviews: [],
    };
  }

  async install(page: Page) {
    const routes = (Object.keys(apiContracts) as ApiOperation[]).map((op) => {
      const c = apiContracts[op];
      const re = new RegExp(`^${c.path.replace(/:([A-Za-z]+)/g, "(?<$1>[^/]+)")}$`);
      return { op, method: c.method, re };
    });
    await page.route("**/api/**", async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      // More specific literal routes first (e.g. /invitations/:id/detail before /invitations/:token).
      const match = routes
        .filter((r) => r.method === req.method())
        .map((r) => ({ r, m: r.re.exec(url.pathname) }))
        .filter((x) => x.m)
        .sort((a, b) => b.r.re.source.length - a.r.re.source.length)[0];
      if (!match) return route.fulfill({ status: 404, json: err("NOT_FOUND") });
      const { op } = match.r;
      const params = { ...(match.m?.groups ?? {}) } as Record<string, string>;
      const body = req.postData() ? (JSON.parse(req.postData() as string) as Json) : {};
      const contract = apiContracts[op];
      const key = req.headers()["idempotency-key"] ?? null;
      if (contract.idempotentCommand) {
        this.commands.push({ op, key, body });
        if (!key) return route.fulfill({ status: 422, json: err("INVALID_INPUT") });
      }
      const [status, data] = this.handle(op, params, body, url.searchParams);
      if (status >= 300) return route.fulfill({ status, json: data });
      const envelope = { data, correlationId: fixtureId(900) };
      const valid = contract.response.safeParse(envelope);
      if (!valid.success) throw new Error(`mock ${op} violates contract: ${valid.error.message.slice(0, 400)}`);
      return route.fulfill({ status, json: envelope });
    });
  }

  /** The composer is locked until someone says who is organizing; tests start as a quick organizer. */
  async organize(page: Page, username = "test_organizer") {
    await page.locator("#quick-username").fill(username);
    await page.getByRole("button", { name: "Continue as organizer" }).click();
    await page.getByText("Who's organizing?").waitFor({ state: "detached" });
  }

  /** Simulate the server's planner finishing discovery (a committed event, not a UI timer). */
  completeDiscovery() {
    this.bump("PROPOSED");
    this.event("AGENT_COMPLETED", { operation: "search opted-in people", evidenceIds: [] }, { runId: fixtureId(700), agent: "SCOUT" });
    this.event("PROPOSAL_CREATED", { proposalId: proposal.id }, { proposalRevision: 1 });
  }

  acceptOthers() {
    for (const inv of this.invitations)
      if (inv.status === "PENDING")
        this.handle("respondInvitation", { id: inv.id }, { action: "ACCEPT" }, new URLSearchParams());
  }
}

function err(code: string) {
  return { error: { code, message: `Mock ${code.toLowerCase()}`, retryable: false }, correlationId: fixtureId(901) };
}
