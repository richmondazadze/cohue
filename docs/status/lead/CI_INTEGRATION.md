# CI integration readiness — 24 October 2026

Updated `.github/workflows/ci.yml` to run against an ephemeral PostgreSQL17 service. Separate `cohue_ci_unit` and `cohue_ci` databases isolate direct runner-unit writes from application integration journeys. Both receive actual migrations. The job preserves Node24 via `.node-version`, frozen foundation checks, lint/typecheck/unit/build, dependency audit and production test server. It seeds the labelled synthetic showcase, starts an independent leased-job worker, and requires backend integration rather than treating missing routes as a pass. Frontend live tests now receive an explicit local base URL instead of being skipped. All e2e run serially to avoid cross-file participant matching interference. Failure evidence includes worker logs. Workflow permissions are read-only contents; no production/provider credentials or account secrets are referenced.

Validation performed locally on this checkout with Node26.4.0 and existing PostgreSQL17 server, using newly created `cohue_ci_review_unit` and `cohue_ci_review_e2e` databases, never production Tiger Data or the lead's `cohue_test` database:

- YAML parsed with installed js-yaml; required backend flag, PostgreSQL service and trigger invariants checked. `git diff --check` passed.
- Fresh migrations0000_init (61statements) and0001_mission_history (3statements) applied to both databases.
- Actual PostgreSQL `tests/backend/runner.db.test.ts`:1 passed, including lease recovery/fencing/ordered effects and newly added stale-exhaustion/provider-budget checks.
- Showcase seed installed30 SHOWCASE participants and0 LIVE participants before the API rehearsal.
- Production build served at127.0.0.1:3101 with independent worker and explicit empty vendor keys. API-only I2/I3/showcase suites:6 passed in5sec, covering deterministic proposals, creator authorization, exhausted no-solution, raced capacity, decline/repair/reconsent/activation/room, and showcase isolation. No browser UI was automated during this rehearsal.
- Rehearsal worker and server stopped afterward. Named review databases contain only disposable synthetic test data and remain local for reproducibility.

This is not a hosted CI pass, Node24 execution result, deployed D7 proof, real-provider acceptance or browser/mobile accessibility validation. Lead must push and inspect the resulting GitHub Actions run. Full browser suites and absent-provider fallback behavior remain subject to that hosted run and CUA production review.
