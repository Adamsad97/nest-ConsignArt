# ConsignArt

[![CI](https://github.com/Adamsad97/nest-ConsignArt-/actions/workflows/ci.yml/badge.svg)](https://github.com/Adamsad97/nest-ConsignArt-/actions/workflows/ci.yml)

B2B REST API for art galleries to manage artwork consignment: an artist entrusts artworks to a gallery, which exhibits and sells them for a commission. Built with NestJS, TypeORM and PostgreSQL.

## Features

- **Auth** — JWT access + refresh tokens, bcrypt, admin-gated gallery activation. Admin accounts can't be self-registered (only `gallery`/`artist`/`collector` are open at signup) — the first admin is bootstrapped with `npm run seed:admin`
- **Artists** — gallery-owned catalog, admin-only transfer between galleries
- **Artworks** — consignment lifecycle (`available` → `on_loan` → `sold`/`returned`), full status history, reserve price enforcement, 50-active-artworks-per-artist limit
- **Exhibitions & loans** — artwork availability automatically tracked
- **Sales** — atomic transaction (row-level lock), tiered commission (40/35/30%), invoice + artist statement generated automatically for every sale
- **Reports** — dashboards for gallery, artist and admin

## Technical choices

| Choice | Why |
|---|---|
| PostgreSQL over SQLite | Row-level locking needed for the sale transaction, relational integrity across 11 tables |
| JWT access + refresh | Stateless access; refresh tokens stored hashed and revocable |
| Vitest | Faster than Jest for this project size, native ESM/TS support via SWC |
| Admin bootstrapped via seed script, not public signup | Self-registering as `admin` would let anyone bypass the gallery-validation workflow entirely |

## Database schema

```
users ─┬─< artists ─< artworks ─┬─< artwork_status_history
       │                        ├─< exhibition_artworks >─ exhibitions
       │                        ├─< loans
       │                        └─< sales ── invoices
       ├─< exhibitions
       ├─< loans
       ├─< sales
       └─< refresh_tokens

artists ─< artist_statements
```

## Git conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(scope): summary`, `fix(scope): summary`, `docs: ...`, `test: ...`, `ci: ...`).

## Prerequisites

- Docker and Docker Compose

## 1. Clone

```bash
git clone https://github.com/Adamsad97/nest-ConsignArt.git
cd nest-ConsignArt
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Default values work out of the box with Docker Compose.

## 3. Start the project

```bash
docker compose up --build
```

Starts all three services in one command:

| Service      | URL                            |
| ------------ | ------------------------------ |
| API          | http://localhost:3000/api/v1   |
| Swagger docs | http://localhost:3000/api/docs |
| pgAdmin      | http://localhost:5050          |

The database schema is created automatically on first boot (development mode).

Other useful commands: `docker compose up -d` (background), `docker compose logs -f api`. See step 9 to stop and clean up.

## 4. Database migrations (optional)

Only needed to build the schema from migrations instead of the automatic dev sync (e.g. for a production-like setup).

```bash
npm run migration:run        # apply pending migrations
npm run migration:generate   # generate a migration from entity changes
npm run migration:revert     # roll back the last migration
```

## 5. Create the first admin account

Admin accounts can't be created through `POST /auth/register` (only `gallery`, `artist` and `collector` can self-register — see [Technical choices](#technical-choices)). Bootstrap the first admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` in your `.env`:

```bash
npm run seed:admin
```

**Run this from your host machine (with `npm install` done locally), not with `docker compose exec api ...`.** The script connects to Postgres through the port Docker Compose publishes on the host (`localhost:5434`, mapped from the `db` container), which only resolves from outside the Docker network. It also needs `ts-node`, a dev dependency stripped from the production `api` image, so running it inside that container fails outright.

Safe to re-run: it's a no-op if that email already has an account.

## 6. Interact with the API

All routes are prefixed with `/api/v1`. Explore and test every endpoint interactively via Swagger: **http://localhost:3000/api/docs**

Typical flow: register a gallery (`POST /auth/register`) → log in as the seeded admin (`POST /auth/login`) and activate it (`PATCH /users/:id/activate`) → the gallery logs in (`POST /auth/login`), registers an artist (`POST /artists`) and consigns an artwork (`POST /artworks`) → a sale is recorded (`POST /sales`), which also generates an invoice and an artist statement → dashboards are available under `GET /reports/dashboard/*`.

## 7. Inspect the data

Open **pgAdmin** at http://localhost:5050 (`admin@consignart.com` / `admin`), add a server pointing to host `db`, port `5432`, using the credentials from `.env` — or connect any SQL client to `localhost:5434` directly.

## 8. Run tests

```bash
npm test          # unit tests
npm run test:e2e  # integration test (requires the db container running, see step 3)
```

## 9. Stop and clean up

```bash
docker compose down              # stop and remove containers (keeps images and data)
docker compose down -v           # also delete the database volume (wipes all data)
docker compose down --rmi all    # also delete the images built for this project
docker compose down -v --rmi all # full cleanup: containers, volumes and images
```
