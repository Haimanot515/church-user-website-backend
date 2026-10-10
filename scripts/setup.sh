#!/usr/bin/env bash
# First-time local setup: install deps, create .env, generate Prisma client, run migrations.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(node scripts/generate-secret.js)
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${SECRET}|" .env && rm -f .env.bak
  echo "Created .env with a fresh JWT_SECRET. Fill in DATABASE_URL, Brevo and Cloudinary values."
fi

npm install
npx prisma generate

if grep -qE '^DATABASE_URL=postgresql://USER:PASSWORD' .env; then
  echo "DATABASE_URL is still the placeholder; edit .env then run: npm run migrate"
else
  npm run migrate
fi
echo "Setup finished. Start with: npm run dev"
