# Contributing

## Setup

```bash
npm run setup      # or: cp .env.example .env && npm install && npm run build
npm run dev
```

## Hooks (Husky)

Installed automatically by `npm install` (the `prepare` script).

- `pre-commit`: `lint-staged` runs ESLint and Prettier on staged files
- `commit-msg`: requires `type(scope): summary`, e.g. `fix(auth): revoke tokens on logout`. Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- `pre-push`: runs `npm test`

Skip a hook in an emergency with `git commit --no-verify`.

## Before opening a PR

- `npm run lint` and `npm test`
- Add a migration for any schema change
- Add new env variables to `.env.example` and `docs/environment.md`
- Update `docs/api.md` when routes change
