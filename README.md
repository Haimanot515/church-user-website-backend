# Church User Website — Backend

Express 5 + Prisma 7 (PostgreSQL) API. Images go to Cloudinary, transactional email via Brevo.

## Setup

```bash
cp .env.example .env      # fill in every value; JWT_SECRET must be 32+ chars
npm install
npm run build             # prisma generate + prisma migrate deploy
npm run dev               # or: npm start
```

## Deploying (e.g. Render)

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Set every variable from `.env.example` in the dashboard, plus `NODE_ENV=production`.
- Set `BACKEND_URL` to this service's public URL (used for unsubscribe links).
- Health checks: `GET /health` (process) and `GET /api/health` (process + database).
- Do **not** run `npm run seed` in production (it refuses unless `ALLOW_PRODUCTION_SEED=true`).

## Tests

```bash
npm test      # no database needed; Prisma and email are stubbed
```

`./test_endpoints.sh` is a smoke test against a running server.

## Security notes

- JWTs carry a `tokenVersion`; logout bumps it, which revokes all of that user's tokens.
  Admin status is always read from the database, never trusted from the token.
- Rate limits: global, login/verify, registration (sends email), subscribe, contact.
- Verification codes lock after `OTP_MAX_ATTEMPTS` wrong attempts; accounts lock after `MAX_LOGIN_ATTEMPTS` wrong passwords.
- Uploads: images max `MAX_IMAGE_UPLOAD_MB` (10), media library max `MAX_MEDIA_UPLOAD_MB` (50), type-checked.
- Unsubscribe links are HMAC-signed (see `utils/unsubscribeToken.js`).
- `scripts/legacy/import-mongodb.js` is the one-off MongoDB → Postgres import (needs `bson`, a dev dependency).

## More documentation

See [`docs/`](docs/README.md) for architecture, API reference, environment variables, database, deployment and contributing notes.
