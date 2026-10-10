# Database

PostgreSQL, accessed through Prisma 7. The schema is split into one file per model in `prisma/schema/` (`schema.prisma` holds the generator and datasource). `prisma.config.js` points Prisma at that folder and reads `DATABASE_URL`.

## Common tasks

| Task                       | Command                                   |
| -------------------------- | ----------------------------------------- |
| Generate the client        | `npm run prisma:generate`                 |
| Apply migrations (prod/CI) | `npm run migrate`                         |
| Create a migration (dev)   | `npm run schema:update -- my_change_name` |
| Browse data                | `npm run prisma:studio`                   |
| Seed demo data (dev only)  | `npm run seed`                            |
| Back up                    | `npm run db:backup` (needs `pg_dump`)     |

## Rules

- Every schema change needs a migration committed in `prisma/schema/migrations/`.
- Never edit a migration that has already been applied anywhere.
- Never run the seed in production.
- `scripts/legacy/import-mongodb.js` was a one-off MongoDB import and is kept for reference.
