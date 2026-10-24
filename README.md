# COHUE

Multilingual intent-to-outcome coordination for HackTX 2026. Architecture D1–D12, backend readiness and Design System v1.0 are approved. This milestone implements the shared application foundation and authoritative contracts only; product UI, backend services, PostgreSQL, providers and deployed runner remain assigned work, not completed functionality.

## Start locally

Use Node24 (`.node-version`) and npm. Run `npm ci --ignore-scripts`, `npm run dev`, open http://localhost:3000. The plain home page is a scaffold smoke target, not the approved product experience. No credentials are required to build or test shared schemas. Copy `.env.example` to ignored `.env.local` only when configuring real backend services; never commit values.

`npm run check` runs frozen design/source and handoff integrity, lint, typecheck, contract tests and production build. `npx playwright install chromium` then `npm run test:e2e` runs production scaffold smoke; build first. `npm run contracts:export` refreshes API navigation. `npm audit` reports resolved advisory status; no audit implies a guarantee of security. CI is configured in .github/workflows/ci.yml but has not run on a remote service.

## Activate engineers explicitly

The user delivers [frontend work order](FRONTEND_IMPLEMENTATION_SCOPE.md) and [backend work order](BACKEND_IMPLEMENTATION_SCOPE.md) to their separate conversations. File creation does not activate or message either engineer. Lead stops after foundation delivery; strict ownership is in AGENTS and work orders. [Integration checkpoints](docs/INTEGRATION_CHECKPOINTS.md) require working vertical slices throughout development.

Read both handoffs before resuming. Shared runtime schemas/types are in src/contracts; [contract reference](docs/CONTRACTS.md) and [backend gap resolutions](docs/CONTRACT_RESOLUTIONS.md) define version 1.0.0 semantics. Fixtures in src/fixtures are labeled synthetic test input, never live success fallback. [Backend readiness](docs/BACKEND_ENGINEERING_READINESS.md) and [engineering audit](docs/ENGINEERING_READINESS.md) are historical planning evidence; current authorization supersedes their build holds. Authoritative unchanged PRD is in docs/reference.

Approved [Design System v1.0](docs/design/DESIGN_SYSTEM_V1.0.md), exact tokens and Open Circle/Space Grotesk must be preserved. Historical design-document build holds are superseded by the current scoped implementation authorization; no visual redesign is authorized. Frozen design source files are unchanged.

## Unverified gates

Actual Tiger Data migrations/connectivity, provider keys/models/quotas, Vercel/account/runtime/dispatcher/DNS, two-device consent, production matching/repair/activation, real multilingual speech/search, mobile accessibility/performance and Devpost/video. D7 needs actual deployed clients-closed recovery proof; local schemas/build/research do not establish durable execution. No remote, published application or cloud resources are implied.
