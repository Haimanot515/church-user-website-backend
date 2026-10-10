# Changelog

## Unreleased

- Security: per-session tokens with refresh rotation and reuse detection (migration `add_sessions`), permission-based roles replacing `isAdmin` checks (migration `add_roles_permissions`, existing admins become `super_admin`), and an audit log (migration `add_audit_log`). Breaking for clients: see docs/api.md.
- Security: per-account login lockout (migration `20261002100000_add_login_lockout`), per IP+email login limiter, env-configurable bcrypt cost / OTP / rate limits, stricter startup env validation with production rules, no-store headers on auth/admin routes.
- Added root tooling: ESLint, Prettier, EditorConfig, Docker, docker-compose, Render blueprint, SECURITY.md.
- Added .github (CI, security audit, Dependabot, templates), .husky hooks, docs/ and extra scripts.
