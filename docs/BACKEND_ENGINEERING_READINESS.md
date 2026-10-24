# Backend Engineering Readiness Report

24 October 2026, 17:41 CDT. Audit baseline: local `main`, preceding commit `a406a64`; working tree clean before this milestone, no Git remote configured. Status: backend initialization and planning complete; application implementation, infrastructure provisioning and integration execution remain on hold.

## Scope and evidence

The user’s complete request is retained in [BACKEND_INITIALIZATION_REQUEST.md](reference/BACKEND_INITIALIZATION_REQUEST.md). This assignment authorizes a repository/PRD audit, implementation plan and synchronized handoff update, not feature development. This chat assumes the backend role for that audit; no other engineer, subagent or chat was activated or messaged.

Reviewed all 21 sections of the retained Master Plan v1.0 through its complete adjacent extraction; AGENTS.md, CLAUDE.md, both synchronized handoffs, ENGINEERING_READINESS.md, CONTRACTS.md, WORKSTREAMS.md, orchestration evaluation, open-source assessment and approved Design System v1.0/approval provenance. The DOCX remains the product authority; no source document edits or rendering performed. Existing package/version and upstream claims are historical research, not newly verified current facts. No private account access, provider calls, dependency installation or infrastructure changes were performed.

Repository inspection found documentation, design/brand artifacts and the isolated research spike. There is no product `src/`, root package.json/lockfile, Drizzle schema/migration, implemented API, matcher, session service, deployment or production test suite. Existing static UI specimens are design evidence; spike SQLite activation is research evidence. Neither proves application behavior.

## Approved foundation and responsibility

D1–D12 are settled architecture, subject to deployed D7 validation: Next.js 16 TypeScript modular monolith, Tiger Data PostgreSQL, Drizzle, Zod, custom typed orchestration, transactional state/events/jobs, scoped guest/invitation sessions, deterministic bounded matching, SSE with polling fallback, Gemini, ElevenLabs and SerpApi. Vercel is the primary host; Vultr is conditional on demonstrated need. Mastra is an evaluated fallback; Trigger.dev, Redis and additional services are not adopted.

Backend owns `src/server/**`, `src/app/api/**/route.ts`, `drizzle/**`, `scripts/worker/**` and corresponding tests. Product Engineer owns shared schemas/API/event contracts, root dependencies/configuration, architecture and release integration. Frontend owns client code and the approved light Design System v1.0, including Open Circle and Space Grotesk. Its approval gate is satisfied; separate application build authorization is still absent. No visual changes are proposed.

## Domain and persistence audit

Retain all 14 PRD entities: Participant, Capability, Mission, MissionRequirement, AgentRun, AgentEvent, CandidateMatch, GroupProposal, Invitation, ParticipantResponse, ExternalOpportunity, MissionMembership, MissionTask and AudioArtifact. GuestSession, Job, CommandReceipt, invitation-session support, notification outbox and proposal-member snapshots are supporting records, not extra product features.

Implementation design must enforce foreign keys and uniqueness for mission event sequence, membership/person, invitation revision/person, command receipt principal/operation/key and job dedupe. Snapshot profileVersion, constraintsVersion, proposal revision, algorithm version and canonical commitment hash; avoid resolving old consent against mutable current profile data alone.

Five atomic boundaries are already specified: mission + event; transition + event + next job; invitation + outbox + event; response + receipt + invalidation + repair job; activation + memberships + tasks + event. Provider calls occur outside locks. Migrations must be reviewed through Product Engineer contracts, applied on a clean actual PostgreSQL database and checked against an upgrade path. Database status: no connection or migration has been tested.

## Matching specification review

The matcher must be pure and independently testable from Gemini. Reviewed normalized taxonomy/synonyms retrieve eligible candidates; hard constraints enforce opt-in, discoverability within scope, current profile validity, explicit UTC overlap/source timezone, distinct-person coverage, required skill levels when specified, team bounds, creator participation and capacity. Missing availability is not free time. Public opportunities cannot satisfy HUMAN requirements.

Use bounded subset/branch-and-bound search for the 30 labeled synthetic profiles, with the 20-profile regression subset. Lexicographic ranking is optional coverage, mutual needs benefit, interest relevance, preserved valid commitments, smaller team, stable IDs. Do not introduce weighted ranking. Direct, complementary and reciprocal-cycle outputs remain required; initial cycle length is at most three and each member still consents.

Represent feasibility and search completeness separately: feasible group, partial coverage, stopped search, or proven no feasible solution in a fully explored space. Finding a feasible group before exhaustion does not prove optimality. Repair fixes unchanged accepted commitments where feasible; if they prevent a feasible group, pause for explicit terms review instead of silently discarding consent or inventing replacements.

Remaining specification detail for lead reconciliation: exact taxonomy/synonym fixture version; deterministic definitions of benefit/interest components; cycle edge semantics; capacity accounting and concurrency; search node/time bounds and reproducible completion statistics. These are implementation elaborations within D5–D6, not reasons to reopen the approved algorithm choice.

## Lifecycle and consent review

Baseline: DRAFT → PLANNING → DISCOVERING → PROPOSED → AWAITING_APPROVAL → ACTIVATED. Decline/counter/expiry or invalidated constraints can enter REPLANNING → REPROPOSED → AWAITING_APPROVAL. Missing inputs/search limits pause for human review; failure, cancellation and expiry have explicit policies/checkpoints. ACTIVATED changes require explicit review under D9 rather than automatic dissolution or replanning.

D3 bearer redemption establishes authority over one invitation, not real-world identity. GET must not consume tokens. Store only token hashes; use explicit redemption, expiry/revocation checks, secure HttpOnly SameSite sessions, CSRF/origin checks and no-referrer/no-store invitation responses. Never log invitation URLs, bearer material or hashes. Invite authority must not become whole-mission access.

D4 consent binds participant, role, schedule, responsibilities and relevant disclosed group terms. Carry it only when terms are unchanged and all hard constraints remain valid. Counterproposal is not acceptance; localized text/audio cannot change the canonical agreement. Activation must atomically recheck latest revisions, requirements, approvals, expiry and capacity, then produce memberships/tasks/event once. Concurrent accept/decline, replayed commands and stale worker results cannot overwrite newer decisions.

## Contract gaps to send through lead review

These findings are recorded for Product Engineer review here; no authoritative contracts were edited and no chat message was sent.

| Finding | Required resolution before affected implementation |
| --- | --- |
| No implemented shared Zod schemas/fixtures | Lead publishes one versioned source and command/event fixtures before consumers. |
| Graph DTO specified but snapshot endpoint absent; network/inbox reads unspecified | Define scoped snapshot, public opted-in network and participant inbox operations, auth matrix and pagination. Include snapshotSequence and permission-change behavior. |
| Participant PATCH says “invalidate affected proposals/jobs” while D9 forbids automatic active-mission replanning | Separate pre-activation invalidation from activated review notices; enforce capacity safety without auto dissolution. |
| Capacity, withdrawal, deletion and general record retention lack operational detail | Define commitments/availability reservations, authorized review action, revocation/deletion propagation, retained audit fields and redaction. D10 audio TTL alone is not a complete data deletion policy. |
| Response replay/version and invitation revision lineage need exact fixtures | Specify receipt lookup versus stale-version validation order; bind narrow sessions to invite lineage; define consent carry-forward records and expired/cancelled behavior. |
| Optional runId semantics for mission-level events unspecified | Lead resolves MISSION_CREATED before AgentRun exists without fabricating an agent run. |
| Media/evidence and localized content DTOs incomplete | Specify upload MIME/size/duration limits, language/status/version fields, canonical text hash and authorized short-lived access/expiry. |
| Cancellation, expiry, retry and human-resume permissions/checkpoints incomplete | Define allowed actors, terminal transitions, retry budgets and safe resumption fixtures. |
| Showcase isolation boundary unspecified at storage/query level | Require executionMode scope in queries, jobs, sessions/events and matching fixtures; scripted scenario responses remain explicitly synthetic and use authorized commands. |

Documentation contradictions: CONTRACTS “remaining gates,” WORKSTREAMS frontend initialization and several early handoff paragraphs still describe design approval as pending; the later explicit approval record, AGENTS approved-visual section and canonical v1.0 supersede them. Historical ENGINEERING_READINESS/ORCHESTRATION_EVALUATION pending D1 labels are superseded by CONTRACTS. CLAUDE.md’s “awaiting user review” is stale as an architecture label, but its implementation hold remains valid. Preserve history; reconcile navigation/status in a lead-owned documentation pass. No new architecture decision is currently required. Any material change discovered during elaboration must be raised before implementation.

## Environment and integration readiness

Names only; no values inspected or retained. Required PRD variables: `DATABASE_URL`, `SESSION_SECRET`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `SERPAPI_API_KEY`, `NEXT_PUBLIC_APP_URL`. Only the app URL may be public. No Redis is needed. Model/voice identifiers, budgets, media limits and dispatcher authentication/configuration still need explicit validated server configuration; exact names should be agreed with lead rather than treated as existing variables. Do not create .env files during this audit.

| Dependency | Current evidence | Required proof after build authorization |
| --- | --- | --- |
| Tiger Data/Drizzle | Not connected; zero migrations | TLS connection, pooled/runtime and migration connection strategy, bounded pool, transactional write/read, migrations and contention tests. |
| Gemini | No account/model/JSON calls | Confirm model availability/quotas; bounded schema extraction with semantic rejection and reviewed unknowns; localization tied to canonical terms. |
| ElevenLabs | No Scribe/TTS or balance probe | Consented reference audio transcription and localized TTS in English/Spanish/French; MIME/limits/timeouts, deletion on success/failure, text fallback. |
| SerpApi | No balance or search probe | Confirm account budget; actual attributed relevant URL/title/time; capped searches, dedupe/cache and failures. PRD’s ~1,000 credits is unverified. |
| Vercel/dispatcher | No project or account-plan validation | Confirm supported runtime, duration/upload/SSE and scheduler constraints against account; protected dispatcher and deployed D7 recovery evidence. |
| Vultr | Conditional, unprovisioned | Use only if necessary to satisfy approved D7 with evidence; record ops/restart/security plan. |
| Domain/GitHub | No remote or deployment URL; DNS unchecked | User/project access and safe repository publication setup; actual phone-accessible deployment and second-device consent. |

No live provider documentation claims are made by this report. Verify official documentation and actual account capabilities at implementation time; earlier package metadata is not a security audit. Pin compatible stable resolved dependencies, preserve license/source notices and run clean install, typecheck, build and resolved security checks under lead-owned root configuration.

## Dependency-ordered implementation plan (not executed)

| Order | Deliverable and ownership | Acceptance evidence |
| --- | --- | --- |
| 0 | User authorizes build; Product Engineer reconciles listed contract details and creates shared schemas/fixtures/scaffold | Versioned inputs/outputs/errors/events; exact backend scope; approved design preserved. |
| 1 | Backend DB/session/command foundation and early bounded account probes | Real PostgreSQL migration, scoped sessions, Zod boundaries, receipts, atomic events/jobs; actual provider capability results recorded without secrets. |
| 2 | Backend deployed dispatcher proof, before expensive orchestration breadth | Clients closed: unattended progress, forced restart, expired-lease recovery, stale-worker fencing, ordered events, unique domain effects. Stop durability claims if gate fails. |
| 3 | Profiles, reviewed mission requirements and pure matcher | 30/20 fixture coverage, overlap/size/capacity/opt-out tests, deterministic ranking, cycles, no-solution vs search-limit evidence. |
| 4 | Proposal/select/invite/redeem/respond/repair/activate/room/tasks | Two independent device sessions; real decline/replacement; unchanged consent retained; stale terms reapproved; atomic one-time activation. |
| 5 | Four typed bounded agent capabilities, event feed and scoped projections, integrated with core milestones | Tools enforce principal/deadline/budget; runner checkpoints; reconnect/polling/snapshot and privacy tests; frontend consumes committed events. |
| 6 | Gemini, Scribe/localization/TTS, meaningful SerpApi discovery | Reviewed multilingual content, no inferred consent, source evidence used by recommendation, cache/budgets/failures and audio expiry. Probes occur early; feature expansion follows stable consent loop. |
| 7 | Lead-coordinated deployed mobile/failure/security QA and submission rehearsal | Full text/audio English/Spanish/French, phone consent/room, restart and privacy evidence; actual video and accessible submission/source URLs. |

Every milestone returns migrations, server configuration names, exact commands/results, contract version, deployment commit and blockers to lead and both handoffs. No schedule promise is made from the historical audit’s hour estimates. PRD’s 25 October 11:30 AM CDT deadline and rules remain supplied/unverified; protect real video/submission time and verify organizer facts before using them as confirmed deadlines. No mandatory scope is removed by this order.

## Security, reliability and deployment risks

| Severity | Risk | Required mitigation/evidence |
| --- | --- | --- |
| Critical | Stored jobs never wake after serverless request ends | Deployed D7, scheduler authorization, leases/checkpoints and failure alerts; polling is observation, not durability proof. |
| Critical | Cross-invite access, stale consent or raced activation | Per-command/read scope, terms/revision checks, expiry, payload-digest receipts, uniqueness and actual PostgreSQL concurrent tests. |
| High | Cross-mission overbooking or active changes bypass D9 | Transactional capacity checks plus explicit post-activation review workflow. |
| High | SSE/graph/replay/media leaks private data | Server redaction before serialization, authorization on reconnect, opt-out/deletion propagation and negative access tests. |
| High | Provider costs repeated after crash or untrusted content triggers tools | Reserved budgets, input hashes, bounded retries/backoff and typed allowlisted tools; external calls may repeat, never claim exactly-once provider execution. |
| High | Audio leaks or translation changes obligations | Owner-scoped media, cleanup for failed/interrupted paths, 24h TTS TTL, canonical hashes and reviewed translated terms. |
| High | Untested account/runtime limits block demo | Early actual capability/deployment probes, text fallback, bounded execution; no claim of configured or successful services without evidence. |
| High | Synthetic decisions mix with real participants | Separate execution scope, explicit labels and same domain commands; no manufactured live acceptance. |
| High | Time window consumed before deployed proof/video | Integrate core early, protect rehearsal/submission and report unfinished mandatory gates explicitly. |

## Verification and immediate next action

Audit commands: `git status --short`, `git branch --show-current`, `git log -3 --oneline`, `git remote -v`, `rg --files`, targeted `cat`/`sed` reads and `cmp CODEX_HANDOFF.md CLAUDE_HANDOFF.md`. Initial working tree clean, branch main, baseline a406a64, remote list empty, handoffs identical. Delivery checks use `git diff --check` plus Python assertions for request fidelity, identical handoffs, all 21 PRD section headings, expected source presence and absence of product scaffolding. Results are recorded in the milestone handoff after checks run.

No production unit/integration/browser tests, build/typecheck, resolved-package audit, provider probes, DB tests or deployed tests were run; no application exists. Historical spike/static design results were inspected, not rerun or expanded into product claims.

Immediate next action: Product Engineer reviews the recorded contract gaps and assigns the authorized backend slice once the user separately authorizes build. Do not scaffold, install packages, connect providers, provision infrastructure or message other chats from this initialization. Architecture and design approvals remain settled. This report requires no additional D1–D12 approval.
