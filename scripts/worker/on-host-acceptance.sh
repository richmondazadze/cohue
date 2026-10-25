#!/bin/sh
# Root-console wrapper for the guarded on-host acceptance harnesses (d7 | privacy),
# plus status (release, service health, restart policy) and sync (update to origin/main, then restart).
# Exists because the provider's web console drops shifted characters, so the
# environment-variable names and paths cannot be typed directly. Runtime env is
# parsed by Node --env-file, never shell-sourced.
set -eu
[ "$(hostname)" = "cohue-worker" ] || { echo "wrong host"; exit 1; }
[ "$(id -u)" = "0" ] || { echo "root console only"; exit 1; }
cd /opt/cohue
echo "release $(cat .release-commit)"
tsx="node_modules/tsx/dist/cli.mjs"
git="git -c safe.directory=/opt/cohue"
case "${1:-}" in
  status)
    echo "checkout $($git rev-parse --short HEAD)"
    systemctl show cohue-worker -p ActiveState -p SubState -p UnitFileState -p Restart -p RestartUSec -p NRestarts -p ActiveEnterTimestamp
    journalctl -u cohue-worker -n 5 --no-pager -o cat
    ;;
  sync)
    # Update procedure from HOST_SETUP.md: fetch, check out the exact commit, npm ci, restart. No reset/clean.
    $git fetch -q origin main
    target="$($git rev-parse origin/main)"
    $git checkout -q --detach "$target"
    npm ci --no-audit --no-fund --loglevel=error
    echo "$target" > .release-commit
    # The reviewed unit restarts on any exit (Restart=always) and starts on boot (enabled).
    cp scripts/worker/cohue-worker.service /etc/systemd/system/cohue-worker.service
    systemctl daemon-reload
    systemctl enable -q cohue-worker
    systemctl restart cohue-worker
    sleep 8
    echo "release $(cat .release-commit)"
    systemctl show cohue-worker -p ActiveState -p Restart -p NRestarts
    journalctl -u cohue-worker -n 3 --no-pager -o cat
    ;;
  d7)
    # The harness requires the worker held before it queues the mission; it restarts and kills it itself.
    systemctl stop cohue-worker
    COHUE_D7_ACCEPTANCE=1 COHUE_D7_ON_HOST=1 node --env-file=/etc/cohue/worker.env "$tsx" --conditions=react-server scripts/worker/prove-d7.ts
    ;;
  privacy)
    # Progress must come only from the running persistent worker.
    [ "$(systemctl is-active cohue-worker)" = "active" ] || { echo "worker must be active"; exit 1; }
    COHUE_PRIVACY_ACCEPTANCE=1 node --env-file=/etc/cohue/worker.env "$tsx" --conditions=react-server scripts/worker/privacy-smoke.ts
    ;;
  *)
    echo "usage: sh on-host-acceptance.sh status|sync|d7|privacy"; exit 2 ;;
esac
echo "exit 0; worker $(systemctl is-active cohue-worker)"
