# scripts

| Script                     | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `setup.sh`                 | First-time setup (.env, install, Prisma generate, migrate) |
| `generate-secret.js`       | Print a random value for `JWT_SECRET`                      |
| `check-env.js`             | Validate required env variables (`npm run check:env`)      |
| `update-schema.sh [name]`  | Format, validate, generate; optionally create a migration  |
| `backup-db.sh`             | Gzip'd `pg_dump` into `backups/`                           |
| `check-commit-msg.js`      | Commit message check used by the Husky hook                |
| `legacy/import-mongodb.js` | One-off MongoDB to Postgres import                         |
