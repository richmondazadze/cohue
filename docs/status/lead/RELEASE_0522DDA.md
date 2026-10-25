# Release 0522dda (25 Oct 2026, ~06:25 CDT)

Web: cohue.tech auto-deployed from main (39f1b75 Coordinator chat + live alerts; 6f573f0 Coordinator "why" lines in Activity). Hosted CI green on 39f1b75 and 6f573f0.

Worker: user approved the production update in the project thread. Via the authenticated Vultr console, `scripts/worker/release.sh` (fetched from raw GitHub at 0522dda) downloaded the codeload archive of 0522ddaeac65601039af4c8cc2a539cf18f4a4cd (sha256 278b7ce785f51fab8a171403e822a613602e43ae3d5933261d0f9d1b92cc01f1), ran `npm ci --ignore-scripts` (506 packages), installed the reviewed unit, kept the previous release at /opt/cohue-266a240 and restarted. Result: Restart=always, RestartUSec=5s, UnitFileState=enabled, ActiveState=active, "worker 103d0b70 started".

Auto-restart proof: `systemctl kill -s KILL cohue-worker` → after 9 s NRestarts=1, ActiveState=active, "worker 74a1b692 started" (new lease owner).

Future updates from the console: `sh /opt/cohue/scripts/worker/on-host-acceptance.sh sync <40-hex commit>`; health: `... status`.
