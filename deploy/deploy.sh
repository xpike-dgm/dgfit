#!/usr/bin/env bash
# Pull the latest main and rebuild/restart DG FIT. Run on the server as root.
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch --quiet origin main
git reset --hard --quiet origin/main
cd deploy
docker compose --env-file /opt/dgfit/.env build
docker compose --env-file /opt/dgfit/.env up -d --remove-orphans
docker image prune -f >/dev/null
docker compose --env-file /opt/dgfit/.env ps
