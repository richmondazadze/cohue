# COHUE deployment and operations

Status: prepared, not yet deployed. Deployed D7 remains UNVERIFIED until the evidence in "D7 proof" exists.

## Environment (names only; values live in Vercel project settings or ignored .env.local)

DATABASE_URL (pooled, TLS), DATABASE_MIGRATION_URL (optional direct), SESSION_SECRET (32+ random bytes; also derives invitation-link and token-hash keys), DISPATCHER_SECRET, CRON_SECRET (set to the same value as DISPATCHER_SECRET so Vercel Cron's bearer header authorizes /api/internal/dispatch), DISPATCHER_MODE (`scheduled` on Vercel Cron, `worker` for the long-running loop), NEXT_PUBLIC_APP_URL (public origin used in share links), GEMINI_API_KEY, GEMINI_MODEL, ELEVENLABS_API_KEY, ELEVENLABS_STT_MODEL, ELEVENLABS_TTS_MODEL, ELEVENLABS_VOICE_ID, SERPAPI_API_KEY. Optional DATABASE_POOL_MAX (default 5).

## Steps

1. `npm ci`, then `DATABASE_URL=<target> npm run db:migrate` (transactional, idempotent; records files in cohue_migrations).
2. Optional synthetic showcase: `DATABASE_URL=<target> npm run seed:showcase` (SHOWCASE scope only; resets synthetic missions).
3. `vercel link`, set the environment above for Production/Preview, `vercel deploy` (preview) then `vercel deploy --prod` when verified. Node 24 per `.node-version`/engines.
4. Dispatch: vercel.json schedules `/api/internal/dispatch` every minute. Vercel Hobby limits cron to daily, so every-minute dispatch needs Pro, or run `npm run worker` (DISPATCHER_MODE=worker) on a small host against the same DATABASE_URL, or an external scheduler POSTing with `Authorization: Bearer $DISPATCHER_SECRET`. Each drain also runs the expiry/retention sweeper. Post-response `after()` drains only accelerate; they are not durability.
5. Health: `GET /api/providers/health` with `Authorization: Bearer $DISPATCHER_SECRET` returns redacted states.

## D7 proof (required before claiming durability)

With every browser closed: start a mission, confirm progress to PROPOSED via the scheduler only; lease a job and kill the worker mid-step (or let a lease expire), confirm another dispatch recovers it and the stale holder's commit is fenced; confirm events are strictly ordered and there is exactly one MISSION_ACTIVATED, one membership per member and one task set. Record deployment URL, commit, UTC timestamps and the redacted event trace. tests/backend/runner.db.test.ts is the local rehearsal of the same checks.

## Retention

Deletion revokes sessions, invitations and holds immediately; the sweeper scrubs personal profile fields after purge_by (24 h) and keeps the opaque row for integrity. Raw audio is never written to storage (processed in memory only). Synthesized audio bytes are nulled at expiry (≤24 h). Receipts expire at 48 h. Backups: whatever the database provider retains must age out within its own policy; document the chosen provider's backup window here once known.

## Tiger Data provisioned — 24 October 2026

Service `cohue-prod`, ID `rje03je7u3`, project `b4ybdovx63`, AWS us-east-1, Production, 0.5 CPU / 2 GiB, one async HA replica and PgBouncer. Console verified Ready and replica caught up. Trial showed $1000 credits; wizard estimate $0.1149/hour plus storage. Automatic same-region backup verified with three-day PITR; cross-region backup not enabled (Enterprise-only in this account).

Both migrations 0000_init.sql and 0001_mission_history.sql applied, then rerun idempotently. Ignored owner-only .env.local now holds certificate-verifying `sslmode=verify-full` URLs: runtime uses observed transaction pooler port39478/database tsdb_transaction, migrations use direct port35959/database tsdb. Runtime role cohue_app has application-table SELECT/INSERT/UPDATE/DELETE and sequence access, no superuser/role/database creation; administrator URI reserved for migration. Credentials are never recorded here or in Git. Both direct and pooled endpoints passed TLS, transactional temporary write/read/rollback checks before privilege separation; application-role read verified separately. No sample live participants seeded by this setup.

Cloud database setup does not imply a Vercel deployment or D7 proof. Runtime scheduler/worker, provider API credentials and production two-device checks remain outstanding. Do not run destructive test suites against this production service; use isolated test data/database for further integration tests.
