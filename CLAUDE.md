# THMS Platform

Turborepo monorepo. `apps/api` (Express + Prisma), `apps/web` (Next.js 14).

## Commands
```
make build-run   # build + start + open browser
make migrate     # DB migrations
make test        # run all tests (inside Docker)
make logs-api / logs-web
```

## Key rules
- API responses: `{ data: {} }` or `{ error: { code, message } }`
- Never auto-transition job/contractor status — user controls all state
- Auth: JWT Bearer token required on all routes except /auth/register + /auth/login
