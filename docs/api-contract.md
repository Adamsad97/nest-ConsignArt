# API Contract

Quick reference for every route, required role, and status codes. For full request/response schemas, use Swagger at `/api/docs`. All routes are prefixed with `/api/v1`.

Legend: `public` = no token required · `auth` = any authenticated user · role names = restricted to that role (`admin` is always allowed too).

## Auth

| Method | Path             | Access | Success | Errors                                     |
| ------ | ---------------- | ------ | ------- | ------------------------------------------ |
| POST   | `/auth/register` | public | 201     | 400 validation, 409 email taken            |
| POST   | `/auth/login`    | public | 200     | 401 invalid credentials / inactive account |
| POST   | `/auth/refresh`  | public | 200     | 401 invalid or expired refresh token       |
| POST   | `/auth/logout`   | auth   | 204     | 401                                        |

## Users

| Method | Path                    | Access                        | Success | Errors                                                                  |
| ------ | ----------------------- | ----------------------------- | ------- | ----------------------------------------------------------------------- |
| GET    | `/users`                | admin                         | 200     | 401, 403                                                                |
| GET    | `/users/:id`            | auth (self, or admin for any) | 200     | 401, 404                                                                |
| PATCH  | `/users/:id`            | auth (self, or admin for any) | 200     | 400 (unknown field rejected — `role`/`password` are not updatable here) |
| PATCH  | `/users/:id/activate`   | admin                         | 200     | 401, 403, 404                                                           |
| PATCH  | `/users/:id/deactivate` | admin                         | 200     | 401, 403, 404                                                           |
| DELETE | `/users/:id`            | admin                         | 204     | 409 if referenced by an artist (FK restrict)                            |

## Artists

| Method | Path                    | Access                 | Success | Errors                           |
| ------ | ----------------------- | ---------------------- | ------- | -------------------------------- |
| POST   | `/artists`              | gallery, admin         | 201     | 400                              |
| GET    | `/artists`              | gallery, admin         | 200     | —                                |
| GET    | `/artists/:id`          | gallery, admin, artist | 200     | 403 (not your gallery), 404      |
| PATCH  | `/artists/:id`          | gallery, admin         | 200     | 403, 404                         |
| PATCH  | `/artists/:id/transfer` | admin                  | 200     | 400 (target not a gallery), 404  |
| PATCH  | `/artists/:id/activate` | gallery, admin         | 200     | 403, 404                         |
| DELETE | `/artists/:id`          | gallery, admin         | 204     | soft delete (`isActive = false`) |

## Artworks

| Method | Path                   | Access                      | Success | Errors                                         |
| ------ | ---------------------- | --------------------------- | ------- | ---------------------------------------------- |
| GET    | `/artworks`            | public (cached 30s)         | 200     | —                                              |
| GET    | `/artworks/:id`        | public (cached 30s)         | 200     | 404                                            |
| POST   | `/artworks`            | gallery, admin              | 201     | `ARTWORK_LIMIT_EXCEEDED`, 400                  |
| PATCH  | `/artworks/:id/status` | gallery, admin (owner only) | 200     | `ARTWORK_ALREADY_SOLD`, 400 (same status), 403 |
| PATCH  | `/artworks/:id`        | gallery, admin (owner only) | 200     | 403                                            |
| DELETE | `/artworks/:id`        | gallery, admin (owner only) | 204     | 403                                            |

## Exhibitions

| Method | Path                                   | Access         | Success | Errors                                                      |
| ------ | -------------------------------------- | -------------- | ------- | ----------------------------------------------------------- |
| POST   | `/exhibitions`                         | gallery, admin | 201     | `ARTWORK_NOT_AVAILABLE`, 400 (empty `artworkIds`), 403, 404 |
| GET    | `/exhibitions`                         | gallery, admin | 200     | —                                                           |
| GET    | `/exhibitions/:id`                     | gallery, admin | 200     | 403, 404                                                    |
| PATCH  | `/exhibitions/:id`                     | gallery, admin | 200     | 403, 404                                                    |
| PATCH  | `/exhibitions/:id/start`               | gallery, admin | 200     | `EXHIBITION_NO_ARTWORKS`                                    |
| PATCH  | `/exhibitions/:id/close`               | gallery, admin | 200     | —                                                           |
| POST   | `/exhibitions/:id/artworks`            | gallery, admin | 201     | `ARTWORK_NOT_AVAILABLE`, 409 (already added)                |
| DELETE | `/exhibitions/:id/artworks/:artworkId` | gallery, admin | 204     | 404                                                         |
| DELETE | `/exhibitions/:id`                     | gallery, admin | 204     | 403, 404                                                    |

## Loans

| Method | Path                | Access         | Success | Errors                       |
| ------ | ------------------- | -------------- | ------- | ---------------------------- |
| POST   | `/loans`            | gallery, admin | 201     | `ARTWORK_NOT_AVAILABLE`, 403 |
| GET    | `/loans`            | gallery, admin | 200     | —                            |
| GET    | `/loans/:id`        | gallery, admin | 200     | 403, 404                     |
| PATCH  | `/loans/:id/return` | gallery, admin | 200     | `LOAN_NOT_ACTIVE`            |

## Sales

| Method | Path                 | Access                 | Success | Errors                                                                 |
| ------ | -------------------- | ---------------------- | ------- | ---------------------------------------------------------------------- |
| POST   | `/sales`             | gallery, admin         | 201     | `ARTWORK_ON_LOAN`, `ARTWORK_NOT_AVAILABLE`, `BELOW_RESERVE_PRICE`, 403 |
| GET    | `/sales`             | gallery, admin, artist | 200     | scoped to caller                                                       |
| GET    | `/sales/:id`         | gallery, admin, artist | 200     | 403, 404                                                               |
| GET    | `/sales/:id/invoice` | gallery, admin         | 200     | 403, 404                                                               |

## Reports

| Method | Path                                          | Access                 | Success |
| ------ | --------------------------------------------- | ---------------------- | ------- |
| POST   | `/reports/artist-statements`                  | gallery, admin         | 201     |
| GET    | `/reports/artist-statements/artist/:artistId` | gallery, admin, artist | 200     |
| GET    | `/reports/dashboard/gallery`                  | gallery, admin         | 200     |
| GET    | `/reports/dashboard/artist/:artistId`         | artist, gallery, admin | 200     |
| GET    | `/reports/dashboard/admin`                    | admin                  | 200     |

## Business error codes

Thrown as `BusinessRuleViolationException`, caught by `BusinessRuleViolationFilter`, returned as `{ statusCode: 422, error: "BusinessRuleViolation", rule: "<CODE>", message }`.

| Code                     | Meaning                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `ARTWORK_LIMIT_EXCEEDED` | Artist already has 50 active artworks                                   |
| `ARTWORK_ALREADY_SOLD`   | Cannot change the status of a sold artwork                              |
| `ARTWORK_ON_LOAN`        | Cannot sell an artwork currently on loan                                |
| `ARTWORK_NOT_AVAILABLE`  | Artwork must be `available` for this operation (sale, loan, exhibition) |
| `BELOW_RESERVE_PRICE`    | Sale price is below the artwork's reserve price                         |
| `EXHIBITION_NO_ARTWORKS` | Cannot start an exhibition with zero artworks                           |
| `LOAN_NOT_ACTIVE`        | Cannot return a loan that isn't active                                  |

## Generic error shape

Everything else (validation, auth, not found, unexpected) goes through `GlobalExceptionFilter`:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "...",
  "timestamp": "...",
  "path": "..."
}
```
