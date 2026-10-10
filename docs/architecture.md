# Architecture

Express 5 API with Prisma 7 (PostgreSQL via `@prisma/adapter-pg`), Cloudinary for images and Brevo for email.

## Layout

| Folder         | Role                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `server.js`    | Loads env, validates config, connects to the DB, starts HTTP, handles graceful shutdown          |
| `app.js`       | Builds the Express app: helmet, CORS, JSON parsing, health checks, routes, 404 and error handler |
| `routes/`      | URL mapping and middleware chain per resource                                                    |
| `controllers/` | Parse the request and shape the response                                                         |
| `services/`    | Business logic and Prisma queries                                                                |
| `middleware/`  | Auth, admin check, language resolution, rate limits, uploads, error handler                      |
| `config/`      | Env validation and CORS origins, Cloudinary, mailer                                              |
| `utils/`       | Small helpers (pagination, pick, escapeHtml, unsubscribe token, sendError)                       |
| `prisma/`      | Split schema files, migrations, `prisma.service.js`, seed                                        |
| `tests/`       | `node:test` + supertest with Prisma and email stubbed                                            |
| `scripts/`     | Setup, backup, schema and commit tooling                                                         |

## Request flow

`request -> helmet/cors -> JSON/cookies -> globalLimiter -> resolveLanguage -> route -> (auth -> adminAuth -> upload) -> controller -> service -> Prisma -> response`

Errors thrown in controllers or services end up in `middleware/errorHandler.js`.

## Auth

JWT with a `tokenVersion` claim; logout bumps the version in the database and so revokes every token for that user. Admin status is read from the database on each admin request.

## Prisma service

`prisma/prisma.service.js` wraps the client in a Proxy so that code run inside its transaction helper automatically uses the transaction client.
