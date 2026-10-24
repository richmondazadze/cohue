# Orchestration evaluation

Recommendation: retain custom typed TypeScript orchestration from PRD section 6. Mastra is technically viable and remains a candidate, but adoption is not approved by this report. The initialization request's preference for Mastra conflicts with the PRD's locked custom state machine; user review resolves the choice.

## Bounded experiment performed

No application scaffold or feature code was created. A local research script used @mastra/core 1.79.0, @mastra/libsql 1.27.0 and Zod 4, with persistent SQLite/libSQL files in `/tmp/cohue-orchestration-review/recheck`. Local runtime Node 26.4.0, npm 11.17.0. A minimal custom JavaScript sample expresses the proposed TypeScript command/state strategy with SQLite conditional updates; it is not a typechecked TypeScript prototype or PostgreSQL implementation. This limitation matters to the strength of the conclusion.

Source, exact lockfile and observed output are retained in `research/orchestration-spike/`. No API keys or provider calls were used. Research dependencies were installed in scratch, not at repository root. Install reported 160 packages added; this count describes the combined experiment, not a production size comparison. Install used --ignore-scripts --no-audit; no security-clean assertion follows.

| Experiment | Mastra result | Custom result |
| --- | --- | --- |
| Persist mission objective and wait | start returned suspended with persistent libSQL storage | row persisted AWAITING_APPROVAL and objective |
| Exit and recover | new process inspected suspended run by fixed run ID | new process read saved row before resume |
| Approval remains false | resume with false stayed suspended; another process confirmed suspended | no false-approval command path implemented; not tested |
| Resume after process restart | resume true returned success and ACTIVATED with original mission/objective | conditional update activated row and incremented activation count to 1 |
| Duplicate resume | not tested | second resume left activation count at 1 |
| Tiger Data/Drizzle transactions | not tested | not tested |
| Crash during external effect or concurrent responses | not tested | not tested |
| Forced kill during step, automatic retry/wake-up, deployed recovery | not tested | not tested |

Eight isolated process invocations completed with exit 0 and assertions passing. “reject” in the research script means false approval input, not COHUE's actual DECLINE/replan behavior. No real invitations, identity checks, matching or mission activation were implemented. The custom activation is a research state value. This is a local persistence/approval/restart proof, not a complete mission durability proof.

Reproduce without touching product code: copy this research directory into a new scratch directory, run `npm ci --ignore-scripts`, then execute the eight commands in results.txt by using `node spike.mjs <engine> <action>` in their recorded order. Use a new directory/empty research DB each run; fixed run IDs are intentional. Installed Node must support node:sqlite. Preserve the lockfile. The script is original experiment code; upstream library notices remain in installed packages.

## Evaluation

[Mastra suspend/resume](https://mastra.ai/docs/workflows/suspend-and-resume) and [snapshot persistence](https://mastra.ai/docs/workflows/snapshots) map well to approvals and restoration. [Storage](https://mastra.ai/docs/storage) must be persistent; file libSQL is only a local experiment and is unsuitable for Vercel ephemeral filesystems. Mastra would need a verified PostgreSQL adapter and an authenticated resume command. Its snapshots cannot authorize consent or atomically guarantee our domain writes by themselves.

The custom approach keeps mission state, job checkpoint, response and event sequence in a single PostgreSQL transactional model. It has fewer conceptual integration boundaries for this domain. Its cost is implementing leases, retry policy, scheduled dispatch, checkpoints, idempotency and observability correctly. The experiment does not prove those mechanisms; implementation must pass the gates below. Neither library selection supplies a wake-up trigger by merely storing data.

## Required implementation gate after user review

1. On actual Tiger Data, create mission/checkpoint/event/job atomically and wait for approval without an open request.
2. Restart runner; read persisted checkpoint and resume via scoped authenticated approval command.
3. Duplicate and race accept/decline/expiry commands; verify one response outcome, ordered events and no unauthorized activation.
4. Kill worker before/after provider response and before/after domain commit; lease recovery must avoid duplicate invitations/memberships and stale writes. External request cost can be at least once; record this honestly.
5. Concurrent activation attempts produce exactly one domain activation, one set of memberships/tasks and one authoritative event.
6. Close all browsers, restore runner and demonstrate progress without polling causing execution.
7. If custom runner cannot meet these within a bounded implementation window (proposed 60–90 minutes), revisit Mastra or a verified worker; do not install two orchestration platforms by default.
