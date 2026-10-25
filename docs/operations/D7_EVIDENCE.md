# Deployed durable-worker evidence

Observed 25 October 2026 UTC (24 October America/Chicago). D7 passed for worker source **8385a347d96eb0c0bca6abefd936fdbb9453f90b**, on the existing approved Vultr instance edfad586-5b1d-4475-9387-63116bf26550 (155.138.162.102, Atlanta, Ubuntu24.04LTS). This is an actual persistent-host/Tiger Data proof, not local PostgreSQL, browser polling, a DB row or request after() acceleration. Lead must update the worker to the final compatible reviewed release and record its identity separately; this trace does not claim execution of later code.

## Installation and security

Authenticated Vultr console verified ED25519 host fingerprint `SHA256:2jpeNONYPTqn9wDmAEkTuZuOGI/sVXOZuFqA+A+LBZI` against SSH keyscan before any SSH credential transfer. Strict host verification stayed enabled. Existing bootstrap password was captured privately, never printed, and existing dedicated administration public key installed over authenticated SSH. No password changed, new host, paid addon or duplicate resource created.

Official Node v24.22.1 Linux x64 archive downloaded with certificate verification from nodejs.org. SHA256 `6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6` matched official SHASUMS256. npm11.19.1; exact reviewed Git archive deployed to /opt/cohue with .release-commit marker. `npm ci --ignore-scripts --no-fund --no-audit`:504 packages. Local resolved `npm audit --audit-level=high`:0 vulnerabilities. This does not certify all host packages or third-party services.

Systemd cohue-worker is active and enabled at boot, Restart=always/5seconds, runs as unprivileged cohue with ProtectSystem=strict/ProtectHome/NoNewPrivileges/PrivateTmp. Root-owned checkout prevents runtime source writes. Root0600 /etc/cohue/worker.env contains only runtime pooled DB/provider/session settings; excludes DATABASE_MIGRATION_URL and administrator credentials. Pool bounded to3; remote PostgreSQL certificate verification remains enabled. UFW active with only SSH22 allowed; no public application listener. Website remains https://cohue.tech on Vercel. No migration run on the worker.

## Actual trace

Safe structured evidence: [D7_TRACE_2026_10_25.json](D7_TRACE_2026_10_25.json). Rehearsal source: scripts/worker/prove-d7.ts, explicitly gated by COHUE_D7_ACCEPTANCE=1 and fixed to the already-installed labeled SHOWCASE instance. No LIVE records were created or mutated. Domain commands, scoped PostgreSQL and actual systemd process control were used. Both frontend and lead confirmed production app tabs/requests paused. No HTTP, SSE, after() or dispatch endpoint was called during the observation interval. DB reads observed state and did not execute jobs.

| UTC | Observation |
| --- | --- |
| 02:37:46 | Worker held inactive before queueing. |
| 02:40:16.758 | Mission c56d4456-60bf-42a3-bd34-b537587ab6a9 queued in installed SHOWCASE; worker still held. |
| 02:40:20.584 | Actual worker leased job75d11af9-8285-4d83-adf4-cc349329e611, owner09893897-6f8e-4a47-9d89-aa71a05c1122, fence1/attempt1; mission-row lock deliberately blocked commit. |
| 02:40:21 | Actual service npm/node process group SIGKILL, journal confirms main and child deaths/status9. |
| 02:40:26–28 | systemd automatically restarted; new worker owner prefix560aeffa. |
| 02:40:53.565 | Worker alone processed3jobs after natural30second lease expiry. |
| 02:41:49.608 | Post-wait read: PROPOSED; recovered job fence2/attempt2, all3jobs SUCCEEDED. Late original-owner/fence claimCommit returned false. |
| 02:41:56.626 | Labeled operator synthetic invite response and two concurrent domain activation attempts: exactly one winner. Events1–23 strictly contiguous, one MISSION_ACTIVATED,2unique memberships,3unique tasks,2unique invitations. |
| 02:41:59.551 | Service active and boot enabled. |
| See final trace entry | Synthetic proof mission cancelled through normal creator command, releasing showcase capacity after evidence collection. |

Faults/limits retained: first SSH attempt timed out before enqueueing, then bounded SSH retry succeeded. `systemctl kill --kill-whom=all` returned an auxiliary-process EINVAL despite actually killing main and node children; journal verifies deaths/restart. Harness initially stopped on that warning, released its lock in finally, then resumed observation on the SAME mission/job with original captured owner/fence. No second mission substituted. Corrected harness uses main-PID SIGKILL for future rehearsals. The 55second observation interval had no browser/request progress mechanism. Fence bigint is returned as a PostgreSQL string; comparisons normalize it without changing database behavior.

This proves restart/expired-lease recovery, unattended queued progress, stale-fence rejection and unique domain effects for the recorded deployment. Activation decisions were explicit synthetic operator actions, not real people, not autonomous consent. Concurrent activation exercised domain transactions; HTTP receipt replay is covered separately by integration suites, not claimed by this harness. Provider requests may repeat across crashes; no exactly-once external-call claim. Reboot was not performed; boot enablement is configuration evidence, while actual process restart was exercised. This is not full multilingual UI/physical-phone/retention acceptance or final release approval.
