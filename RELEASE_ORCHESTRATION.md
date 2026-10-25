# COHUE release orchestration

User now explicitly reassigns frontend and backend ownership to the existing Frontend Engineer and Fullstack and Backend Engineer chats and authorizes lead to dispatch these work orders. This supersedes temporary combined Claude ownership and historical implementation holds. Baseline796042e, shared main. Read AGENTS, BOTH current handoffs, original role implementation scope, contracts/resolutions/checkpoints and latest status notes before editing. Do not rebuild already implemented systems. Preserve D1–D12 and frozen approved DesignSystem1.0.

## Ownership and synchronization

Frontend owns existing frontend paths per AGENTS. Backend owns server/API/drizzle/worker/backend tests/operations paths. Lead owns contracts, fixtures, root dependencies/config/CI, integrated tests and final release decision. Never overwrite someone else's changes, reset checkout or stage all. No new infrastructure/paid addons or credential rotations. Existing Vultr instance only; no duplicate. No credentials in chat/reports/Git/screenshots. User authorized $5/month host and dedicated administration access/runtime-secret setup; changes requiring fresh browser confirmation still follow tool policy.

Each engineer may commit only owned paths plus serialized paired handoff append. Do not push/deploy or run shared .next builds until lead schedules integration window. Send proposed schema/config changes to Product Engineer before implementation. User explicitly authorizes messages between these two named chats and Product Engineer for dependency coordination, progress, blockers, reports and integration readiness only. No unrelated outreach. Report within own docs/status folder; append paired handoffs with lock script. Never remove another writer lock. Lead integrates/pushes/deploys and records immutable source/deploy/worker identities.

## Ordered checkpoints

| Gate | Frontend | Backend | Lead acceptance |
|---|---|---|---|
| R0 resynchronize | Read actual existing code/current status; inventory remaining UI defects | Read actual existing code/current status; inventory remaining runtime defects | Ownership restored; baseline/remote/CI/Vercel hashes recorded; contracts unchanged unless coordinated |
| R1 parallel hardening | Responsive/accessibility/motion and multilingual UI checks; fix owned defects | Secure Vultr installation + worker; provider/media/privacy/runtime checks | No shared-file collisions; defects and actual evidence recorded |
| R2 dependency integration | Implement creator translation review consumption only after agreed API; verify failure/revocation surfaces | Propose smallest contract-compliant owner translation-read resolution; enforce creator scope and negative auth tests | Lead approves/version coordinates producer+consumer+manifest/tests; no arbitrary auth broadening |
| R3 durable deployment | Browser smoke stays separate from proof; assist real-session UI flow | Unattended progress/restart/expired-lease/fence/event/unique-effect proof | Actual D7 traces; no polling/after() or local tests substituted |
| R4 complete journeys | Two-session desktop/mobile consent/repair/room/replay; voice and review in3languages | Backend supports same deployed commands, scope/privacy/retention/failure evidence | Full core path and failure scenarios pass on actual deployment; safe SHOWCASE data only for synthetic acceptance |
| R5 release candidate | Final viewport/keyboard/reducedmotion/performance/device matrix; demo storyboard/screenshots | Ops/restart/backup/secret expiry/runbook complete; outstanding risks explicit | Serialized npmcheck/audit/production smoke; hostedCI allrequired0skip; Git/Vercel/worker same compatible reviewed release; both handoffs identical |
| R6 submission | Prepare faithful screenshots/demo route, no invented success | Verify source and operational links, availability during demo | Verify actual organizer deadline/rules; protect2–3hours recording/Devpost; user records/submits unless explicitly delegated |

## Release gate evidence

Do not mark complete from code presence. Record command, UTC timestamp, target origin, commit, result, skipped checks and artifact path. Previous hostedCI796042e andd01e5a2 succeeded; previous64unit/14e2e and later70localunit evidence are historical, rerun appropriate final checks. Root npmcheck modifies shared.next; coordinate one runner. Production tests use dedicated SHOWCASE only, no destructive LIVE seeding/resetting; isolated disposable PostgreSQL for destructive suites. Any real-phone/screenreader check unavailable is marked untested and escalated, not fabricated.

Completion requires runtime installed+recoverable, all core flows actually working, no critical/high unresolved defects, multilingual mandatory checks, design fidelity/accessibility, secret-safe sync and accurate release report. Lead alone declares final readiness after review. Engineers return blocker-specific question only when independent work exhausted; do not pause merely because another lane is pending.
