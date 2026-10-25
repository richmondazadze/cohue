# Release b07657b completed (25 Oct 2026, ~09:55 CDT)

Codex hit its usage limit mid-release; Claude finished it at the user's request ("Finish it up").

- Web: Vercel production dpl_7WghmBZGwq4QCW4NbEhqP6mMvK8z (cohue-qv1bs6ycn) serves b07657b on cohue.tech since 09:48 CDT. Hosted CI for b07657b: success (earlier failures on 9fbbb05/15717ce/7f219cc were stale landing/showcase-button expectations, fixed in b07657b).
- Database: Codex reported migration 0003_profile_identity applied through the Tiger SQL console with the ledger and the participants_scoped_username unique index verified. Claude did not re-query production (blocked pending approval); the live journey below exercised the new profile shape successfully.
- Worker: was on 0522dda, whose strict profile contract predates username/avatarId, so it could not parse migrated profiles. Released b07657b from the Vultr console with `on-host-acceptance.sh sync b07657be22d2f30c352cb87ff4fa57de72d7af31`: archive sha256 1d819c2e47a1afc2ff6e8b324d9f192433ff8269492c59a48bffd0b02aa9c78f, npm ci 506 packages, previous kept at /opt/cohue-0522dda, Restart=always, enabled, active, "worker 0e448283 started".
- Live verification against https://cohue.tech after the worker release: showcase-journey (worker discovery over the 200-person crowd, activation, en/es/fr briefs, Spanish kickoff plan) and session-continuity specs, 2/2 passed; the synthetic mission was cancelled by the spec.

Left as found: Codex's unstaged `.gitignore` line (`/motion/`). Still open: D7 rerun on the current release, physical two-phone run.
