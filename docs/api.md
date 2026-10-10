# API reference

Base path: `/api`. Health checks: `GET /health`, `GET /api/health`.

Legend: **public** = no login, **auth** = valid JWT, **admin** = JWT + the permission for that route (see `config/permissions.js`). Language is resolved by the `resolveLanguage` middleware.

> Generated from `routes/*.js`. If routes change, update this file (or regenerate it).

## /api/auth

| Method | Path                     | Access                         |
| ------ | ------------------------ | ------------------------------ |
| POST   | `/api/auth/register`     | public                         |
| POST   | `/api/auth/login`        | public                         |
| POST   | `/api/auth/verify`       | public                         |
| POST   | `/api/auth/refresh`      | public (refresh token in body) |
| GET    | `/api/auth/me`           | auth                           |
| POST   | `/api/auth/logout`       | auth (ends this session)       |
| POST   | `/api/auth/logout-all`   | auth                           |
| GET    | `/api/auth/sessions`     | auth                           |
| DELETE | `/api/auth/sessions/:id` | auth                           |

Login and verify return `token` (short-lived access token), `refreshToken` and `user` (`id`, `name`, `email`, `role`, `isAdmin`, `permissions`). Send the access token as `Authorization: Bearer`. When a request returns 403 with `code` `token_expired`, call `/api/auth/refresh` with `{ "refreshToken": "..." }` and store both new tokens; the old refresh token stops working. A 403 with `code` `session_ended` means the user must sign in again.

## /api/landingheros

| Method | Path                          | Access |
| ------ | ----------------------------- | ------ |
| GET    | `/api/landingheros`           | public |
| PUT    | `/api/landingheros/hero`      | admin  |
| PUT    | `/api/landingheros/academic`  | admin  |
| PUT    | `/api/landingheros/videos`    | admin  |
| PUT    | `/api/landingheros/lifestyle` | admin  |

## /api/posts

| Method | Path                     | Access                 |
| ------ | ------------------------ | ---------------------- |
| GET    | `/api/posts`             | public                 |
| GET    | `/api/posts/latest`      | public                 |
| GET    | `/api/posts/trending`    | public                 |
| GET    | `/api/posts/recommended` | public                 |
| GET    | `/api/posts/featured`    | public                 |
| GET    | `/api/posts/:id`         | public (optional auth) |
| POST   | `/api/posts`             | admin                  |
| PUT    | `/api/posts/:id`         | admin                  |
| DELETE | `/api/posts/:id`         | admin                  |

## /api/media

| Method | Path                     | Access                 |
| ------ | ------------------------ | ---------------------- |
| GET    | `/api/media`             | public (optional auth) |
| GET    | `/api/media/latest`      | public                 |
| GET    | `/api/media/trending`    | public                 |
| GET    | `/api/media/recommended` | public                 |
| GET    | `/api/media/featured`    | public                 |
| GET    | `/api/media/type/:type`  | public                 |
| GET    | `/api/media/:id`         | public (optional auth) |
| POST   | `/api/media`             | admin                  |
| PUT    | `/api/media/:id`         | admin                  |
| DELETE | `/api/media/:id`         | admin                  |

## /api/languages

| Method | Path                 | Access |
| ------ | -------------------- | ------ |
| GET    | `/api/languages`     | public |
| GET    | `/api/languages/:id` | public |
| POST   | `/api/languages`     | admin  |
| PUT    | `/api/languages/:id` | admin  |
| DELETE | `/api/languages/:id` | admin  |

## /api/categories

| Method | Path                  | Access |
| ------ | --------------------- | ------ |
| GET    | `/api/categories`     | public |
| GET    | `/api/categories/:id` | public |
| POST   | `/api/categories`     | admin  |
| PUT    | `/api/categories/:id` | admin  |
| DELETE | `/api/categories/:id` | admin  |

## /api/contact

| Method | Path           | Access |
| ------ | -------------- | ------ |
| POST   | `/api/contact` | auth   |

## /api/about

| Method | Path             | Access |
| ------ | ---------------- | ------ |
| GET    | `/api/about`     | public |
| POST   | `/api/about`     | admin  |
| PUT    | `/api/about/:id` | admin  |
| DELETE | `/api/about/:id` | admin  |

## /api/promotions

| Method | Path                     | Access |
| ------ | ------------------------ | ------ |
| GET    | `/api/promotions`        | public |
| GET    | `/api/promotions/latest` | public |
| GET    | `/api/promotions/:id`    | public |
| POST   | `/api/promotions`        | admin  |
| PUT    | `/api/promotions/:id`    | admin  |
| DELETE | `/api/promotions/:id`    | admin  |

## /api/subscribers

| Method | Path                           | Access |
| ------ | ------------------------------ | ------ |
| POST   | `/api/subscribers`             | public |
| GET    | `/api/subscribers/unsubscribe` | public |
| GET    | `/api/subscribers`             | admin  |

## /api/churches

| Method | Path                            | Access |
| ------ | ------------------------------- | ------ |
| POST   | `/api/churches/assignment`      | admin  |
| PUT    | `/api/churches/assignment/:id`  | admin  |
| GET    | `/api/churches/assignments`     | public |
| GET    | `/api/churches/current`         | public |
| GET    | `/api/churches/current/:userId` | public |
| DELETE | `/api/churches/assignment/:id`  | admin  |
| GET    | `/api/churches/primary`         | public |
| GET    | `/api/churches`                 | public |
| GET    | `/api/churches/:id`             | public |
| POST   | `/api/churches`                 | admin  |
| PUT    | `/api/churches/:id`             | admin  |
| DELETE | `/api/churches/:id`             | admin  |

## /api/church-story

| Method | Path                    | Access |
| ------ | ----------------------- | ------ |
| GET    | `/api/church-story`     | public |
| GET    | `/api/church-story/:id` | public |
| POST   | `/api/church-story`     | admin  |
| PUT    | `/api/church-story/:id` | admin  |
| DELETE | `/api/church-story/:id` | admin  |

## /api/mission-vision

| Method | Path                      | Access |
| ------ | ------------------------- | ------ |
| GET    | `/api/mission-vision`     | public |
| POST   | `/api/mission-vision`     | admin  |
| PUT    | `/api/mission-vision/:id` | admin  |
| DELETE | `/api/mission-vision/:id` | admin  |

## /api/bank-accounts

| Method | Path                     | Access |
| ------ | ------------------------ | ------ |
| GET    | `/api/bank-accounts`     | public |
| GET    | `/api/bank-accounts/:id` | public |
| POST   | `/api/bank-accounts`     | admin  |
| PUT    | `/api/bank-accounts/:id` | admin  |
| DELETE | `/api/bank-accounts/:id` | admin  |

## /api/services

| Method | Path                     | Access |
| ------ | ------------------------ | ------ |
| GET    | `/api/services`          | public |
| GET    | `/api/services/featured` | public |
| GET    | `/api/services/active`   | public |
| GET    | `/api/services/:id`      | public |
| POST   | `/api/services`          | admin  |
| PUT    | `/api/services/:id`      | admin  |
| DELETE | `/api/services/:id`      | admin  |

## /api/faq

| Method | Path                  | Access |
| ------ | --------------------- | ------ |
| GET    | `/api/faq/categories` | public |
| GET    | `/api/faq`            | public |
| POST   | `/api/faq`            | admin  |
| PUT    | `/api/faq/:id`        | admin  |
| DELETE | `/api/faq/:id`        | admin  |

## /api/admin

| Method              | Path                                                                                                                                               | Permission          |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| GET                 | `/api/admin/users`                                                                                                                                 | `USER_READ`         |
| PUT                 | `/api/admin/users/:id` (name, isVerified)                                                                                                          | `USER_UPDATE`       |
| PUT                 | `/api/admin/users/:id/role` (body `{ "role": "editor" }`, needs `X-Reauth-Credential`)                                                             | `USER_ROLE_ASSIGN`  |
| POST                | `/api/admin/users/:id/logout`                                                                                                                      | `USER_FORCE_LOGOUT` |
| DELETE              | `/api/admin/delete/:id` (needs `X-Reauth-Credential`)                                                                                              | `USER_DELETE`       |
| GET                 | `/api/admin/threads`, `/messages/:threadId`, `/unread-users-count`                                                                                 | `MESSAGE_READ`      |
| POST                | `/api/admin/reply`                                                                                                                                 | `MESSAGE_REPLY`     |
| GET                 | `/api/admin/permissions`                                                                                                                           | `PERMISSION_READ`   |
| GET                 | `/api/admin/roles`, `/api/admin/roles/:id`                                                                                                         | `ROLE_READ`         |
| POST / PUT / DELETE | `/api/admin/roles`, `/api/admin/roles/:id` (need `X-Reauth-Credential`)                                                                            | `ROLE_MANAGE`       |
| GET                 | `/api/admin/audit-logs` (filters: `action`, `actorId`, `entity`, `entityId`, `targetUserId`, `outcome`, `severity`, `from`, `to`, `page`, `limit`) | `AUDIT_LOG_READ`    |

## /api/church-persons

| Method | Path                            | Access |
| ------ | ------------------------------- | ------ |
| GET    | `/api/church-persons`           | public |
| GET    | `/api/church-persons/:id`       | public |
| POST   | `/api/church-persons`           | admin  |
| PUT    | `/api/church-persons/:id`       | admin  |
| PATCH  | `/api/church-persons/:id/photo` | admin  |
| DELETE | `/api/church-persons/:id`       | admin  |

## /api/homeheros

| Method | Path                 | Access |
| ------ | -------------------- | ------ |
| GET    | `/api/homeheros`     | public |
| POST   | `/api/homeheros`     | admin  |
| PUT    | `/api/homeheros/:id` | admin  |
| DELETE | `/api/homeheros/:id` | admin  |
