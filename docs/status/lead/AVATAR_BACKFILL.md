# Production avatar backfill (25 Oct 2026, ~10:00 CDT)

User approved in the thread ("Approved. Run all. Also for existing user profile assign them each avatars").

- Read-only check: production cohue_migrations = 0000–0003 (0003_profile_identity present); participants_scoped_username index present. Confirms Codex's report.
- Before: 204 non-deleted profiles (LIVE 4, SHOWCASE 200), all without avatarId.
- Ran scripts/worker/assign-avatars.sql (84209bb; idempotent, deterministic from md5(id), skips profiles that already chose an avatar, leaves usernames): 204 updated, 0 without avatar after. Spread 3d_1 47, 3d_2 41, 3d_3 40, 3d_4 35, 3d_5 41. profile_version unchanged (avatar is presentation, not commitment terms).
- Showcase seeding (seed-showcase.ts, showcase-crowd.sql) now assigns avatars so a reseed keeps them.
- After: showcase-journey and session-continuity against https://cohue.tech passed.
