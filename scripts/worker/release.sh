#!/bin/sh
# Root-console worker release (the documented archive procedure, scripted because the provider's web console
# drops shifted characters). Usage: sh release.sh <40-hex commit>. Downloads that exact commit's archive,
# installs dependencies without lifecycle scripts, installs the reviewed unit (Restart=always, enabled at
# boot), swaps directories keeping the previous release for rollback, and restarts the service.
set -eu
sha="${1:-}"
echo "$sha" | grep -Eq '^[0-9a-f]{40}$' || { echo "usage: sh release.sh <40-hex commit>"; exit 2; }
[ "$(hostname)" = "cohue-worker" ] || { echo "wrong host"; exit 1; }
[ "$(id -u)" = "0" ] || { echo "root console only"; exit 1; }
cd /opt
old="$(cut -c1-7 /opt/cohue/.release-commit)"
rm -rf /opt/cohue-new /opt/cohue-release.tar.gz
curl -fsSL -o /opt/cohue-release.tar.gz "https://codeload.github.com/richmondazadze/cohue/tar.gz/$sha"
echo "archive sha256 $(sha256sum /opt/cohue-release.tar.gz | cut -c1-64)"
mkdir /opt/cohue-new
tar -xzf /opt/cohue-release.tar.gz -C /opt/cohue-new --strip-components=1
cd /opt/cohue-new
npm ci --ignore-scripts --no-fund --no-audit --loglevel=error
echo "$sha" > .release-commit
chown -R --reference=/opt/cohue /opt/cohue-new
cp scripts/worker/cohue-worker.service /etc/systemd/system/cohue-worker.service
systemctl daemon-reload
systemctl enable -q cohue-worker
systemctl stop cohue-worker
[ -e "/opt/cohue-$old" ] && rm -rf "/opt/cohue-$old"
mv /opt/cohue "/opt/cohue-$old"
mv /opt/cohue-new /opt/cohue
rm -f /opt/cohue-release.tar.gz
systemctl start cohue-worker
sleep 8
echo "release $(cat /opt/cohue/.release-commit) (previous kept at /opt/cohue-$old)"
systemctl show cohue-worker -p ActiveState -p UnitFileState -p Restart -p RestartUSec -p NRestarts
journalctl -u cohue-worker -n 3 --no-pager -o cat
