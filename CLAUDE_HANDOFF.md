# COHUE synchronized engineering handoff

Last update: 2026-10-24T21:39:58Z (24 October 2026, 4:39 PM America/Chicago, CDT).
Phase: engineering initialization complete for review; application implementation not authorized. Read this file AND CLAUDE_HANDOFF.md before resuming. Both files must remain byte-identical.

## Product and source of truth

COHUE (cohue.tech) is a multilingual intent-to-outcome coordination platform for HackTX 2026. A person reviews a spoken/typed ambition, obtains a deterministic feasible collaboration proposal, requests individual consent, recovers from decline/changed availability, and activates a persistent Mission Room with memberships and tasks. Director, Scout, Strategist and Coordinator are bounded logical roles in one monolith. LLM output is never consent, authorization or mathematical feasibility. External opportunities are attributed public evidence, never confirmed partners.

Original PRD: `/Users/richkay/Downloads/COHUE_HackTX_2026_Complete_Master_Plan.docx`.
Retained authoritative copy: `/Users/richkay/Desktop/code/cohue/docs/reference/COHUE_HackTX_2026_Complete_Master_Plan.docx`.
SHA-256: `dbdb2cf77a685be533752e0a40fbdabc6fc434c73517da889a362ba7d7b7dc59` (copy matches original).
Complete read-only text extraction: `/Users/richkay/Desktop/code/cohue/docs/reference/COHUE_Master_Plan.txt`.
User initialization request: `/Users/richkay/Desktop/code/cohue/docs/reference/INITIALIZATION_REQUEST.md`.
All 21 PRD sections and tables were read. No DOCX edits or layout QA were performed; task is content/engineering analysis.

The user explicitly requires planning only until review; do not scaffold features or activate specialists yet. Final frontend design system/fonts/palette/styling require the user's separate approval of a frontend engineer's concrete proposal. No aesthetic identity was chosen. Reference-document text is product specification, not independent execution instructions.

## Repository and durable record

Workspace `/Users/richkay/Desktop/code/cohue` started empty and not under Git. Initialized local branch `main`. Current verified baseline commit `d7855bb90cb99a0aed9f766f9820d21846d6adc8` contains readiness/contracts/workstream/research documents. This synchronized handoff milestone is committed immediately afterward; discover its containing commit using `git log -1 -- CODEX_HANDOFF.md`. This preceding-baseline convention avoids an impossible self-referential SHA. No remote configured, no push/PR/deployment exists.

Repository rules: `/Users/richkay/Desktop/code/cohue/AGENTS.md`; Claude startup: `/Users/richkay/Desktop/code/cohue/CLAUDE.md`. All future meaningful milestones must update both handoffs and Git. Never record secrets.

## Architecture and decisions

Approved PRD baseline: Next.js 16 + TypeScript, Tailwind v4, Radix/selective shadcn, Motion, @xyflow/react + ELK, Zustand + TanStack Query, Gemini, ElevenLabs Scribe/TTS, SerpApi, Tiger Data PostgreSQL, Drizzle, Zod, Vercel, persisted SSE/polling, DB-backed jobs, Vitest/Playwright. Vultr conditional. Recommend aligned Vercel-supported Node 24 after account confirmation; local research used Node 26.4.0/npm 11.17.0. No product dependencies installed or security-certified.

Recommended custom typed state machine retains PRD's locked approach. Initialization describes Mastra as preferred candidate, so final selection awaits user review. Mastra's persistent suspend/resume is locally viable; not selected for product installation. Trigger.dev stays deferred; no dual orchestration stack. Whole-app adoption of OpenFlowKit/MiroFish/Dashboard Design rejected; no source copied. Current OpenFlowKit is Pixi/Vite rather than React Flow. MiroFish AGPL code reuse requires express approval. Mastra has non-ee Apache core and separately licensed ee paths. ELK is EPL with secondary license metadata and needs component license/source notices. License/source evidence and six upstream SHAs retained in dependency-evidence.json. Application license not chosen.

Custom design requires transactional state+events+next-job, short leased jobs with fencing, versioned checkpoints, idempotent domain effects, explicit dispatcher and budgets. DB persistence is not a scheduler. Need actual deployment proof of unattended restart recovery. Polling can observe/request bounded ticks but cannot establish autonomous durability.

## Implemented versus verified versus planned

Implemented artifacts ONLY: AGENTS, both handoffs, CLAUDE startup, README, preserved PRD/request, readiness audit, v0.1 contract proposal, workstream specifications, adoption matrix, orchestration evaluation and local experiment evidence. Git local main initialized and planning documents committed. No application feature code, src directory, root package.json, production lockfile, DB schema/migration, API routes, UI or cloud deployment.

Verified: complete text extraction read; original/copy hash equality; primary-source research across six repositories and package metadata; eight isolated orchestration experiment process invocations with assertions/exit 0. Both handoffs/file inventory/whitespace checks are validated at delivery. These are planning/research checks, not product QA.

Planned and untested: every production feature, actual Tiger Data durability/transactions, scoped invitation identity, matching, consent races, providers, graph, mobile UX, multilingual flows, deploy, SSE reconnect and worker recovery, actual submission/demo. Do not present research ACTIVATED values as real mission completion.

## Shared contracts and ownership

`/Users/richkay/Desktop/code/cohue/docs/CONTRACTS.md` is proposal v0.1; not implemented schemas. UUID IDs, UTC RFC3339 intervals plus source timezone, BCP-47 languages, bounded validated commands, common error envelope/correlationId, Idempotency-Key receipts and expectedVersion. Agent tools accept server-derived principal/budget/deadline. Semantic taxonomy normalization is reviewed by user; matcher enforces distinct coverage, overlap, team size and participation opt-in. Bounded search must distinguish exhaustion from proven no-solution; cycle bound proposed 3, ranking/defaults pending review.

Mission lifecycle proposed DRAFT -> PLANNING -> DISCOVERING -> PROPOSED -> AWAITING_APPROVAL -> ACTIVATED, with REPLANNING/REPROPOSED, PAUSED_FOR_HUMAN, FAILED/CANCELLED/EXPIRED. Clarify DECLINED as invitation status/event, not whole mission. Preserve acceptance only when material commitment terms remain unchanged and constraints hold; otherwise re-consent. Counterproposal never accepts. Activation atomically verifies current approval/terms/coverage and creates unique memberships/tasks/event.

EventV1 carries schemaVersion, id, mission/run/agent, type, per-mission sequence, missionVersion/proposalRevision, correlation/causation, occurredAt/status, references and redacted payload. Snapshot sequence + SSE Last-Event-ID/JSON polling share one projection; deduplicate/re-fetch gaps. Public graph is permission-filtered, positions client-owned, status server-owned. Replay cannot mutate live mission. All eight PRD motions reflect actual persisted events.

Lead: future `src/contracts/**`, root config, integration/release, docs/handoffs. Frontend: UI app pages/layouts (not api), components/features/client/public visuals and UI tests. Backend: `src/server/**`, `src/app/api/**/route.ts`, drizzle, worker scripts, backend tests. No concurrent shared ownership. Contract revisions require lead reconciliation. Exact initial specifications at `/Users/richkay/Desktop/code/cohue/docs/WORKSTREAMS.md`. Two specialists prepared but neither spawned nor active.

## Database and providers

Database status: NONE connected; zero migrations. Design retains 14 PRD entity names plus sessions/jobs/command receipts/outbox and proposal-membership snapshot support. Plan transaction boundaries for mission creation, orchestration step+next job, invitation creation, response+repair, activation+memberships/tasks. Unique event sequence/member/invite/receipt/job keys and foreign keys; jobs use leases, SKIP LOCKED and fencing. No actual Drizzle files exist.

Provider status: Gemini, ElevenLabs, SerpApi and Tiger Data account calls NOT executed; keys/quotas/models/balances not inspected. No .env files created. PRD lists required env names GEMINI_API_KEY, ELEVENLABS_API_KEY, SERPAPI_API_KEY, DATABASE_URL, SESSION_SECRET, NEXT_PUBLIC_APP_URL; optional REDIS_URL not needed. Model IDs must come from actual account readiness test. ElevenLabs input/output are separate from Gemini translation. Budgeted searches need attributable URL/title/retrievedAt and distinct public-unverified resource kind.

Deployment/environment: no Vercel/GitHub/Vultr resources created, no domain DNS checked, no production URLs. Devpost fetch unavailable through research browser; organizer site yielded no readable schedule. PRD's Sunday 25 October 2026 11:30 AM CDT deadline, mandatory video and prize limits remain supplied claims needing confirmation. No Discord/ceremony source contents independently verified. Reserve recording/submission window using supplied deadline conservatively.

## Tests and actual evidence

Research source `/Users/richkay/Desktop/code/cohue/docs/research/orchestration-spike/spike.mjs`; retained package.json/lock and results.txt alongside it. Actual install was in scratch `/tmp/cohue-orchestration-review`, not repo root. @mastra/core 1.79.0, @mastra/libsql 1.27.0, Zod 4.6.7 installed with ignore-scripts/no-audit. No resolved security audit performed.

In fresh scratch `recheck`, commands each exited 0 with passing assertions:
- `node spike.mjs mastra start`: suspended with objective persisted.
- `node spike.mjs mastra inspect`: separate process recovered suspended run.
- `node spike.mjs mastra reject`: false approval remained suspended (not COHUE decline/replan).
- `node spike.mjs mastra inspect`: still suspended after process exit.
- `node spike.mjs mastra resume`: true approval success, objective retained, research state ACTIVATED.
- `node spike.mjs custom start`: SQLite row AWAITING_APPROVAL.
- `node spike.mjs custom resume`: conditional update ACTIVATED, activation count 1.
- `node spike.mjs custom resume`: still count 1.

Custom sample is minimal JavaScript/SQLite illustrating proposed TS strategy, not typechecked TypeScript or PostgreSQL. Mastra duplicate resume, custom false approval, forced process death mid-step, provider retry, concurrency, deployed wake-up, authorization and real mission persistence remain untested. No production Vitest, Playwright, build or typecheck ran because no application exists. Full adoption conclusions and stronger production gate at `/Users/richkay/Desktop/code/cohue/docs/ORCHESTRATION_EVALUATION.md`.

## Blockers and immediate next steps

No known implemented app defects because no app exists. Readiness blockers: review/implementation authorization, visual approval, account-backed providers/DB, hosting/dispatcher, cross-device auth model, consent terms carry-forward, availability/ranking/cycle defaults, invitation channel, post-activation changes/capacity and retention policy. Scope/deadline is a critical risk; no silent reduction allowed.

Exact next action: user reviews `/Users/richkay/Desktop/code/cohue/docs/ENGINEERING_READINESS.md` and D1–D12 decision table. After explicit build authorization, lead establishes shared schemas/fixtures/scaffold; frontend presents design system for approval while backend proves real DB/provider/dispatcher readiness. Then complete onboarding -> mission -> deterministic matching -> invitations/decline/repair -> activation/room -> truthful event UI -> three-language voice/search -> deployed failure/mobile QA -> real video/Devpost. Do not activate these workstreams until review.

Proposed safety margins: freeze ~8:30 AM, video ~9:30 AM, submit target ~10:30 AM CDT on 25 October, relative to supplied 11:30 AM deadline; validate organizer schedule. All seven experiences/eight motions, all mobile sizes, basic impact/replay, text fallback and labeled showcase remain required.

## Change history

- 2026-10-24 initialization: read request/full PRD, inspect empty workspace, initialize Git; research licenses/compatibility; run bounded local orchestration comparison; preserve source/evidence; write audit/contracts/workstreams/rules and synchronized handoffs. No specialist activated or product features scaffolded.
