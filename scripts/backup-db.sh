#!/usr/bin/env bash
# Dump the Postgres database to backups/<timestamp>.sql.gz (needs pg_dump on PATH).
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; [ -f .env ] && . ./.env; set +a
: "${DATABASE_URL:?DATABASE_URL is not set}"

mkdir -p backups
OUT="backups/$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$OUT"
echo "Backup written to $OUT"
