# Environment variables

Copy `.env.example` to `.env`. `npm run check:env` validates the required ones, and `npm run secret` prints a value for `JWT_SECRET`.

| Variable                                                        | Required             | Notes                                                                                          |
| --------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                      | no                   | `development`, `production` or `test`                                                          |
| `PORT`                                                          | no                   | Default 5000                                                                                   |
| `DATABASE_URL`                                                  | yes                  | PostgreSQL connection string                                                                   |
| `JWT_SECRET`                                                    | yes                  | 32+ characters                                                                                 |
| `JWT_EXPIRES_IN`                                                | no                   | Access token lifetime, default `15m`                                                           |
| `REFRESH_EXPIRES_IN`                                            | no                   | Refresh token and session idle lifetime, default `7d`                                          |
| `SESSION_MAX_AGE_DAYS`                                          | no                   | A session can never be renewed past this age, 1 to 365 (default 30)                            |
| `REFRESH_RATE_LIMIT`                                            | no                   | Token refreshes per IP per 15 minutes (default 120)                                            |
| `CLIENT_URL`                                                    | no                   | Allowed browser origin                                                                         |
| `CORS_ORIGINS`                                                  | no                   | Comma-separated extra origins; localhost is allowed outside production                         |
| `BACKEND_URL`                                                   | prod                 | Public URL of this API, used for unsubscribe links                                             |
| `BREVO_API_KEY`                                                 | yes                  | Email via the Brevo HTTP API                                                                   |
| `EMAIL_FROM`                                                    | yes                  | Sender address                                                                                 |
| `EMAIL_FROM_NAME`                                               | no                   | Sender display name                                                                            |
| `CLOUDINARY_CLOUD_NAME`                                         | yes                  |                                                                                                |
| `CLOUDINARY_API_KEY`                                            | yes                  |                                                                                                |
| `CLOUDINARY_API_SECRET`                                         | yes                  |                                                                                                |
| `BCRYPT_SALT_ROUNDS`                                            | no                   | Default 10, range 4-15, minimum 10 in production                                               |
| `MAX_LOGIN_ATTEMPTS`                                            | no                   | Default 5; wrong passwords before the account is locked                                        |
| `LOCKOUT_DURATION_MINUTES`                                      | no                   | Default 15                                                                                     |
| `OTP_EXPIRES_IN_MINUTES`                                        | no                   | Default 10                                                                                     |
| `OTP_MAX_ATTEMPTS`                                              | no                   | Default 5 wrong codes per verification code                                                    |
| `THROTTLE_WINDOW_MINUTES`, `THROTTLE_LIMIT`                     | no                   | Global per-IP limit under `/api` (defaults 15 min, 600)                                        |
| `TRUST_PROXY_HOPS`                                              | no                   | Reverse proxies in front of the app, 0 to 10 (default 1, for Render)                           |
| `PASSWORD_MIN_LENGTH`                                           | no                   | Minimum length for new passwords, 6 to 128 (default 8)                                         |
| `MAX_REAUTH_ATTEMPTS`                                           | no                   | Wrong re-authentication passwords per admin per 15 minutes (default 5)                         |
| `TURNSTILE_ENABLED`                                             | no                   | `true` to require a Cloudflare Turnstile token on register, login and verify (default `false`) |
| `TURNSTILE_SECRET_KEY`                                          | when Turnstile is on | Turnstile secret; clients send the token in the `X-Captcha-Token` header                       |
| `AUTH_RATE_LIMIT`                                               | no                   | Login/register/verify per IP per 15 min (default 20)                                           |
| `LOGIN_RATE_LIMIT`                                              | no                   | Login attempts per IP + email per 15 min (default 8)                                           |
| `MAX_IMAGE_UPLOAD_MB`                                           | no                   | Default 10                                                                                     |
| `MAX_MEDIA_UPLOAD_MB`                                           | no                   | Default 50                                                                                     |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | seed only            | Never needed in production                                                                     |
| `ALLOW_PRODUCTION_SEED`                                         | no                   | Set `true` to let the seed run in production                                                   |

## Production rules (checked at startup)

The server refuses to start in production, and lists every problem at once, if:

- `JWT_SECRET` is under 32 characters or looks like a placeholder
- `JWT_EXPIRES_IN` or `REFRESH_EXPIRES_IN` is not like `30m`, `12h`, `7d`
- `BACKEND_URL` is missing, not https, or has a trailing slash
- neither `CLIENT_URL` nor `CORS_ORIGINS` is set, or an origin is not https, points to localhost, or has a path/trailing slash
- `BCRYPT_SALT_ROUNDS` is below 10
- `DATABASE_URL` is not a postgres connection string
