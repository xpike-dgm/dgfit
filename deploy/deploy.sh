#!/usr/bin/env bash
# Rebuild/restart DG FIT from the latest main. Run on the server as root.
#   deploy.sh               fetch main from origin (GitHub, deploy key)
#   deploy.sh <file.bundle> fetch main from a git bundle instead
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "${1:-}" ]; then
  git fetch --quiet "$1" "+main:refs/remotes/origin/main"
else
  git fetch --quiet origin main
fi
git reset --hard --quiet origin/main
echo "Deploying $(git log --oneline -1)"
cd deploy
docker compose --env-file /opt/dgfit/.env build
docker compose --env-file /opt/dgfit/.env up -d --remove-orphans
docker image prune -f >/dev/null
docker compose --env-file /opt/dgfit/.env ps
