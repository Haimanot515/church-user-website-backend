# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Email the maintainers privately
with a description, reproduction steps, and the affected endpoint or file. You will get an
acknowledgement as soon as possible and a fix timeline once the report is confirmed.

## Practices in this project

- Secrets live only in environment variables (`.env` is git-ignored; see `.env.example`).
- `JWT_SECRET` must be 32+ characters. Access tokens are short-lived (`JWT_EXPIRES_IN`, default 15m) and bound to a server-side session, so logging out or ending a session revokes them at once.
- Refresh tokens are random, stored only as a SHA-256 hash, and rotated on every use. Replaying an old refresh token after the short grace window ends every session of that user and is logged as a critical event. Sessions also expire after `SESSION_MAX_AGE_DAYS` however often they are renewed.
- Access is permission based (roles hold permissions, see `config/permissions.js`) and always read from the database, never trusted from the token. Nobody can assign a role, or grant a permission, that has more access than they hold themselves, and the last super admin cannot be removed.
- Security-relevant events are written to an append-only audit log (logins and failures, lockouts, refresh reuse, denied access, user, role and permission changes, and every admin create/update/delete). Secrets are redacted and request bodies are never stored, only field names.
- Rate limiting on global, login/verify, registration, subscribe and contact endpoints; login is also limited per IP + email.
- Per-account lockout after `MAX_LOGIN_ATTEMPTS` wrong passwords for `LOCKOUT_DURATION_MINUTES`; a locked account refuses even the right password until the lock expires.
- Strict startup validation of environment variables, with extra production rules (https origins, https `BACKEND_URL`, strong `JWT_SECRET`, bcrypt cost of at least 10).
- `Cache-Control: no-store` on `/api/auth` and `/api/admin` responses.
- Verification codes lock after `OTP_MAX_ATTEMPTS` (default 5) wrong attempts.
- Passwords follow a length-first policy: no composition rules, common, repeated, sequential and name/email-based passwords are rejected (`PASSWORD_MIN_LENGTH`).
- Optional Cloudflare Turnstile captcha on register, login and verify (`TURNSTILE_ENABLED`); it fails closed when enabled.
- Deleting a user and changing role or admin flags require the admin's password again (`X-Reauth-Credential` header); wrong passwords are rate limited per admin.
- Proxy trust is configurable (`TRUST_PROXY_HOPS`) and the API sends a locked-down Content-Security-Policy.
- Uploads are size- and type-checked; unsubscribe links are HMAC-signed.
- Production seeding is blocked unless `ALLOW_PRODUCTION_SEED=true`.

## Hardening checklist before go-live

- Rotate any key that was ever committed or shared.
- Set `NODE_ENV=production`, `BACKEND_URL`, `CLIENT_URL` and `CORS_ORIGINS`.
- Run `npm audit` regularly and keep dependencies updated.

## Known limits

- Rate-limit counters are kept in memory per instance. If you scale to several instances, move them to a shared store such as Redis.
- The audit log has no retention or archive job yet; it grows until you prune it. Audit writes are best effort: a database failure is logged to the console and the request still succeeds.
- Lockout responses reveal that an account exists once it is locked. This is a deliberate trade-off against password-guessing.
