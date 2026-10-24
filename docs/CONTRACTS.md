# Shared contracts version 0.1 proposal

Status: reviewable design, not implemented Zod schemas, API routes or database migrations. Lead owns this contract; backend and frontend consume one future `src/contracts` package inside the monolith. User review is required before implementation. IDs are opaque UUID strings; timestamps RFC3339 UTC; language BCP-47; durations integer minutes; intervals half-open [start,end), start < end. Keep original timezone for editing/display. Payloads have explicit bounds and reject unknown command fields.

## Core records and invariants

| Record | Contract fields and rules |
| --- | --- |
| Participant | id, profileVersion, displayName, language, needs, interests, availability[], visibility {publicGraph,discoverable}, participationOptIn, createdAt. Session ownership remains server-only. Availability is explicit UTC intervals plus source timezone; never silently infer that missing availability means free. |
| Capability | id, participantId, normalizedSkillId, category, level?, evidence?, normalizationVersion, confirmedByUser. User confirms semantic normalization; model confidence is not skill evidence. |
| Mission | id, creatorId, objective, state, version, constraintsVersion, executionMode LIVE or SHOWCASE, constraints {minGroupSize,maxGroupSize,minOverlapMinutes,window,preferences}, createdAt. Proposed: creator counts toward team size only if selected as a participating member. |
| Requirement | id, missionId, normalizedSkillId/category, priority REQUIRED or OPTIONAL, minimumCoverage (distinct persons), outcome?, version. Resources have separate kind RESOURCE; public search results do not satisfy required HUMAN skills. |
| Candidate | participantId, profileVersion, coveredRequirementIds, evidenceRefs, deterministic scoreComponents, exclusionReasons. Omit private attributes from public DTOs. |
| Proposal | id, missionId, revision, constraintsVersion, members[{participantId,profileVersion,role,coverage,commitmentTermsHash}], commonWindow, feasibility {status,coverage,violations,searchStats}, algorithmVersion, rationale, createdAt. Immutable snapshot; edits create new revision. |
| Invitation | id, missionId, proposalId, participantId, status PENDING/ACCEPTED/DECLINED/COUNTERPROPOSED/EXPIRED/REVOKED, canonicalTerms, termsHash, expiresAt, responseVersion. Store only token hash; exclude it and plaintext token from events and logs. |
| Response | id, invitationId, participantId, action ACCEPT/DECLINE/COUNTER, reason?, availabilityProposal?, termsHash, idempotencyKey, createdAt. Authenticated invitee only. Counter never equals acceptance. |
| Membership/task | membership unique (missionId,participantId), approvedRole, termsHash, joinedAt; task id, missionId, ownerMembershipId, description, status TODO/IN_PROGRESS/DONE, dueAt?, version. Only room members may mutate authorized task fields. |
| Opportunity | id, missionId, sourceURL (http/https), title, retrievedAt, providerSearchId, relevanceEvidence, verificationStatus PUBLIC_UNVERIFIED. Never a membership or accepted partner. |
| Audio | id, ownerId, purpose, language, status, expiry, private short-lived reference, canonicalTextHash. Proposal: discard raw upload after transcription; synthesized audio TTL 24h; retention policy pending review. |

Logical agents have typed request/output contracts: Director takes confirmed objective/constraints and returns requirements/unknowns; Scout takes gaps and visibility scope and returns internal candidates/public evidence; Strategist takes versioned requirements/candidates and returns feasible proposals or missing coverage/search-limit reason; Coordinator takes selected proposal/current responses and returns created invitations, waiting status, repair command or activation result. Each tool has a server-derived principal, missionId, runId, correlationId, deadline and remaining budget. Tools cannot accept caller-provided authority scopes. `recordConsent` is an authenticated command handler; the agent may observe/request it but cannot manufacture a participant response.

## Lifecycle normalization

Mission states: DRAFT, PLANNING, DISCOVERING, PROPOSED, AWAITING_APPROVAL, REPLANNING, REPROPOSED, ACTIVATED, PAUSED_FOR_HUMAN, FAILED, CANCELLED, EXPIRED. PRD `DECLINED` is proposed as an invitation state/event rather than a mission state: one decline need not discard other accepted commitments. This is a clarification requiring review, not a silent PRD rewrite.

- DRAFT -> PLANNING: creator starts confirmed requirements; enqueue Director transactionally.
- PLANNING -> DISCOVERING: valid requirement set; Scout/Strategist bounded steps.
- DISCOVERING -> PROPOSED: at least one verified feasible configuration.
- PROPOSED -> AWAITING_APPROVAL: selected current proposal and persisted invitations.
- AWAITING_APPROVAL -> REPLANNING: decline, counterproposal, expiration or changed hard constraint invalidates required coverage.
- REPLANNING -> REPROPOSED -> AWAITING_APPROVAL: feasible replacement snapshot and new/retained valid consent records.
- AWAITING_APPROVAL -> ACTIVATED: atomic revalidation succeeds; create memberships, tasks and activation event once.
- Active planning states -> PAUSED_FOR_HUMAN: missing input, exhausted bounded search or unrecoverable ambiguity; explicit authorized correction resumes at recorded checkpoint. No solution is not a provider crash.
- Nonterminal states -> CANCELLED/EXPIRED under authorized cancellation/expiry policy; exhausted recoverable-error budget -> FAILED with reason and retry checkpoint.
- ACTIVATED does not automatically reopen to replan. Proposed initial policy: schedule changes are surfaced for explicit creator/member review; post-activation withdrawal semantics need decision.

Accepted consent carries across revisions only if participant, role, schedule, responsibilities, canonical terms and relevant disclosed group conditions remain unchanged and hard constraints still hold. Otherwise revoke/supersede invitation and request renewed consent. Never keep approval simply because participantId matches.

## HTTP boundaries

All PRD endpoints remain planned. Browser session uses secure HttpOnly SameSite cookie, TLS in deployment, same-origin/CSRF checks for mutations and rate limits. Proposed first-use token exchange establishes a narrow invitation session after explicit redemption; GET does not consume tokens, to tolerate link previews. This is capability-based access to one invite, not proof of real-world identity. Invitation URLs must not enter analytics, referrers or event logs; use no-store and no-referrer. Stronger identity or same-session participant binding is a review decision.

Commands use `Idempotency-Key` for create/start/respond/activate and `expectedVersion` where state is modified. Server scopes keys to principal + operation; store payload digest and result transactionally. Same key/same payload returns prior result; changed payload is 409. Missing permission is 403 (or opaque 404 for private resources), expired/revoked invite 410, invalid input 422, stale revision 409, rate limit 429. Error body: `{error:{code,message,retryable,fieldErrors?},correlationId}`; success `{data,correlationId}`. No provider stack traces or secrets.

| API | Request | Success and authority |
| --- | --- | --- |
| POST /api/participants | confirmed profile and consents | 201 participant plus session cookie; session principal assigned server-side |
| PATCH /api/participants/:id | expectedVersion, editable profile fields | updated scoped participant; invalidate affected proposals/jobs |
| POST /api/missions | objective, language, initial constraints | 201 owned draft with version |
| POST /api/missions/:id/parse | text, language, expectedVersion | reviewable structured extraction and unknowns; never launches automatically |
| PATCH /api/missions/:id | expectedVersion, confirmed requirements/constraints | proposed addition needed for required creator corrections; draft update or new constraints revision |
| POST /api/missions/:id/start | expectedVersion | 202 {missionId,runId,state,version}; enqueued work, not a completion claim |
| GET /api/missions/:id/proposals | current snapshot | ranked feasible proposals and uncovered requirements for authorized creator |
| POST /api/missions/:id/proposals/:proposalId/select | expectedVersion, revision | proposed explicit selection operation; server revalidates then creates invitations |
| GET /api/missions/:id/events | after sequence or Last-Event-ID | authorized SSE or JSON event page; same redacted event contract |
| GET /api/invitations/:token | opaque token | minimal invitation preview; no mutation or broad mission access |
| POST /api/invitations/:token/redeem | explicit redemption | proposed narrow session exchange, hashed token verification and expiry check |
| POST /api/invitations/:token/respond | action, termsHash, responseVersion, counter? | persisted response and new mission version; no caller-supplied participantId authority |
| POST /api/missions/:id/activate | expectedVersion, proposalRevision | current creator/authorized runner command; transactional checks; 409 if approvals/coverage stale |
| GET /api/missions/:id/room | membership scope | approved members/tasks/resources/brief; invited users see only own invitation before activation |
| PATCH /api/missions/:id/tasks/:taskId | expectedVersion, status | proposed addition for required shared mission updates |
| POST /api/missions/:id/retry or cancel | expectedVersion, checkpoint/reason | proposed recovery/cancellation controls for operator/creator; audited |
| POST /api/voice/transcribe | bounded audio upload, purpose, language | transcript only; no consent or launch inferred from speech |
| POST /api/voice/synthesize | authorized invitation/brief id, language | audio reference for approved canonical text; server resolves text |
| GET /api/providers/health | authorized operator or coarse public readiness | redacted configured/degraded/unavailable status; not raw vendor errors |

## Event and realtime contract

`EventV1 = {schemaVersion:1,id,missionId,runId,agent?,type,sequence,missionVersion,proposalRevision?,correlationId,causationId?,occurredAt,status,durationMs?,inputRef?,outputRef?,payload}`. Sequence is strictly increasing per mission; unique (missionId,sequence), allocated under mission row lock. Distinguish persisted domain events from operational logs. Redaction occurs before serialization to the caller; raw transcripts/tool arguments and private candidate attributes are not public events.

Required event families: MISSION_CREATED, EXTRACTION_STARTED/COMPLETED, REQUIREMENT_CREATED/CONFIRMED, AGENT_STARTED/COMPLETED/FAILED, TOOL_STARTED/COMPLETED/FAILED, SCOUT_SEARCH_STARTED, CANDIDATES_FOUND, PROPOSAL_CREATED, INVITATION_SENT/ACCEPTED/DECLINED/COUNTERPROPOSED/EXPIRED/REVOKED, REPLAN_STARTED/COMPLETED, PAUSED_FOR_HUMAN, MISSION_ACTIVATED, TASK_CREATED/UPDATED, PROVIDER_FAILED, MISSION_CANCELLED/EXPIRED. Every displayed execution state corresponds to an actual committed event. INVITATION_SENT means created and made available in-app, not external email delivered; UI copy should say “Invitation ready” unless a delivery integration has proof.

SSE event id = sequence; deduplicate repeated sequences, buffer/re-fetch gaps, replay events after Last-Event-ID. Initial snapshot includes snapshotSequence and missionVersion; subscribe after that cursor. Query server state remains authoritative, Zustand owns camera/panels/selection only. Poll same event endpoint in JSON mode when stream fails (proposed 2 seconds while active, backoff to 10 seconds while waiting/hidden). Reconnect snapshots on authorization change. Server function duration requires reconnect; a stream is not a job runner. Impact/replay uses redacted historical snapshots; live mode cannot be mutated by replay.

Graph DTO: `{snapshotSequence,nodes:[{id,kind:participant|mission|requirement|opportunity,visibility,status,label,evidenceRefs}],edges:[{id,source,target,kind,status,proposalRevision?,eventId}]}`. No client-derived “accepted” edge. Layout positions are client state; graph relations are server projections. Public entry graph exposes only opted-in safe fields; private theater requires authorization.

## Database and runner design

Retain all 14 PRD entities: Participant, Capability, Mission, MissionRequirement, AgentRun, AgentEvent, CandidateMatch, GroupProposal, Invitation, ParticipantResponse, ExternalOpportunity, MissionMembership, MissionTask, AudioArtifact. Add GuestSession, Job, CommandReceipt, and notification outbox as implementation support, not additional product scope. Relationships: session owns participants; creator owns missions; mission owns requirements/proposals/runs/opportunities; proposals link participant snapshots; invitation links proposal and invitee; response links invitation; activated mission owns memberships and tasks. Proposal-member join table carries coverage and consent lineage.

Atomic boundaries: (1) mission + initial event, (2) state/version + next job + events, (3) invitations + outbox + dispatch events, (4) response + receipt + proposal invalidation + replan job, (5) activation + memberships + tasks + event. Use foreign keys, unique invitation revision/member constraints, one membership per mission/person, one receipt per principal/operation/key, unique job dedupe key and event sequence. Index discoverable skills/availability; mission/version/state; invitations by participant/status/expiry; events by mission/sequence; jobs by status/nextAttemptAt.

Job: id, kind, missionId, checkpoint, inputVersion, status, leaseOwner, leaseExpiresAt, attempts, nextAttemptAt, dedupeKey, budgetRemaining. Claim under `FOR UPDATE SKIP LOCKED`, short transaction and fencing/version check on commit. External calls occur outside DB transaction; validated outputs commit only if versions still match. Leases expire for recovery, stale worker cannot commit. Idempotent effects give at-least-once execution; do not claim exactly-once external provider calls. Reuse cached validated provider output with input/version hash; cap retries and reserve budget before issuing calls.

Wake-up decision is mandatory before build: request-triggered bounded ticks plus a real scheduled dispatcher or verified Vultr worker. Polling may safely request a tick for demo progress but cannot guarantee unattended recovery. A database row alone does not schedule execution. Prove background resumption with browsers closed. Expiry sweeper uses same dispatcher; no `setTimeout` survival assumption.

Matching proposal: normalize multilingual skills into confirmed taxonomy, retrieve permitted candidates, then exhaustive bounded subsets/branch-and-bound at demo size. Enforce required distinct-person coverage, common overlap >= minOverlap, min/max distinct members, opt-in and snapshot validity. Rank feasible groups lexicographically by optional coverage, mutual needs benefit, interest relevance, preserved valid commitments, then smaller group and stable ID tie-break; weights and levels need review. A bounded search that stops early returns SEARCH_LIMIT_REACHED, never NO_SOLUTION or an optimum claim. Preserve selected accepted valid commitments as fixed candidates for repair; if infeasible, pause and request an explicit terms change. Reciprocal direct matches/cycles remain required engine outputs, proposed max cycle length 3 for bounded search; cycle membership also requires individual consent. Semantic discovery uses Gemini taxonomy normalization and confirmed skill synonym mappings for initial 30-person data; embeddings/vector search is a proposed later scale choice, not a silently required database extension.
