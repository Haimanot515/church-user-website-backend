# Deployment

## Render

`render.yaml` is a Blueprint. Alternatively create a Web Service manually:

- Build command: `npm install && npm run build` (runs `prisma generate` and `prisma migrate deploy`)
- Start command: `npm start`
- Health check path: `/health` (`/api/health` also checks the database)
- Set every variable from `.env.example` plus `NODE_ENV=production` and `BACKEND_URL`.

## Docker

```bash
docker compose up --build        # API on :5000 with a local Postgres
```

The image runs `prisma migrate deploy` on start, then `node server.js`. For production pass real variables with `--env-file` or your platform's secret store.

## CI

`.github/workflows/ci.yml` validates the Prisma schema, lints and runs the tests on Node 20 and 22. `security.yml` runs a weekly `npm audit`.

## Checklist

- Strong `JWT_SECRET`, `CORS_ORIGINS` and `CLIENT_URL` set to the real frontends
- Migrations applied, seed not run
- Database backups scheduled
