# Shared foundation verification

24 October 2026. Scope is the lead-owned scaffold/contracts/fixtures/configuration/work orders only, not the complete COHUE product. Preceding Git baseline 76de780, local main. No engineer was messaged, activated or assumed to have received an assignment. Frozen approved design files are unchanged.

## Actual final checks

| Command/check | Actual result | Limit |
| --- | --- | --- |
| npm ci --ignore-scripts --no-fund | Clean lockfile install passed,493 packages added,494 audited,zero known vulnerabilities | Local Node 26.4.0/npm 11.17.0; target Node 24 CI/deploy still needs execution evidence. Lifecycle scripts intentionally disabled; prebuilt tooling worked. |
| npm run check | Foundation integrity, zero-warning lint, route typegen+strict TypeScript, 24 Vitest tests and production Next 16.4.3 build passed | No auth/DB/domain/provider implementation or actual deployed tests implied. |
| Fresh generated-output check | Moved prior .next build to a task-specific temporary path; next typegen creates required generated route declarations before tsc, then production build passes | Avoids a false CI pass relying on preexisting .next types. Old build preserved outside repository. |
| npm run contracts:export | 37 API operation metadata entries exported | No API handlers are implemented; schemas/params/auth/status/envelopes are executable contracts only. Manifest parity tested. |
| npm run test:e2e | 1 Chromium production scaffold test passed | One plain page/HTTP200/heading/disclaimer smoke, not seven experiences or collaboration journey. |
| npm audit --json | 0 info/low/moderate/high/critical vulnerabilities after resolved override | Point-in-time known-advisory scan, not a security guarantee or full license audit. |
| npx drizzle-kit --version | Drizzle-kit 0.31.11/ORM 0.45.4 CLI loads successfully | No migration generation, actual PostgreSQL connection/application or concurrency test performed. |
| Frozen design integrity | 11 approved source hashes plus 3 canonical spec/token/provenance hashes match; no docs/design diff | Proves no design-source edits, not production visual fidelity. |
| Handoff consistency | Both handoffs byte-identical; serialized append script used for lead milestone | CI configured, not a hosted CI run. No remote configured/pushed. |

Contract tests cover invalid time/size/scope, strict authority-free command fields, canonical consent/hash/NFC/group-order behavior, changed terms/lineage, duplicate/cross-mission membership, token-free DTOs, run-null versus real execution events, invitation statuses, public evidence/dangling graph errors, media caps/access paths, event page scope/order/cursor, no-solution versus bounded search,30/20 synthetic fixture integrity/cycle edges, versioned 37-operation manifest, and extraction that cannot set consent or silently create a valid mission from unknown constraints.

The illustrative 24-event synthetic trace includes initial invitations/creator and designer approval/hardware decline, repair, revocation of changed disclosed-group terms, explicit fresh invitations/approvals for the revised group, then activation/task event. It remains labeled test input, not real execution or a substitute for running the actual backend showcase state machine.

## Compatibility corrections and limits

Initial registry-latest TypeScript 7 was unsupported by Next’s installed ESLint parser; pinned TypeScript 5.9.3. ESLint 10 conflicted with installed React/JSX plugin peer ranges; compatible ESLint 9.39.5 pinned and lint passes. Registry marks ESLint 9 unsupported; this tooling maintenance limit is retained in THIRD_PARTY_NOTICES, not hidden as “everything latest.” No known audit finding remains. Drizzle-kit’s deprecated esbuild-kit chain initially resolved vulnerable esbuild; narrow exact esbuild 0.25.12 override removes GHSA-67mh-4wv8-2f99, CLI version smoke passes, backend still must validate migrations. No force-downgrade of Drizzle or unapproved orchestration dependency added.

Full test/build also caught an event payload type narrowing error and a now-invalid role/group hash test fixture; corrected and final checks pass. Early partial tests do not replace final results. Browsers/temporary build outputs/node_modules/DB files/secrets are untracked or ignored; only empty env template is committed.

## Unverified product/deployment gates

No PostgreSQL/migrations/auth/receipt/runner/matcher/consent/repair/activation/task/provider modules implemented by lead. No API server routes, actual provider keys/models/quotas/balances, Vercel/Vultr scheduler, domain DNS, mobile devices, real speech, two-device consent, graph performance, deployed D7 or actual Devpost/video. Those are concrete backend/frontend work-order gates. Product/UI completion, deployed durability and hosted CI are not claimed. No account credentials inspected or retained. Event deadline/rules remain PRD-supplied until organizer verification; protect final QA/video/submission window.
