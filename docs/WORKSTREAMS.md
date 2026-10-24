# Initial engineering workstreams

Prepared, not activated. No specialist agents have been spawned. Contracts must be reviewed before parallel implementation. Each engineer reads AGENTS and both handoffs and reports planned/implemented/verified status separately.

## Lead ownership

Own `src/contracts/**`, cross-cutting root configuration, architecture docs, API/event fixtures, integration/E2E orchestration, release checks and both handoffs. Backend proposes schema changes and frontend proposes DTO needs; lead reconciles contracts before either consumes a change. Lead creates shared scaffold only after review. Route ownership: frontend owns page/layout/loading/error files; backend owns route.ts under app/api. Avoid whole-directory concurrent formatting. Root package changes are lead-owned and requested with exact package/version/reason. Tests follow module ownership; integration journey belongs to lead.

## Frontend engineer specification

Own `src/app` UI pages/layouts (excluding api), `src/components/**`, `src/features/**` client code, `src/client/**`, public visual assets and UI tests. No provider secrets, SQL, matcher authority or server transition logic in these paths. Client imports only public schemas/types and DTO adapters.

First assignment after activation: propose visual direction for user approval. Deliver coherent alternatives or a recommended direction with rationale, type choices/licensing, palette, semantic status colors, spacing/shapes, mobile and desktop compositions, component samples, contrast checks and motion tokens. Show Mission Theater, invitation sheet and mobile composer in a reviewable design board. User approval of actual fonts/colors/styling precedes full frontend implementation. Functional architecture and wireframes can proceed while approval is pending. Do not assume any preset visual identity is approved.

Implement all seven experiences: entry, onboarding, reviewed voice/text composer, live theater with candidates and trace, localized invitation/counterproposal, active Mission Room/tasks, impact/replay. Seven experiences need not be seven routes. Cover idle/loading/empty/invalid/denied/offline/retry/provider failure, stale plan, expired invite, no solution, paused human and activation states. Provisional route map: `/`, `/join`, `/missions/new`, `/missions/:id`, `/invitations/:token`, `/missions/:id/room`, `/missions/:id/replay`.

Implement all eight truth-bound motions from PRD: real network emergence, confirmed mission formation, committed agent execution, distinct internal/external discovery, persisted invitation edge, decline/uncovered requirements/replacement recovery, atomic activation and actual media pipeline. Use Motion plus React Flow and ELK; positions are derived UI state, status is server state. In reduced motion provide immediate state change and concise textual announcement. Replay never modifies live state. Prevent old event animation from overwriting a newer snapshot. Use stable nodes, memoized projections, bounded graph density and off-main-thread layout where measured useful.

Mobile: at 320–389px essential actions and list alternative first; 390–479px compact network and activity panels; 480–1023px adaptive panes; >=1024 theater with trace; >=1440 expanded evidence. Keyboard navigation, visible focus, screen-reader announcements, captions, adequate touch targets and contrast must be verified. Prefer explicit text labels alongside statuses, not color alone. No overflow, inaccessible graph-only actions or hidden record controls. Target responsive ~60fps on capable devices and measure the graph scenario/device rather than claim universal performance.

Acceptance: renders actual contracts and event fixtures with honest synthetic labels; production consumes authenticated server snapshots/events; text and audio paths share confirmation; second-device invite works; desktop/mobile end-to-end and reduced-motion/failure tests pass. Handoff includes approved design artifact, changed paths, test evidence, remaining issues and API dependencies.

## Fullstack and backend engineer specification

Own `src/server/**`, `src/app/api/**/route.ts`, `drizzle/**`, `scripts/worker/**`, backend unit/integration tests and operational configuration proposed through lead. Modules: sessions/authorization, participants/taxonomy, missions/requirements, discovery, deterministic matching, proposals, invitations/responses, collaboration/tasks, orchestration/jobs/events, providers/audio. No visual tokens or client components.

First assignment after activation: validate account-backed DB connection and migration strategy, guest session/invitation identity choice, scoped API contracts and durable runner dispatch. Implement core vertical slice before provider differentiation. Use all 14 PRD entities plus technical session/job/receipt/outbox tables. Persist transactional state/events; protect current proposal terms and consent through repair and activation. Never expose token hashes or private graph profiles.

Agents are bounded capabilities within the monolith. Director may parse/decompose but creator confirms unknowns; Scout may retrieve consented profiles and attributed public resources; Strategist calls deterministic feasibility/ranking/repair; Coordinator creates in-app invitations and activates only through authorized domain services. No agent is allowed to impersonate an invitee. Tool calls accept validated inputs and server-derived scope. Record provider/model versions, duration, actual usage and redacted failure reason.

Implement Gemini schema extraction/localization behind a provider adapter; select available model IDs only after account test. Use ElevenLabs Scribe input then editable transcript; Gemini translation then ElevenLabs TTS output tied to canonical invitation hash. SerpApi capped queries must return evidence used in recommendations without satisfying human skill constraints. Typed fallbacks, quotas, retry timeouts, input bounds and cache keys required. Do not assume ~1000 credits or actual keys are provisioned.

Acceptance: matcher tests cover coverage/count/overlap/conflicts/cycles/determinism/bounded search/opt-out; consent tests cover identity/expiry/stale terms/counter/races/idempotency; actual DB tests cover ordering/rollback/restart/lease fencing/activation uniqueness; provider readiness proves real schema JSON, speech, translated TTS and sourced search. Deployed runner recovers with clients closed. Return migrations, environment variable NAMES only, operational commands and actual test evidence to lead.

## Integration sequence

Lead freezes contract v0.1 and fixtures -> common scaffold -> frontend wireframes/design approval in parallel with backend domain/DB -> join/create/constraints -> proposal/invite/respond/repair/room -> event graph -> voice/discovery -> full deployed journey, failure modes and recording. Both engineers work against the same contract fixture versions; changing an event requires schema, backend producer, client reducer and replay fixture updates in one coordinated milestone.
