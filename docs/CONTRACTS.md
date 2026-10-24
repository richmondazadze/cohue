# COHUE shared contracts version 1.0.0

Status: authoritative TypeScript/Zod foundation implemented after user authorization on 24 October 2026. D1–D12 and Backend Engineering Readiness approved; Design System v1.0 approved/locked. The architecture/design review gates are satisfied. Lead implements shared foundation only; user separately delivers each specialist work order. Database, auth, matcher, APIs, runner, providers and product UI are NOT implemented merely because their contracts exist. Deployed dispatcher validation (D7) remains outstanding.

## Authoritative sources

- src/contracts/index.ts exports all public shared schemas, inferred types, constants and typed API registry.
- primitives.ts: UUIDs, UTC intervals/timezones/BCP47, strict LIVE/SHOWCASE scope, pagination, version 1.0.0.
- domain.ts: participants/capabilities, mission/requirements, candidates/proposals/search evidence, canonical commitments/invitations/responses/lineage, memberships/tasks/resources, runs, reservations/review.
- api.ts: 37 exact method/path/auth/request/path-parameter/success/error/status/idempotency operations; ApiInput/ApiOutput/ApiParams types. docs/API_OPERATIONS.json is generated navigation via npm run contracts:export, not a competing schema.
- events.ts: EventV1 strict discriminated payload allowlist, real run requirement for execution, mission-level null run semantics.
- projections.ts: authorized network/graph/snapshot/event pages/inbox/room, sequence/scope structure; server still enforces all permissions.
- media.ts: upload limits and transcript/localization/audio lifecycle fields; agents.ts: bounded agent I/O/context/tool allowlist; execution.ts: checkpoint/job/receipt structure; policies.ts: operational limits/status mapping.
- canonical.ts: stable canonical terms serialization for server SHA-256, version/translation-independent material terms identity.
- src/fixtures: 30 labeled synthetic participants/20 subset, taxonomy-1 multilingual aliases, reviewed mission/complete group terms, response commands/carry lineage/replay cases, five scenario specifications, draft snapshot and illustrative 24-event trace. No fixture is a live participant/consent/provider success.

Import from @/contracts; do not duplicate interfaces/unions or import provider/server/client code into shared modules. Payloads reject unknown fields, IDs opaque UUID, date/time UTC RFC3339 with source IANA timezone, BCP47 languages, explicit numeric constraints. Compile-time types and runtime schemas are one source. Zod validates shape and selected internal consistency; backend must enforce authorization, cross-record feasibility, expiry/capacity and transactions. No client or model is authoritative.

## Approved decisions D1–D12

| Decision | Approved baseline |
| --- | --- |
| D1 | Custom typed TypeScript state machine; Mastra remains an evaluated fallback, not the selected product orchestrator; no dual orchestration stack. |
| D2 | DECLINED belongs to invitation status/event; affected missions enter REPLANNING while valid commitments can remain. |
| D3 | Explicit opaque-token redemption establishes an invitation-scoped session. Bearer possession authorizes only that invitation and is not proof of real-world identity; GET never consumes the token. |
| D4 | Carry acceptance across revisions only when material role/schedule/responsibility/group terms remain unchanged and hard constraints still hold; otherwise obtain renewed consent. |
| D5 | Explicit UTC intervals with source timezone, required common overlap, distinct-person coverage, explicit team-size bounds and creator participation, stable lexicographic ranking. Numeric mission constraints are confirmed inputs rather than invented defaults. |
| D6 | Confirmed taxonomy and synonym retrieval for semantic discovery; direct, complementary and reciprocal-cycle outputs; initial maximum cycle length 3 with bounded search. |
| D7 | Bounded request-triggered ticks plus a real scheduled dispatcher, or a verified Vultr worker if necessary. Deployment must demonstrate unattended progress and restart recovery with browsers closed before durability is claimed. |
| D8 | In-app participant inbox and creator-shared link/QR; persisted invitation-ready state. No claim of external delivery or autonomous outreach. |
| D9 | Surface post-activation changes for explicit creator/member review; do not automatically dissolve, replan or overbook teams. Cross-mission capacity handling must preserve these constraints rather than assume unlimited availability. |
| D10 | Remove raw audio after transcription; synthesized audio TTL 24h; opt-out removes public/discovery projections. Implement explicit deletion behavior before public use. |
| D11 | 30 labeled synthetic profiles, including a 20-person matcher regression subset; isolate showcase from live data. |
| D12 | Core text consent first, then validated English/Spanish/French text and audio for final Definition of Done; tiering does not waive multilingual requirements. |

## Reconciled backend gaps

The complete operational specification is CONTRACT_RESOLUTIONS.md. It governs scoped network/inbox/snapshot/media/replay reads; pre-activation invalidation versus D9 review; capacity/reservation concurrency and cancellation; 24-hour deletion/minimal 30-day audit; receipt lookup versus stale checks and invite lineage; mission events with null run; bounded media/localization; terminal/retry/resume/checkpoints; storage/query/job/cache showcase isolation; taxonomy/lexicographic ranking/cycles/search statistics. These elaborate approved D1–D12, not architectural replacement.

Registry auth shorthand: PUBLIC never exposes private terms; SESSION still needs object/source authorization; OWNER is record creator/owner; INVITATION is one redeemed invite/lineage; MEMBER is current room member or owning mission creator, with narrower task-owner checks; OPERATOR is server-established operator, never caller-selected role. Paths use shared params schemas. Next invitation wildcard uses one [reference] directory, token validation for preview/redeem and UUID validation for detail/respond. SSE frames and audio bytes are explicit transport exceptions to normal JSON success/error envelopes; see reconciliation.

Scope/version/sequence are mandatory at relevant boundaries. Session scope is derived server-side, no caller-selected authority on business commands. Per-mission sequence starts at 1, snapshotSequence atomic with graph; SSE Last-Event-ID and JSON after cursor share ordered events. Duplicate/gap/revocation handling does not fabricate progress. Public resource never uses accepted member geometry/status. Canonical terms/response hash binds material schedule/role/responsibilities/group, independent of translation. Changed group terms require reconsent; preserve only valid identical hashes with recorded lineage. Human responses are authenticated commands, never an agent tool.

## Change and integration protocol

Lead owns src/contracts/fixtures and root configuration; consumers request deltas before changing shared types. Version 1.0.0 replaces planning v0.1; both work orders consume it. Update runtime schema, typed registry, fixtures/negative tests, generated manifest and both handoffs in the same coordinated milestone. Contracts are not implementations of routes, auth or state machine. See root specialist work orders and INTEGRATION_CHECKPOINTS for exact ownership, continuous vertical slices and required deployed evidence. D7 remains conditional; no DB/API/account readiness claim from schema tests.
