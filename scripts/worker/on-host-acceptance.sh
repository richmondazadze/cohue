#!/bin/sh
# Root-console wrapper for the guarded on-host acceptance harnesses (d7 | privacy).
# Exists because the provider's web console drops shifted characters, so the
# environment-variable names and paths cannot be typed directly. Runtime env is
# parsed by Node --env-file, never shell-sourced.
set -eu
[ "$(hostname)" = "cohue-worker" ] || { echo "wrong host"; exit 1; }
[ "$(id -u)" = "0" ] || { echo "root console only"; exit 1; }
cd /opt/cohue
echo "release $(cat .release-commit)"
tsx="node_modules/tsx/dist/cli.mjs"
case "${1:-}" in
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
    echo "usage: sh on-host-acceptance.sh d7|privacy"; exit 2 ;;
esac
echo "exit 0; worker $(systemctl is-active cohue-worker)"
