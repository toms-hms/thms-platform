# THMS Platform

A full-stack home contractor management application. Homeowners can manage projects, communicate with contractors, track quotes, and generate AI-assisted concept images — all in one place.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Python 3.12, Django 5.2, Graphene (GraphQL) |
| Database | PostgreSQL via the Django ORM |
| Object Storage | MinIO (S3-compatible) |
| Cache | Redis |
| Audit | django-auditlog |
| Auth | JWT (access + refresh tokens) |
| AI | OpenAI (DALL-E 3 + GPT-4o-mini) |
| Email | Gmail API / Microsoft Graph API |
| Monorepo | Turborepo + npm workspaces |

## Project Structure

```
thms-platform/
├── apps/
│   ├── api/          # Django + Graphene GraphQL API
│   └── web/          # Next.js frontend
├── docker-compose.yml          # Infrastructure services (postgres, redis, minio)
├── docker-compose.override.yml # Dev services (api + web hot reload)
├── docker-compose.prod.yml     # Production build
└── .env.example
```

## Prerequisites

- Docker + Docker Compose
- `make` (comes with macOS/Linux; Windows: use WSL or run the Docker commands directly)

## Quick Start (Docker)

### 1. Set up environment

```bash
cp .env.example .env
# Fill in required values (see Environment Variables below)
```

Minimum required:
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — at least 32 chars each
- `ENCRYPTION_KEY` — exactly 32 chars

### 2. Start everything

```bash
make run
```

This starts Postgres, Redis, MinIO, the API (`:3001`), and the web app (`:3000`) with hot reload.

### 3. Run migrations (first time only)

```bash
make migrate
```

### 4. (Optional) Seed with test data

```bash
make seed
```

Open `http://localhost:3000` — done.

## Make Commands

| Command | Description |
|---|---|
| `make run` | Start all services (foreground) |
| `make run-d` | Start all services (background) |
| `make stop` | Stop all services |
| `make build` | Rebuild Docker images |
| `make restart` | Stop and restart everything |
| `make logs` | Tail logs for all services |
| `make logs-api` | Tail API logs only |
| `make logs-web` | Tail web logs only |
| `make migrate` | Generate and apply database migrations |
| `make migrate-deploy` | Apply migrations only (production) |
| `make migrate-adopt` | First run against a database created by the previous API (`--fake-initial`) |
| `make seed` | Seed database with demo data |
| `make shell-db` | Open a psql shell |
| `make graphql-schema` | Write the schema to `schema.graphql` |
| `make test` | Run all tests |
| `make test-api` | Run backend tests only |
| `make test-web` | Run frontend tests only |
| `make shell-api` | Open a shell in the API container |
| `make shell-web` | Open a shell in the web container |
| `make clean` | Stop and remove all containers + volumes |

## Production

```bash
docker compose -f docker-compose.prod.yml up --build
```

Requires all env vars to be set — no defaults for secrets in prod.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret key (required in production) |
| `DJANGO_ENV` | `development`, `test` or `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET` | JWT signing secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret (32+ chars) |
| `ENCRYPTION_KEY` | AES-256 key for OAuth tokens (exactly 32 chars) |
| `OPENAI_API_KEY` | OpenAI API key (for AI features) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret |
| `NEXT_PUBLIC_API_URL` | API URL for the frontend |
| `GRAPHIQL_ENABLED` | Serve GraphiQL at `/graphql` (development only) |

## Running Tests

```bash
make test        # all tests
make test-api    # backend only
make test-web    # frontend only
```

Backend tests use Django's test runner against a real database, with every test in a
rolled-back transaction. Each app has `tests/test_managers.py`, `tests/test_services.py`
and `tests/test_schema.py`, covering:
- Auth (register, login, refresh, logout, bcrypt compatibility)
- Permission boundaries on every resource — owner, member, stranger, admin
- Manager filters and visibility queries
- The GraphQL surface end to end, including error codes
- AI and email integrations, with OpenAI and Google mocked
- The audit log: what is recorded, who it is attributed to, who may read it

Frontend tests (`apps/web/src/__tests__/`) run in jsdom and cover:
- `StatusBadge`, `Modal`, `EmptyState`, `Table`, `Dropdown`, `Selector` components
- The GraphQL client: variables, auth header, error codes, session expiry

## API Overview

The API is GraphQL. One endpoint:

```
POST /graphql
```

In development GraphiQL is served at the same path — open http://localhost:3001/graphql to explore the schema.

| Area | Operations |
|---|---|
| Auth | `login`, `register`, `refreshTokens`, `logout`, `me` |
| Homes | `homes`, `home`, `homeMembers`, `createHome`, `updateHome`, `deleteHome`, `addHomeUser`, `removeHomeUser` |
| Jobs | `jobs`, `job`, `createJob`, `updateJob`, `deleteJob` |
| Contractors | `contractors`, `contractor`, `contractorJobHistory`, `createContractor`, `updateContractor`, `promoteContractor`, `deleteContractor` |
| Rolodex | `userContractors`, `createUserContractor`, `deleteUserContractor` |
| Job contractors | `jobContractors`, `assignContractor`, `updateJobContractor`, `removeJobContractor` |
| Quotes | `quotes`, `createQuote`, `updateQuote`, `deleteQuote` |
| Communications | `communications`, `communication`, `updateCommunication` |
| Images | `jobImages`, `requestUploadUrl`, `confirmUpload`, `deleteImage` |
| AI | `aiGenerations`, `createAiGeneration`, `startDiagnose`, `diagnoseJob`, `draftEmail` |
| Integrations | `integrations`, `googleAuthUrl`, `microsoftAuthUrl`, `saveAiIntegration`, `disconnectIntegration`, `sendEmail` |
| Audit | `auditLog` (admin only) |

A `job` carries its contractors, quotes, communications, images and AI generations as fields, so one query fetches the whole detail view.

Every operation requires `Authorization: Bearer <token>` except `login`, `register` and `refreshTokens`.

Errors carry a machine-readable code:

```json
{
  "data": null,
  "errors": [{ "message": "Forbidden", "extensions": { "code": "FORBIDDEN" } }]
}
```

Codes: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.

Two routes are not GraphQL: `GET /health`, and the OAuth callbacks at
`/api/v1/integrations/email/{google,microsoft}/callback`, which the providers redirect a browser to.

## Key Design Decisions

- **User controls all status** — the system never auto-transitions job or contractor statuses. Users update these manually.
- **AI images are conceptual** — clearly labeled as non-construction-accurate.
- **Quote extraction requires confirmation** — extracted quotes are always `DRAFT` until user confirms.
- **Encrypted OAuth tokens** — integration credentials stored AES-256-GCM encrypted.
- **Pre-signed uploads** — images are uploaded directly to MinIO, not through the API server.
