#!/usr/bin/env bash
# After editing prisma/schema/*.prisma: format, validate, regenerate the client.
# Pass a migration name to also create a dev migration:  ./scripts/update-schema.sh add_new_field
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma format
npx prisma validate
npx prisma generate

if [ "${1:-}" != "" ]; then
  npx prisma migrate dev --name "$1"
fi
