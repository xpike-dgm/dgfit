#!/usr/bin/env bash
# Daily PostgreSQL dump for DG FIT; keeps the last 14 days.
set -euo pipefail
source /opt/dgfit/.env
dir=/opt/dgfit/backups
mkdir -p "$dir"
cd "$(dirname "$0")"
docker compose --env-file /opt/dgfit/.env exec -T db \
  pg_dump -U "$SPARKY_FITNESS_DB_USER" -d "$SPARKY_FITNESS_DB_NAME" -Fc \
  > "$dir/dgfit-$(date +%F).dump"
find "$dir" -name 'dgfit-*.dump' -mtime +14 -delete
