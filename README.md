# THMS Platform

A full-stack home contractor management application. Homeowners can manage projects, communicate with contractors, track quotes, and generate AI-assisted concept images — all in one place.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Object Storage | MinIO (S3-compatible) |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT (access + refresh tokens) |
| AI | OpenAI (DALL-E 3 + GPT-4o-mini) |
| Email | Gmail API / Microsoft Graph API |
| Monorepo | Turborepo + npm workspaces |

## Project Structure

```
thms-platform/
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared TypeScript types
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
| `make migrate` | Run database migrations |
| `make migrate-deploy` | Deploy migrations (production) |
| `make seed` | Seed database with test data |
| `make studio` | Open Prisma Studio (DB browser) |
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

## Running Tests

```bash
make test        # all tests
make test-api    # backend only
make test-web    # frontend only
```

Backend tests (`apps/api/src/__tests__/`) hit a real DB and cover:
- Auth (register, login, refresh)
- Homes CRUD
- Jobs CRUD + filtering
- Contractors CRUD + search
- Quotes CRUD + status transitions

Frontend tests (`apps/web/src/__tests__/`) run in jsdom and cover:
- `StatusBadge`, `Modal`, `EmptyState` components
- `ApiError` class

## API Overview

Base path: `/api/v1`

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Homes | `GET/POST /homes`, `GET/PATCH/DELETE /homes/:id` |
| Jobs | `GET/POST /homes/:id/jobs`, `GET/PATCH/DELETE /jobs/:id` |
| Contractors | `GET/POST /contractors`, `GET/PATCH/DELETE /contractors/:id` |
| Job Contractors | `GET/POST /jobs/:id/contractors`, `PATCH/DELETE /jobs/:id/contractors/:jcId` |
| Images | `GET /jobs/:id/images`, `POST /jobs/:id/images/upload-url`, `POST .../confirm` |
| AI | `POST /jobs/:id/ai-generations`, `GET /jobs/:id/ai-generations` |
| Email Drafts | `POST /jobs/:id/email-drafts` |
| Send Email | `POST /jobs/:id/send-email` |
| Communications | `GET /jobs/:id/communications`, `GET/PATCH /communications/:id` |
| Quotes | `GET/POST /jobs/:id/quotes`, `PATCH/DELETE /quotes/:id` |
| Integrations | `GET /integrations`, `GET .../email/google/start`, `POST .../ai` |

All endpoints require `Authorization: Bearer <token>` header except auth endpoints.

Response format:
```json
{ "data": {} }
// or on error:
{ "error": { "code": "STRING_CODE", "message": "Human readable" } }
```

## Key Design Decisions

- **User controls all status** — the system never auto-transitions job or contractor statuses. Users update these manually.
- **AI images are conceptual** — clearly labeled as non-construction-accurate.
- **Quote extraction requires confirmation** — extracted quotes are always `DRAFT` until user confirms.
- **Encrypted OAuth tokens** — integration credentials stored AES-256-GCM encrypted.
- **Pre-signed uploads** — images are uploaded directly to MinIO, not through the API server.
