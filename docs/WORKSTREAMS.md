# COHUE implementation workstreams

Implementation authorized by user after architecture/backend-readiness/design approval. Lead’s immediate scope is shared foundation and two self-contained work orders, then stop for user to activate engineers individually. This file and work orders do not activate/message the separate conversations. D1–D12 preserved; deployed D7 outstanding; Design System v1.0 approved/locked, no redesign or renewed presentation approval needed.

## Work orders

- Root FRONTEND_IMPLEMENTATION_SCOPE.md: exact frontend deliverables, order, ownership, contracts/dependencies, responsive/motion/accessibility quality, tests and completion.
- Root BACKEND_IMPLEMENTATION_SCOPE.md: exact database/runner/matching/consent/repair/agents/providers/read/media/deletion deliverables, ownership/order/acceptance and evidence.
- docs/INTEGRATION_CHECKPOINTS.md: I0–I6 continuous runnable vertical slices and serialized handoff rules.
- docs/CONTRACTS.md + CONTRACT_RESOLUTIONS.md + src/contracts/**: shared version1.0.0, not permission to invent duplicate types or privately change endpoints.

## Ownership

Lead owns shared schemas/fixtures, root package/lock/config/CI, scripts except worker, tests/contracts and tests/e2e/integration, shared specs and integrated review. Bootstrap page/layout are a minimal shell and transfer to frontend at activation. No product modules implemented by lead.

Frontend owns UI app page/layout/loading/error/not-found files (exclude api/route.ts), globals.css, components/features/client/public and tests/frontend/tests/e2e/frontend. Sole engineering owner of design system/visual identity/typography/colors/responsive interface/animation architecture/frontend experience, faithful to approved v1.0 with exceptional mobile, graph, fluid truthful motion, keyboard/accessibility/reduced-motion/performance. Frozen design artifacts remain unchanged; implement production equivalents in owned paths.

Backend owns server, app/api route.ts, drizzle/drizzle.config.ts, scripts/worker, tests/backend/tests/e2e/backend and operations docs. Server-only auth/state/matching/DB/jobs/provider adapters/projections. No frontend visuals or shared schema/root dependency changes without lead review.

Both can write owned docs/status reports and append both handoffs through npm run handoff:append under exclusive lock. No conflicting shared-file edits or blanket staging. Request shared changes by user relay; no implicit inter-chat messages. Commit tested working slices continuously on shared main.

## Parallel sequence

I0 lead foundation (this milestone) -> user delivers assignments -> F1 tokens/primitives/responsive shells/adapters in parallel with B1 actual PostgreSQL/session/migration/provider probes and B2 deployed D7. Then I2 persisted join/create/match integrated through running UI; I3 invitations/decline/repair/reconsent/activation/room/tasks; I4 event graph/trace/reconnect/replay integrated continuously from I2; I5 actual three-language voice and attributed search after core while probes start early; I6 deployed privacy/failure/mobile/QA/rehearsal/video/Devpost. No end-stage-only merge or optional polish ahead of working consent loop.

All seven experiences/eight motions retained. Fixture-only tests must be labeled; live cannot fall back to synthetic success. Checkpoint evidence and protected final recording/submission window are mandatory. No account, DB, provider or D7 readiness is inferred from this foundation.
